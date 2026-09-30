import { create } from "zustand";
import { csvToTransactions, transactionsToCSV, type CsvColumnMapping } from "@/utils/csv";
import { applyFilter } from "@/utils/filter";
import { insertByDate, mergeByDate } from "@/utils/sort";
import { categoryNameFor } from "@/utils/categories";
import type { CashBook, OpenCashbook, Transaction, CashBookSettings, RegularPayment, CustomColumn, CustomColumnOption, Subcategory } from "@/types";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function invokeSafe<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) throw new Error("Tauri API not available — run 'cargo tauri dev' instead of 'npm run dev'");
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}

async function openDialogSafe(opts: Record<string, unknown>): Promise<string | string[] | null> {
  if (!isTauri()) throw new Error("Tauri API not available — run 'cargo tauri dev' instead of 'npm run dev'");
  const { open } = await import("@tauri-apps/plugin-dialog");
  return open(opts as Parameters<typeof open>[0]);
}

async function saveDialogSafe(opts: Record<string, unknown>): Promise<string | null> {
  if (!isTauri()) throw new Error("Tauri API not available — run 'cargo tauri dev' instead of 'npm run dev'");
  const { save } = await import("@tauri-apps/plugin-dialog");
  // The Android create-document dialog reads its suggested name from the `fileName`
  // key (desktop maps `defaultPath` instead), so derive a name for the Android field
  // while keeping `defaultPath` for desktop.
  const merged: Record<string, unknown> = { ...opts };
  if (!merged.fileName && typeof opts.defaultPath === "string" && opts.defaultPath) {
    merged.fileName = opts.defaultPath.split(/[/\\]/).pop() || opts.defaultPath;
  }
  if (isAndroidRuntime()) {
    // The dialog plugin resolves filter extensions through MimeTypeMap; unknown extensions
    // (cshon) leave */* PLUS an empty EXTRA_MIME_TYPES, which hides providers (e.g.
    // Google Drive) in the ACTION_CREATE_DOCUMENT picker. A wildcard that resolves to a
    // single "*/*" type avoids the MIME whitelist entirely. Desktop keeps the real filters.
    merged.filters = [{ name: "All files", extensions: ["*/*"] }];
  }
  return save(merged as Parameters<typeof save>[0]);
}

function isAndroidRuntime(): boolean {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
}

/**
 * Android-only: opens a file with the same fast ACTION_GET_CONTENT picker the dialog plugin
 * uses, but asks the provider for a write grant too. That grant is what lets Save overwrite
 * a cloud file in place. Returns null when the user cancels.
 *
 * The picked uri does not come back from `open_document` itself. On tauri 2.11.6 an Android
 * activity-callback response is dropped before it reaches the webview, so resolving that
 * invoke leaves the frontend waiting forever. `open_document` therefore answers as soon as
 * the picker is up and the result is collected by polling `get_pick_result`, which is an
 * ordinary command and does deliver.
 */
const DOC_PICK_POLL_MS = 400;
const DOC_PICK_TIMEOUT_MS = 5 * 60 * 1000;

type DocPickState = "idle" | "picking" | "ok" | "canceled" | "failed";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function openDocumentSafe(): Promise<string | null> {
  const started = await invokeSafe<{ state?: DocPickState }>("plugin:doc|open_document");
  if (started?.state !== "picking") {
    throw new Error("The file picker could not be opened");
  }

  const deadline = Date.now() + DOC_PICK_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(DOC_PICK_POLL_MS);
    const res = await invokeSafe<{ state?: DocPickState; uri?: string; error?: string }>(
      "plugin:doc|get_pick_result",
    );
    const state = res?.state;
    if (state === undefined || state === "idle" || state === "picking") continue;
    if (state === "ok") return res?.uri ?? null;
    if (state === "canceled") return null;
    throw new Error(res?.error || "The file picker did not return a file");
  }

  throw new Error("Timed out waiting for the file picker");
}

/**
 * Android-only: writes a cashbook to a content:// URI through the doc plugin. Deliberately
   * avoids `write_cashbook`, which reaches the content resolver via tauri-plugin-fs: that
   * plugin never settles its invoke when the resolver throws, so a refused write left the
   * frontend awaiting forever — Save showed no message and changed nothing.
   */
  async function writeCashbookToPath(filePath: string, cashbook: CashBook): Promise<void> {
    if (isAndroidRuntime() && filePath.startsWith("content://")) {
      await invokeSafe("plugin:doc|write_cashbook_document", { path: filePath, cashbook });
      return;
    }
  await invokeSafe("write_cashbook", { path: filePath, cashbook });
}

function generateId(): string {
  return crypto.randomUUID();
}

function displayNameFromPath(filePath: string, fallback: string): string {
  const seg = filePath.split(/[/\\]/).pop() || "";
  const cleaned = seg.replace(/\.cshon$/, "");
  return cleaned !== seg && cleaned ? cleaned : fallback;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function seedListColumnOptions(
  prevCols: CustomColumn[],
  nextCols: CustomColumn[],
  transactions: Transaction[],
): CustomColumn[] {
  return nextCols.map((col) => {
    if (col.type !== "list") return col;
    const options = Array.isArray(col.options) ? col.options : [];
    const prev = prevCols.find((c) => c.id === col.id);
    const deletedNames = new Set(
      (prev?.options ?? [])
        .filter((o) => !options.some((n) => n.id === o.id))
        .map((o) => o.name)
    );
    const existing = new Set(options.map((o) => o.name));
    const toAdd: CustomColumnOption[] = [];
    for (const tx of transactions) {
      const v = tx.customData[col.id]?.trim();
      if (!v || existing.has(v) || deletedNames.has(v) || toAdd.some((o) => o.name === v)) continue;
      existing.add(v);
      toAdd.push({ id: generateId(), name: v, capitalizedName: v });
    }
    if (options === col.options && !toAdd.length) return col;
    return { ...col, options: [...options, ...toAdd] };
  });
}

/**
 * Sub-categories used to be nested under income/expense. They are now one flat
 * list on the cashbook, because one name can legitimately apply to both (an
 * insurance premium can be an outgoing payment and a reimbursement).
 *
 * Older files are flattened on load: names merge case-insensitively, keeping the
 * first spelling seen, and the nested copies are dropped so they cannot diverge
 * from the flat list again.
 */
function migrateSubcategories(cashbook: CashBook): { cashbook: CashBook; migrated: boolean } {
  const flat: Subcategory[] = [...(cashbook.subcategories ?? [])];
  const seen = new Set(flat.map((s) => s.name.toLowerCase()));
  const nested = cashbook.categories.flatMap((c) => c.subcategories ?? []);

  for (const sub of nested) {
    const key = sub.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    flat.push(sub);
  }
  // Entries can reference a sub-category that was never registered.
  for (const entry of [...cashbook.transactions, ...cashbook.regularPayments]) {
    if (!entry.subcategory || seen.has(entry.subcategory.toLowerCase())) continue;
    seen.add(entry.subcategory.toLowerCase());
    flat.push({ id: generateId(), name: entry.subcategory, capitalizedName: entry.subcategory });
  }

  const hadNested = nested.length > 0 || cashbook.categories.some((c) => c.subcategories !== undefined);
  const changed = hadNested || !cashbook.subcategories;
  if (!changed) return { cashbook, migrated: false };
  return {
    cashbook: {
      ...cashbook,
      subcategories: flat,
      categories: cashbook.categories.map(({ subcategories: _dropped, ...rest }) => rest),
    },
    migrated: true,
  };
}

function seedCashbookListOptions(cashbook: CashBook): { cashbook: CashBook; seeded: boolean } {
  const prev = cashbook.settings.customColumns ?? [];
  const next = seedListColumnOptions(prev, prev, cashbook.transactions);
  const changed = next.some((c, i) => c !== prev[i]);
  if (!changed) return { cashbook, seeded: false };
  return {
    cashbook: { ...cashbook, settings: { ...cashbook.settings, customColumns: next } },
    seeded: true,
  };
}

function advanceDate(dateStr: string, value: number, unit: "days" | "weeks" | "months" | "years"): string {
  const step = Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1;
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return dateStr;
  if (unit === "days") d.setDate(d.getDate() + step);
  else if (unit === "weeks") d.setDate(d.getDate() + step * 7);
  else if (unit === "months") d.setMonth(d.getMonth() + step);
  else d.setFullYear(d.getFullYear() + step);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function closeWindow(): Promise<void> {
  try {
    if (isTauri()) {
      // getCurrentWindow().destroy() is a no-op on Android — route Exit
      // through the exit_app command (std::process::exit) on that platform.
      if (typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent)) {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("exit_app");
        return;
      }
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().destroy();
    } else {
      window.close();
    }
  } catch (err) {
    console.error("Close failed:", err);
  }
}

function createDefaultCashBook(name: string, currency = "â‚¹", beginningBalance = 0, bookType: "standard" | "business" = "standard", description = ""): CashBook {
  return {
    id: generateId(),
    name,
    description: description || name,
    currency,
    beginningBalance,
    createdAt: new Date().toISOString(),
    type: bookType,
    transactions: [],
    categories: [
      {
        id: generateId(),
        name: "incomes",
        capitalizedName: "Incomes",
      },
      {
        id: generateId(),
        name: "expenses",
        capitalizedName: "Expenses",
      },
    ],
    subcategories: [],
    regularPayments: [],
    settings: {
      colorScheme: "system",
      dateFormat: "dd-mm-yyyy",
      amountFormat: "standard",
      recordNumbering: "sequential",
      visibleColumns: ["date", "category", "subcategory", "description", "income", "expense"],
      splitIncomeExpenseColumns: true,
      sortBy: "date",
      sortDirection: "asc",
      customColumns: [],
    },
  };
}

interface CashbookStore {
  openCashbooks: OpenCashbook[];
  activeCashbookId: string | null;
  activeDialog: string | null;
  selectedTransactionId: string | null;
  editingTransactionId: string | null;
  pendingCashbook: OpenCashbook | null;
  pendingCsvImport: string | null;
  filter: { fromDate?: string; toDate?: string; category?: string; subcategory?: string; customFilters?: Record<string, string> } | null;
  sort: { sortBy: string; direction: "asc" | "desc" } | null;
  scrollTargetId: string | null;
  statusMessage: string;

  getActiveCashbook: () => OpenCashbook | undefined;
  openNewCashbook: (name: string, currency?: string, beginningBalance?: number, bookType?: "standard" | "business", description?: string) => void;
  openCashbookFromData: (cashbook: CashBook, filePath: string) => void;
  openCashbookFromPath: (filePath: string) => Promise<void>;
  closeCashbook: (id: string) => void;
  setActiveCashbook: (id: string) => void;
setActiveDialog: (dialog: string | null) => void;
  setSelectedTransaction: (txId: string | null) => void;
  setEditingTransaction: (txId: string | null) => void;
  setStatusMessage: (msg: string) => void;
  setFilter: (filter: { fromDate?: string; toDate?: string; category?: string; subcategory?: string; customFilters?: Record<string, string> } | null) => void;
  setSort: (sort: { sortBy: string; direction: "asc" | "desc" } | null) => void;
  setScrollTarget: (id: string | null) => void;
  reorderTransactions: (activeId: string, overId: string) => void;
  setPendingCashbook: (cashbook: OpenCashbook | null) => void;
  resolvePendingCashbook: (cashbook: OpenCashbook) => void;
  setPendingCsvImport: (csv: string | null) => void;

  addTransaction: (tx: Omit<Transaction, "id" | "orderOfEntry">) => void;
  updateTransaction: (txId: string, updates: Partial<Omit<Transaction, "id" | "orderOfEntry">>) => void;
  removeTransaction: (txId: string) => void;
  deleteSelectedTransaction: () => void;

addSubcategory: (subcategoryName: string) => void;
  ensureSubcategory: (subcategoryName: string) => void;
  subcategoryUsage: (subcategoryName: string) => number;
  removeSubcategory: (subcategoryName: string) => boolean;
  renameSubcategory: (oldName: string, newName: string) => boolean;
  addCustomColumnOption: (columnId: string, optionName: string) => void;
  addRegularPayment: (payment: Omit<RegularPayment, "id">) => void;
  removeRegularPayment: (paymentId: string) => void;
  importTransactions: (csvData: string, mappings?: CsvColumnMapping[]) => void;
  exportCSV: () => Promise<void>;
  updateCashbook: (updates: Partial<Pick<CashBook, "name" | "description" | "currency" | "beginningBalance" | "passwordHash" | "passwordSalt" | "settings">>) => void;
  updateSettings: (settings: Partial<CashBookSettings>) => void;
  updateCategoryNames: (categoryNames: Record<string, string>) => void;
markDirty: (id: string) => void;
  saveCashbook: () => Promise<void>;
  saveCashbookById: (id: string) => Promise<boolean>;
  saveCashbookAs: () => Promise<boolean>;
  saveCashbookAsById: (id: string) => Promise<boolean>;
  saveAllDirty: () => Promise<boolean>;
  loadCashbook: () => Promise<void>;
  refreshActiveCashbook: () => Promise<void>;
  processDuePayments: (cashbookId: string) => void;

  unsavedChangesOpen: boolean;
  /** Cashbook id the prompt is about, or null when the whole window is closing. */
  pendingCloseCashbookId: string | null;
  requestClose: () => Promise<void>;
  requestCloseCashbook: (id: string) => void;
  confirmSaveAndClose: () => Promise<void>;
  discardAndClose: () => Promise<void>;
  cancelClose: () => void;
}

export const useCashbookStore = create<CashbookStore>((set, get) => ({
openCashbooks: [],
  activeCashbookId: null,
  activeDialog: null,
  selectedTransactionId: null,
  editingTransactionId: null,
  pendingCashbook: null,
  pendingCsvImport: null,
  filter: null,
  sort: { sortBy: "date", direction: "asc" },
  scrollTargetId: null,
  statusMessage: "Ready",
  unsavedChangesOpen: false,
  pendingCloseCashbookId: null,

  getActiveCashbook: () => {
    const { openCashbooks, activeCashbookId } = get();
    return openCashbooks.find((cb) => cb.cashbook.id === activeCashbookId);
  },

  setStatusMessage: (msg) => set({ statusMessage: msg }),

setFilter: (filter) => set({ filter }),
  setSort: (sort) => set({ sort }),
  setScrollTarget: (id) => set({ scrollTargetId: id }),
  reorderTransactions: (activeId, overId) => {
    let didMove = false;
    set((state) => {
      const activeCb = state.openCashbooks.find((cb) => cb.cashbook.id === state.activeCashbookId);
      if (!activeCb) return state;
      const txs = activeCb.cashbook.transactions;
      const oldIndex = txs.findIndex((t) => t.id === activeId);
      const newIndex = txs.findIndex((t) => t.id === overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return state;
      const next = [...txs];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      didMove = true;
      return {
        openCashbooks: state.openCashbooks.map((cb) =>
          cb.cashbook.id === state.activeCashbookId
            ? { ...cb, isDirty: true, cashbook: { ...cb.cashbook, transactions: next } }
            : cb
        ),
      };
    });
    if (didMove) set({ sort: { sortBy: "manual", direction: "asc" } });
  },
  setPendingCashbook: (cashbook) => set({ pendingCashbook: cashbook }),
  setPendingCsvImport: (csv) => set({ pendingCsvImport: csv }),
  resolvePendingCashbook: (cashbook) => {
    const { openCashbooks } = get();
    const exists = openCashbooks.find((cb) => cb.filePath === cashbook.filePath);
    if (exists) {
      set({ activeCashbookId: exists.cashbook.id, pendingCashbook: null });
      return;
    }
    const seeded = seedCashbookListOptions(cashbook.cashbook);
    const toOpen: OpenCashbook = seeded.seeded
      ? { ...cashbook, cashbook: seeded.cashbook, isDirty: true }
      : cashbook;
    set((state) => ({
      openCashbooks: [...state.openCashbooks, toOpen],
      activeCashbookId: toOpen.cashbook.id,
      pendingCashbook: null,
    }));
    get().processDuePayments(cashbook.cashbook.id);
  },

  openNewCashbook: (name, currency = "â‚¹", beginningBalance = 0, bookType = "standard", description = "") => {
    const cashbook = createDefaultCashBook(name, currency, beginningBalance, bookType, description);
    const openCb: OpenCashbook = { cashbook, filePath: "", isDirty: true };
    set((state) => ({
      openCashbooks: [...state.openCashbooks, openCb],
      activeCashbookId: cashbook.id,
    }));
  },

openCashbookFromData: (cashbook, filePath) => {
    const exists = get().openCashbooks.find((cb) => cb.filePath === filePath);
    if (exists) {
      set({ activeCashbookId: exists.cashbook.id });
      return;
    }
    const migrated = migrateSubcategories(cashbook);
    const seeded = seedCashbookListOptions(migrated.cashbook);
    const openCb: OpenCashbook = {
      cashbook: seeded.cashbook,
      filePath,
      isDirty: seeded.seeded || migrated.migrated,
    };
    set((state) => ({
      openCashbooks: [...state.openCashbooks, openCb],
      activeCashbookId: openCb.cashbook.id,
    }));
    get().processDuePayments(cashbook.id);
  },

  openCashbookFromPath: async (filePath) => {
    try {
      const cashbook = await invokeSafe<CashBook>("read_cashbook", { path: filePath });

      if (cashbook.passwordHash && cashbook.passwordSalt) {
        set({ pendingCashbook: { cashbook, filePath, isDirty: false } });
        get().setStatusMessage("Password required");
        return;
      }

      get().openCashbookFromData(cashbook, filePath);
      get().setStatusMessage("Opened " + filePath);
    } catch (err) {
      console.error("Open failed:", err);
      get().setStatusMessage("Open failed: " + String(err));
    }
  },

  closeCashbook: (id) => {
    set((state) => {
      const remaining = state.openCashbooks.filter((cb) => cb.cashbook.id !== id);
      const newActiveId =
        state.activeCashbookId === id
          ? remaining.length > 0
            ? remaining[remaining.length - 1].cashbook.id
            : null
          : state.activeCashbookId;
      return { openCashbooks: remaining, activeCashbookId: newActiveId, selectedTransactionId: null, editingTransactionId: null };
    });
  },

  setActiveCashbook: (id) => set({ activeCashbookId: id, selectedTransactionId: null, editingTransactionId: null }),
  setActiveDialog: (dialog) => set({ activeDialog: dialog }),
  setSelectedTransaction: (txId) => set({ selectedTransactionId: txId, editingTransactionId: txId }),
  setEditingTransaction: (txId) => set({ editingTransactionId: txId }),

  addTransaction: (tx) => {
    const { activeCashbookId, ensureSubcategory } = get();
    if (!activeCashbookId) return;

    ensureSubcategory(tx.subcategory);

    set((state) => {
      const activeCb = state.openCashbooks.find((cb) => cb.cashbook.id === state.activeCashbookId);
      if (!activeCb) return state;

      const maxOrder = activeCb.cashbook.transactions.reduce((m, t) => Math.max(m, t.orderOfEntry), 0);
      const newTx: Transaction = {
        ...tx,
        id: generateId(),
        orderOfEntry: maxOrder + 1,
      };

      return {
        openCashbooks: state.openCashbooks.map((cb) =>
          cb.cashbook.id === state.activeCashbookId
            ? {
                ...cb,
                isDirty: true,
                cashbook: {
                  ...cb.cashbook,
                  transactions: insertByDate(cb.cashbook.transactions, newTx),
                },
              }
            : cb
        ),
        scrollTargetId: newTx.id,
      };
    });
  },

updateTransaction: (txId, updates) => {
    set((state) => ({
      openCashbooks: state.openCashbooks.map((cb) =>
        cb.cashbook.id === state.activeCashbookId
          ? {
              ...cb,
              isDirty: true,
              cashbook: {
                ...cb.cashbook,
                transactions: cb.cashbook.transactions.map((t) => t.id === txId ? { ...t, ...updates } : t),
              },
            }
          : cb
      ),
      editingTransactionId: null,
      selectedTransactionId: null,
      scrollTargetId: txId,
    }));

    const { openCashbooks, activeCashbookId, filter } = get();
    const activeCb = openCashbooks.find((cb) => cb.cashbook.id === activeCashbookId);
    const updatedTx = activeCb?.cashbook.transactions.find((t) => t.id === txId);
    if (filter && updatedTx && applyFilter([updatedTx], filter).length === 0) {
      get().setStatusMessage("Entry updated, but it no longer matches the active filter and is hidden");
    }
  },

  removeTransaction: (txId) => {
    set((state) => ({
      openCashbooks: state.openCashbooks.map((cb) =>
        cb.cashbook.id === state.activeCashbookId
          ? {
              ...cb,
              isDirty: true,
              cashbook: {
                ...cb.cashbook,
                transactions: cb.cashbook.transactions.filter((t) => t.id !== txId),
              },
            }
          : cb
      ),
      selectedTransactionId: state.selectedTransactionId === txId ? null : state.selectedTransactionId,
      editingTransactionId: state.editingTransactionId === txId ? null : state.editingTransactionId,
    }));
  },

  deleteSelectedTransaction: () => {
    const { selectedTransactionId } = get();
    if (selectedTransactionId) set({ activeDialog: "confirm-delete" });
  },

addSubcategory: (subcategoryName) => {
    const name = subcategoryName.trim();
    if (!name) return;
    const activeCb = get().getActiveCashbook();
    if (!activeCb) return;
    if ((activeCb.cashbook.subcategories ?? []).some((s) => s.name.toLowerCase() === name.toLowerCase())) return;
    set((state) => ({
      openCashbooks: state.openCashbooks.map((cb) =>
        cb.cashbook.id === state.activeCashbookId
          ? {
              ...cb,
              isDirty: true,
              cashbook: {
                ...cb.cashbook,
                subcategories: [
                  ...(cb.cashbook.subcategories ?? []),
                  { id: generateId(), name, capitalizedName: name },
                ],
              },
            }
          : cb
      ),
    }));
  },

  ensureSubcategory: (subcategoryName) => {
    if (!subcategoryName) return;
    const activeCb = get().getActiveCashbook();
    if (!activeCb) return;
    if (!(activeCb.cashbook.subcategories ?? []).some((s) => s.name === subcategoryName)) {
      get().addSubcategory(subcategoryName);
    }
  },

  /**
   * How many entries (transactions + regular payments) depend on a subcategory.
   * Drives the delete affordance: a subcategory in use must be renamed instead
   * of deleted, otherwise those entries would keep a name that no longer exists
   * in the cashbook.
   *
   * Counts across income and expense together, because the list is flat — the
   * same subcategory is legitimately used on both sides.
   */
  subcategoryUsage: (subcategoryName) => {
    const activeCb = get().getActiveCashbook();
    if (!activeCb) return 0;
    const { transactions, regularPayments } = activeCb.cashbook;
    return (
      transactions.filter((tx) => tx.subcategory === subcategoryName).length +
      regularPayments.filter((rp) => rp.subcategory === subcategoryName).length
    );
  },

  /** Removes a subcategory. Refused while any entry still uses it. */
  removeSubcategory: (subcategoryName) => {
    if (get().subcategoryUsage(subcategoryName) > 0) return false;
    const activeCb = get().getActiveCashbook();
    if (!activeCb) return false;
    const subs = activeCb.cashbook.subcategories ?? [];
    if (!subs.some((s) => s.name === subcategoryName)) return false;
    set((state) => ({
      openCashbooks: state.openCashbooks.map((cb) =>
        cb.cashbook.id === state.activeCashbookId
          ? {
              ...cb,
              isDirty: true,
              cashbook: {
                ...cb.cashbook,
                subcategories: subs.filter((s) => s.name !== subcategoryName),
              },
            }
          : cb
      ),
    }));
    return true;
  },

  /** Renames a subcategory and cascades the new name to every entry using it. */
  renameSubcategory: (oldName, newName) => {
    const name = newName.trim();
    if (!name || name === oldName) return false;
    const activeCb = get().getActiveCashbook();
    if (!activeCb) return false;
    const subs = activeCb.cashbook.subcategories ?? [];
    const target = subs.find((s) => s.name === oldName);
    if (!target) return false;
    if (subs.some((s) => s.id !== target.id && s.name.toLowerCase() === name.toLowerCase())) return false;
    set((state) => ({
      openCashbooks: state.openCashbooks.map((cb) =>
        cb.cashbook.id === state.activeCashbookId
          ? {
              ...cb,
              isDirty: true,
              cashbook: {
                ...cb.cashbook,
                subcategories: subs.map((s) =>
                  s.id === target.id ? { ...s, name, capitalizedName: name } : s
                ),
                transactions: cb.cashbook.transactions.map((tx) =>
                  tx.subcategory === oldName ? { ...tx, subcategory: name } : tx
                ),
                regularPayments: cb.cashbook.regularPayments.map((rp) =>
                  rp.subcategory === oldName ? { ...rp, subcategory: name } : rp
                ),
              },
            }
          : cb
      ),
      filter: state.filter?.subcategory === oldName ? { ...state.filter, subcategory: name } : state.filter,
    }));
    return true;
  },

  addCustomColumnOption: (columnId, optionName) => {
    if (!optionName.trim()) return;
    const activeCb = get().getActiveCashbook();
    if (!activeCb) return;
    const col = activeCb.cashbook.settings.customColumns.find((c) => c.id === columnId);
    if (!col) return;
    const normalizedName = optionName.trim();
    if (col.options.some((o) => o.name === normalizedName)) return;
    set((state) => ({
      openCashbooks: state.openCashbooks.map((cb) =>
        cb.cashbook.id === state.activeCashbookId
          ? {
              ...cb,
              isDirty: true,
              cashbook: {
                ...cb.cashbook,
                settings: {
                  ...cb.cashbook.settings,
                  customColumns: cb.cashbook.settings.customColumns.map((c) =>
                    c.id === columnId
                      ? {
                          ...c,
                          options: [...c.options, { id: generateId(), name: normalizedName, capitalizedName: normalizedName }],
                        }
                      : c
                  ),
                },
              },
            }
          : cb
      ),
    }));
  },

  addRegularPayment: (payment) => {
    set((state) => ({
      openCashbooks: state.openCashbooks.map((cb) =>
        cb.cashbook.id === state.activeCashbookId
          ? {
              ...cb,
              isDirty: true,
              cashbook: { ...cb.cashbook, regularPayments: [...cb.cashbook.regularPayments, { ...payment, id: generateId() }] },
            }
          : cb
      ),
    }));
  },

removeRegularPayment: (paymentId) => {
    set((state) => ({
      openCashbooks: state.openCashbooks.map((cb) =>
        cb.cashbook.id === state.activeCashbookId
          ? {
              ...cb,
              isDirty: true,
              cashbook: { ...cb.cashbook, regularPayments: cb.cashbook.regularPayments.filter((p) => p.id !== paymentId) },
            }
          : cb
      ),
    }));
  },
importTransactions: async (csvData, mappings) => {
    const { activeCashbookId, openCashbooks } = get();
    const activeCb = openCashbooks.find((cb) => cb.cashbook.id === activeCashbookId);
    const existingCustom = activeCb?.cashbook.settings.customColumns ?? [];
    const { transactions: newTxs, newCustomColumns } = csvToTransactions(csvData, existingCustom, mappings);
    const newColumnKeys = newCustomColumns.map((c) => `custom:${c.id}`);
    let addedSubs = 0;
    const baseTxCount = activeCb?.cashbook.transactions.length ?? 0;
    const newTxList = newTxs.map((tx, i) => ({
      ...tx,
      id: crypto.randomUUID(),
      orderOfEntry: baseTxCount + i + 1,
      // A CSV carries no category names, so rows arrive on the legacy defaults.
      // Map them onto this book's categories, which may have been renamed.
      category: categoryNameFor(activeCb?.cashbook.categories ?? [], tx.type),
    }));
    const combinedCols = [...existingCustom, ...newCustomColumns];
    const seededCols = seedListColumnOptions(combinedCols, combinedCols, [
      ...(activeCb?.cashbook.transactions ?? []),
      ...newTxList,
    ]);

    set((state) => ({
      openCashbooks: state.openCashbooks.map((cb) =>
        cb.cashbook.id === state.activeCashbookId
          ? {
              ...cb,
              isDirty: true,
              cashbook: {
                ...cb.cashbook,
                settings: {
                  ...cb.cashbook.settings,
                  customColumns: seededCols,
                  visibleColumns: [...cb.cashbook.settings.visibleColumns, ...newColumnKeys],
                },
                // One flat list, so a sub-category seen on either an income or an expense row
                // is registered once for the whole cashbook.
                subcategories: (() => {
                  const existingNames = new Set((cb.cashbook.subcategories ?? []).map((s) => s.name));
                  const toAdd: Subcategory[] = [];
                  for (const tx of newTxs) {
                    if (!tx.subcategory) continue;
                    if (existingNames.has(tx.subcategory)) continue;
                    existingNames.add(tx.subcategory);
                    toAdd.push({ id: generateId(), name: tx.subcategory, capitalizedName: tx.subcategory });
                  }
                  addedSubs = toAdd.length;
                  return [...(cb.cashbook.subcategories ?? []), ...toAdd];
                })(),
                transactions: mergeByDate(cb.cashbook.transactions, newTxList),
              },
            }
          : cb
      ),
    }));
    get().setPendingCsvImport(null);
    get().setStatusMessage(
      `Imported ${newTxs.length} transactions${addedSubs ? ` (added ${addedSubs} subcategor${addedSubs > 1 ? "ies" : "y"})` : ""}${newCustomColumns.length ? ` (added custom column${newCustomColumns.length > 1 ? "s" : ""}: ${newCustomColumns.map((c) => c.name).join(", ")})` : ""}`
    );
  },

  exportCSV: async () => {
    const { activeCashbookId, openCashbooks, setStatusMessage } = get();
    const activeCb = openCashbooks.find((cb) => cb.cashbook.id === activeCashbookId);
    if (!activeCb) return;

    try {
      const csv = transactionsToCSV(activeCb.cashbook.transactions, activeCb.cashbook.settings.customColumns);

      const filePath = await saveDialogSafe({
        filters: [{ name: "CSV", extensions: ["csv"] }],
        defaultPath: activeCb.cashbook.name + ".csv",
      });
      if (!filePath) {
        setStatusMessage("Export cancelled");
        return;
      }

      await invokeSafe("write_file", { path: filePath, content: csv });
      setStatusMessage("Exported to " + filePath);
    } catch (err) {
      console.error("Export failed:", err);
      setStatusMessage("Export failed: " + String(err));
    }
  },

  updateCashbook: (updates) => {
    set((state) => ({
      openCashbooks: state.openCashbooks.map((cb) =>
        cb.cashbook.id === state.activeCashbookId
          ? { ...cb, isDirty: true, cashbook: { ...cb.cashbook, ...updates } }
          : cb
      ),
    }));
  },

  updateSettings: (settings) => {
    set((state) => ({
      openCashbooks: state.openCashbooks.map((cb) => {
        if (cb.cashbook.id !== state.activeCashbookId) return cb;
        const prevCols = cb.cashbook.settings.customColumns ?? [];
        const merged = { ...cb.cashbook.settings, ...settings };
        const nextCols = seedListColumnOptions(prevCols, merged.customColumns ?? [], cb.cashbook.transactions);
        return {
          ...cb,
          isDirty: true,
          cashbook: { ...cb.cashbook, settings: { ...merged, customColumns: nextCols } },
        };
      }),
    }));
  },

updateCategoryNames: (categoryNames) => {
    const activeCb = get().getActiveCashbook();
    const renameMap = new Map<string, string>();
    activeCb?.cashbook.categories.forEach((cat, idx) => {
      let next = cat.name;
      if (cat.name === "incomes" || idx === 0) next = categoryNames.incomesLower || cat.name;
      else if (cat.name === "expenses" || idx === 1) next = categoryNames.expensesLower || cat.name;
      if (next !== cat.name) renameMap.set(cat.name, next);
    });
    const remap = (value: string) => renameMap.get(value) ?? value;
    set((state) => ({
      openCashbooks: state.openCashbooks.map((cb) =>
        cb.cashbook.id !== state.activeCashbookId
          ? cb
          : {
              ...cb,
              isDirty: true,
              cashbook: {
                ...cb.cashbook,
                categories: cb.cashbook.categories.map((cat, idx) => {
                  if (cat.name === "incomes" || idx === 0) {
                    return { ...cat, name: categoryNames.incomesLower || cat.name, capitalizedName: categoryNames.incomesUpper || cat.capitalizedName };
                  }
                  if (cat.name === "expenses" || idx === 1) {
                    return { ...cat, name: categoryNames.expensesLower || cat.name, capitalizedName: categoryNames.expensesUpper || cat.capitalizedName };
                  }
                  return cat;
                }),
                // Entries store the category name denormalized, so they must
                // follow the rename or they stop resolving to this category
                // after a second rename.
                transactions: renameMap.size
                  ? cb.cashbook.transactions.map((tx) => ({ ...tx, category: remap(tx.category) }))
                  : cb.cashbook.transactions,
                regularPayments: renameMap.size
                  ? cb.cashbook.regularPayments.map((rp) => ({ ...rp, category: remap(rp.category) }))
                  : cb.cashbook.regularPayments,
              },
            }
      ),
      filter: renameMap.size && state.filter?.category
        ? { ...state.filter, category: remap(state.filter.category) }
        : state.filter,
    }));
  },

  markDirty: (id) => {
    set((state) => ({
      openCashbooks: state.openCashbooks.map((cb) => cb.cashbook.id === id ? { ...cb, isDirty: true } : cb),
    }));
  },

saveCashbook: async () => {
    const { activeCashbookId } = get();
    if (activeCashbookId) await get().saveCashbookById(activeCashbookId);
  },

  saveCashbookById: async (id) => {
    const { openCashbooks, setStatusMessage } = get();
    const target = openCashbooks.find((cb) => cb.cashbook.id === id);
    if (!target) return false;

    setStatusMessage("Saving...");

    try {
      let filePath = target.filePath;

      if (!filePath) {
        const selected = await saveDialogSafe({
          filters: [{ name: "Cashonn", extensions: ["cshon"] }],
          defaultPath: target.cashbook.name + ".cshon",
        });
        if (!selected) {
          setStatusMessage("Save cancelled");
          return false;
        }
        filePath = selected;
      }

      await writeCashbookToPath(filePath, target.cashbook);
      set((state) => ({
        openCashbooks: state.openCashbooks.map((cb) =>
          cb.cashbook.id === id ? { ...cb, filePath, isDirty: false, cashbook: { ...cb.cashbook, name: displayNameFromPath(filePath, cb.cashbook.name) } } : cb
        ),
      }));
      setStatusMessage("Saved to " + filePath);
      return true;
    } catch (err) {
      console.error("Save failed:", err);
      // A cloud provider can still refuse a write grant on a picked document. Fall back to
      // the create-document picker, which grants write access to the chosen location.
      if (
        isAndroidRuntime() &&
        typeof target.filePath === "string" &&
        target.filePath.startsWith("content://")
      ) {
        setStatusMessage("Could not overwrite the opened file — choose a name/location to save a writable copy");
        return get().saveCashbookAsById(id);
      }
      setStatusMessage("Save failed: " + String(err));
      return false;
    }
  },

  saveCashbookAsById: async (id) => {
    const { openCashbooks, setStatusMessage } = get();
    const target = openCashbooks.find((cb) => cb.cashbook.id === id);
    if (!target) return false;

    setStatusMessage("Saving As...");

    try {
      const selected = await saveDialogSafe({
        filters: [{ name: "Cashonn", extensions: ["cshon"] }],
        defaultPath: target.cashbook.name + ".cshon",
      });
      if (!selected) {
        setStatusMessage("Save cancelled");
        return false;
      }

      await writeCashbookToPath(selected, target.cashbook);
      set((state) => ({
        openCashbooks: state.openCashbooks.map((cb) =>
          cb.cashbook.id === id ? { ...cb, filePath: selected, isDirty: false, cashbook: { ...cb.cashbook, name: displayNameFromPath(selected, cb.cashbook.name) } } : cb
        ),
      }));
      setStatusMessage("Saved to " + selected);
      return true;
    } catch (err) {
      console.error("Save As failed:", err);
      setStatusMessage("Save failed: " + String(err));
      return false;
    }
  },

  saveCashbookAs: async () => {
    const { activeCashbookId } = get();
    if (!activeCashbookId) return false;
    return get().saveCashbookAsById(activeCashbookId);
  },

  saveAllDirty: async () => {
    const { openCashbooks } = get();
    const dirty = openCashbooks.filter((cb) => cb.isDirty);
    for (const cb of dirty) {
      const ok = await get().saveCashbookById(cb.cashbook.id);
      if (!ok) return false;
    }
    return true;
  },

  requestClose: async () => {
    const { openCashbooks } = get();
    const hasDirty = openCashbooks.some((cb) => cb.isDirty);

    if (!hasDirty) {
      await closeWindow();
      return;
    }
    set({ unsavedChangesOpen: true, pendingCloseCashbookId: null });
  },

  // Closing a single tab has to go through the same prompt as closing the window. The tab X used
  // to call closeCashbook directly, so unsaved changes were thrown away with no warning at all.
  requestCloseCashbook: (id) => {
    const target = get().openCashbooks.find((cb) => cb.cashbook.id === id);
    if (!target) return;

    if (!target.isDirty) {
      get().closeCashbook(id);
      return;
    }
    set({ unsavedChangesOpen: true, pendingCloseCashbookId: id });
  },

  confirmSaveAndClose: async () => {
    const { pendingCloseCashbookId } = get();

    if (pendingCloseCashbookId) {
      // Save writes straight back to the path/uri the cashbook was opened from, so no location
      // dialog appears here. A cashbook that has never been saved has no path yet and will ask
      // for one, which is the only case where closing needs input.
      const saved = await get().saveCashbookById(pendingCloseCashbookId);
      if (!saved) return; // user cancelled the save dialog, or it failed; keep the tab open
      set({ unsavedChangesOpen: false, pendingCloseCashbookId: null });
      get().closeCashbook(pendingCloseCashbookId);
      return;
    }

    const saved = await get().saveAllDirty();
    if (!saved) return; // user cancelled or save failed; stay open
    set({ unsavedChangesOpen: false });
    await closeWindow();
  },

  discardAndClose: async () => {
    const { pendingCloseCashbookId } = get();

    if (pendingCloseCashbookId) {
      set({ unsavedChangesOpen: false, pendingCloseCashbookId: null });
      get().closeCashbook(pendingCloseCashbookId);
      return;
    }

    set({ unsavedChangesOpen: false });
    await closeWindow();
  },

  cancelClose: () => {
    set({ unsavedChangesOpen: false, pendingCloseCashbookId: null });
  },

refreshActiveCashbook: async () => {
    const { activeCashbookId, openCashbooks, setStatusMessage } = get();
    if (!activeCashbookId) {
      setStatusMessage("No active cashbook");
      return;
    }
    const activeCb = openCashbooks.find((cb) => cb.cashbook.id === activeCashbookId);
    if (!activeCb) {
      setStatusMessage("No active cashbook");
      return;
    }
    if (!activeCb.filePath) {
      setStatusMessage("This cashbook is not saved on disk yet — save it first");
      return;
    }
    try {
      const cashbook = await invokeSafe<CashBook>("read_cashbook", { path: activeCb.filePath });
      const seeded = seedCashbookListOptions(cashbook);
      set((state) => ({
        openCashbooks: state.openCashbooks.map((cb) =>
          cb.cashbook.id === activeCashbookId
            ? { ...cb, cashbook: seeded.cashbook, isDirty: seeded.seeded }
            : cb
        ),
      }));
      setStatusMessage("Refreshed from " + activeCb.filePath);
      get().processDuePayments(activeCashbookId);
    } catch (err) {
      console.error("Refresh failed:", err);
      setStatusMessage("Refresh failed: " + String(err));
    }
  },

  processDuePayments: (cashbookId) => {
    const today = todayStr();
    let posted = 0;

    set((state) => ({
      openCashbooks: state.openCashbooks.map((cb) => {
        if (cb.cashbook.id !== cashbookId) return cb;
        const payments = cb.cashbook.regularPayments;
        if (payments.length === 0) return cb;

        const newTxs: Transaction[] = [];
        const updatedPayments = payments.map((p) => {
          if (p.nextPayment > today) return p;

          let next = p.nextPayment;
          let guard = 0;
          while (next <= today && guard < 100) {
            newTxs.push({
              id: generateId(),
              date: next,
              type: p.type,
              category: p.category,
              subcategory: p.subcategory,
              description: p.description || p.name,
              amount: p.amount,
              orderOfEntry: cb.cashbook.transactions.length + newTxs.length + 1,
              customData: {},
            });
            next = advanceDate(next, p.interval.value, p.interval.unit);
            guard++;
          }
          return { ...p, nextPayment: next };
        });

        posted += newTxs.length;
        if (newTxs.length === 0) return cb;

        return {
          ...cb,
          isDirty: true,
          cashbook: {
            ...cb.cashbook,
            transactions: mergeByDate(cb.cashbook.transactions, newTxs),
            regularPayments: updatedPayments,
          },
        };
      }),
    }));

    if (posted > 0) {
      get().setStatusMessage(`Posted ${posted} due regular payment${posted > 1 ? "s" : ""}`);
    }
  },

  loadCashbook: async () => {
    try {
      get().setStatusMessage("Opening...");
      // Android uses the doc plugin, which runs the same fast ACTION_GET_CONTENT picker as the
      // dialog plugin but additionally requests a write grant — that is what makes Save a
      // silent in-place overwrite. ACTION_OPEN_DOCUMENT would also grant write, but it makes
      // DocumentsUI enumerate every storage and cloud provider first, which cost tens of
      // seconds on the M14. Other platforms keep the dialog plugin.
      const filePath = isAndroidRuntime()
        ? await openDocumentSafe()
        : await openDialogSafe({
            multiple: false,
            filters: [{ name: "Cashonn", extensions: ["cshon"] }],
          }).then((picked) => (Array.isArray(picked) ? picked[0] : picked)) ?? null;
      if (!filePath) {
        get().setStatusMessage("Ready");
        return;
      }

      const cashbook = await invokeSafe<CashBook>("read_cashbook", { path: filePath });

      if (cashbook.passwordHash && cashbook.passwordSalt) {
        set({ pendingCashbook: { cashbook, filePath, isDirty: false } });
        get().setStatusMessage("Password required");
        return;
      }

      get().openCashbookFromData(cashbook, filePath);
      get().setStatusMessage("Opened " + filePath);
    } catch (err) {
      console.error("Open failed:", err);
      get().setStatusMessage("Open failed: " + String(err));
    }
  },
}));

export function useActiveCashbook() {
  const openCashbooks = useCashbookStore((s) => s.openCashbooks);
  const activeCashbookId = useCashbookStore((s) => s.activeCashbookId);
  return openCashbooks.find((cb) => cb.cashbook.id === activeCashbookId);
}
