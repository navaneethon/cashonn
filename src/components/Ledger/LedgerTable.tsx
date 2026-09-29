import { useState, useRef, useCallback, useEffect } from "react";
import { useCashbookStore, useActiveCashbook } from "@/stores/cashbookStore";
import { useUIStore } from "@/stores/uiStore";
import { useTranslation } from "@/i18n/useTranslation";
import { formatCurrency, formatDate } from "@/utils/format";
import { applyFilter } from "@/utils/filter";
import { sortLedger } from "@/utils/sort";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Receipt, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Transaction } from "@/types";

type ColKey = "date" | "category" | "subcategory" | "description" | "income" | "expense" | "amount" | (string & {});

const builtinWidths: Record<string, number> = {
  date: 110,
  category: 110,
  subcategory: 130,
  description: 220,
  income: 110,
  expense: 110,
  amount: 120,
};

function SortableHeader({
  id,
  children,
  width,
  isFixed,
}: {
  id: string;
  children: React.ReactNode;
  width: number;
  isFixed: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: isFixed,
  });

  const style: React.CSSProperties = {
    width,
    minWidth: 50,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: "sticky",
    top: 0,
    zIndex: isDragging ? 50 : 10,
    background: "var(--background)",
  };

  return (
    <TableHead
      ref={setNodeRef}
      className="select-none"
      style={style}
    >
      <div className="flex items-center gap-1.5">
        {!isFixed && (
          <button
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 -ml-1 rounded"
            style={{ touchAction: "none" }}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-3.5" />
          </button>
        )}
        {children}
      </div>
    </TableHead>
  );
}

function DragOverlayHeader({ children, width }: { children: React.ReactNode; width: number }) {
  return (
    <div
      style={{ width, minWidth: 50 }}
      className="select-none bg-background border border-border rounded-md shadow-md px-3 py-2 text-sm font-medium"
    >
      {children}
    </div>
  );
}

function SortableRow({
  tx,
  index,
  selected,
  onSelect,
  children,
}: {
  tx: Transaction;
  index: number;
  selected: boolean;
  onSelect: (id: string) => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tx.id });

  return (
    <TableRow
      ref={setNodeRef}
      data-tx-id={tx.id}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className={`cursor-pointer ${selected ? "bg-accent" : ""}`}
      onClick={() => onSelect(tx.id)}
    >
      <TableCell className="text-muted-foreground text-xs pl-1" style={{ width: 48, minWidth: 48 }}>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing hover:text-foreground p-0.5 rounded"
            style={{ touchAction: "none" }}
            aria-label="Reorder row"
            onClick={(e) => e.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-3" />
          </button>
          <span>{index}</span>
        </div>
      </TableCell>
      {children}
    </TableRow>
  );
}

export function LedgerTable() {
  const activeCb = useActiveCashbook();
  const setActiveDialog = useCashbookStore((s) => s.setActiveDialog);
const loadCashbook = useCashbookStore((s) => s.loadCashbook);
  const selectedId = useCashbookStore((s) => s.selectedTransactionId);
  const selectTransaction = useCashbookStore((s) => s.setSelectedTransaction);
  const setRightPanelOpen = useUIStore((s) => s.setRightPanelOpen);
  const filter = useCashbookStore((s) => s.filter);
  const sort = useCashbookStore((s) => s.sort);
  const updateSettings = useCashbookStore((s) => s.updateSettings);
  const reorderTransactions = useCashbookStore((s) => s.reorderTransactions);
  const scrollTargetId = useCashbookStore((s) => s.scrollTargetId);
  const setScrollTarget = useCashbookStore((s) => s.setScrollTarget);
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const cashbookId = activeCb?.cashbook.id ?? null;
  const prevCashbookIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!cashbookId || cashbookId === prevCashbookIdRef.current) return;
    prevCashbookIdRef.current = cashbookId;
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, [cashbookId]);

  useEffect(() => {
    if (!scrollTargetId) return;
    let cancelled = false;
    const tryScroll = (attempt: number) => {
      if (cancelled) return;
      const el = scrollRef.current;
      const row = el?.querySelector<HTMLElement>(`[data-tx-id="${window.CSS.escape(scrollTargetId)}"]`);
      if (row) {
        row.scrollIntoView({ block: "center", behavior: "smooth" });
        setScrollTarget(null);
        return;
      }
      if (attempt < 15) requestAnimationFrame(() => tryScroll(attempt + 1));
    };
    requestAnimationFrame(() => tryScroll(0));
    return () => {
      cancelled = true;
    };
  }, [scrollTargetId, setScrollTarget]);

  const customColumns = activeCb?.cashbook.settings.customColumns ?? [];
  const visibleColumns = activeCb?.cashbook.settings.visibleColumns ?? ["date", "category", "subcategory", "description", "income", "expense"];
  const splitAmount = activeCb?.cashbook.settings.splitIncomeExpenseColumns ?? true;

  const allColKeys: ColKey[] = visibleColumns.filter((k) => {
    if (k === "date") return true;
    if (k === "amount" && !splitAmount) return true;
    if (k === "income" && splitAmount) return true;
    if (k === "expense" && splitAmount) return true;
    if (k.startsWith("custom:")) {
      const colId = k.slice(7);
      return customColumns.some((c) => c.id === colId);
    }
    return ["category", "subcategory", "description", "income", "expense", "amount"].includes(k);
  });

  const visibleCustom = customColumns.filter((c) => visibleColumns.includes(`custom:${c.id}`));

  const headers = allColKeys.map((k) => {
    if (k === "date") return t("ledger.date");
    if (k === "category") return t("ledger.category");
    if (k === "subcategory") return t("ledger.subcategory");
    if (k === "description") return t("ledger.description");
    if (k === "income") return t("ledger.income");
    if (k === "expense") return t("ledger.expense");
    if (k === "amount") return t("ledger.amount");
    const custom = visibleCustom.find((c) => `custom:${c.id}` === k);
    return custom?.name ?? k;
  });

  const [colWidths, setColWidths] = useState<number[]>(() => {
    return [48, ...allColKeys.map((k) => builtinWidths[k] ?? 120)];
  });

  const colKeysKey = allColKeys.join(",");
  useEffect(() => {
    setColWidths((prev) => {
      const next = allColKeys.map((k, i) => {
        if (prev[i + 1] !== undefined) {
          return prev[i + 1];
        }
        return builtinWidths[k] ?? 120;
      });
      return [48, ...next];
    });
  }, [colKeysKey]);

  const resizing = useRef<{ index: number; startX: number; startWidth: number } | null>(null);
  const onResizeStart = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startWidth = colWidths[index];
    if (typeof startWidth !== "number" || !Number.isFinite(startWidth)) return;
    resizing.current = { index, startX: e.clientX, startWidth };

    const onMove = (ev: MouseEvent) => {
      const session = resizing.current;
      if (!session) return;
      const diff = ev.clientX - session.startX;
      const raw = session.startWidth + diff;
      if (!Number.isFinite(raw)) return;
      const clamped = Math.max(50, Math.min(600, raw));
      setColWidths((prev) => {
        const next = [...prev];
        next[session.index] = clamped;
        return next;
      });
    };
    const onUp = () => {
      resizing.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [colWidths]);

  useEffect(() => {
    return () => {
      resizing.current = null;
    };
  }, []);

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 3 },
    })
  );

  const onDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const onDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeStr = String(active.id);
    const overStr = String(over.id);

    const oldIndex = allColKeys.indexOf(activeStr);
    const newIndex = allColKeys.indexOf(overStr);
    if (oldIndex !== -1 && newIndex !== -1) {
      updateSettings({ visibleColumns: arrayMove(allColKeys, oldIndex, newIndex) });
      return;
    }

    reorderTransactions(activeStr, overStr);
  }, [allColKeys, updateSettings, reorderTransactions]);

  let transactions = activeCb?.cashbook.transactions ?? [];
  const currency = activeCb?.cashbook.currency ?? "₹";
  const dateFormat = activeCb?.cashbook.settings.dateFormat ?? "dd-mm-yyyy";

  transactions = applyFilter(transactions, filter);
  transactions = sortLedger(transactions, sort);

  if (!activeCb) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-muted/30 p-6 sm:p-8">
        <div className="size-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
          <Receipt className="size-8 text-muted-foreground" />
        </div>
        <p className="text-lg font-medium text-foreground mb-1">{t("ledger.noCashbook")}</p>
        <p className="text-sm text-muted-foreground mb-6 text-center max-w-xs">{t("ledger.createFirst")}</p>
        {/* Wrap on a phone so the two actions never squeeze below a usable tap size. */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Button size="lg" onClick={() => setActiveDialog("new-cashbook")}>{t("ledger.createButton")}</Button>
          <Button size="lg" variant="outline" onClick={() => void loadCashbook()}>{t("ledger.openButton")}</Button>
        </div>
      </div>
    );
  }

  const getCustomCell = (tx: typeof transactions[0], colId: string) => {
    const val = tx.customData?.[colId] ?? "";
    const col = visibleCustom.find((c) => c.id === colId);
    if (!col) return val;
    if (col.type === "amount") {
      return val ? formatCurrency(parseFloat(val) || 0, currency) : "";
    }
    if (col.type === "list") {
      const opts = col.options;
      const opt = Array.isArray(opts) ? opts.find((o) => o.name === val) : undefined;
      return opt ? opt.capitalizedName : val;
    }
    return val;
  };

  const renderCell = (tx: typeof transactions[0], key: ColKey, widthIdx: number) => {
    if (key === "date") {
      return (
        <TableCell key={key} style={{ width: colWidths[widthIdx] }}>
          {formatDate(tx.date, dateFormat)}
        </TableCell>
      );
    }
    if (key === "category") {
      return (
        <TableCell key={key} style={{ width: colWidths[widthIdx] }}>
          <Badge variant={tx.type === "income" ? "default" : "destructive"}>
            {tx.type === "income" ? t("ledger.income") : t("ledger.expense")}
          </Badge>
        </TableCell>
      );
    }
    if (key === "subcategory") {
      return (
        <TableCell key={key} style={{ width: colWidths[widthIdx] }}>
          <Badge variant="outline">{tx.subcategory || "—"}</Badge>
        </TableCell>
      );
    }
    if (key === "description") {
      return (
        <TableCell key={key} className="max-w-[200px] truncate" style={{ width: colWidths[widthIdx] }}>
          {tx.description}
        </TableCell>
      );
    }
    if (key === "income") {
      return (
        <TableCell key={key} className="text-right font-medium text-foreground" style={{ width: colWidths[widthIdx] }}>
          {tx.type === "income" ? formatCurrency(tx.amount, currency) : ""}
        </TableCell>
      );
    }
    if (key === "expense") {
      return (
        <TableCell key={key} className="text-right font-medium text-destructive" style={{ width: colWidths[widthIdx] }}>
          {tx.type === "expense" ? formatCurrency(tx.amount, currency) : ""}
        </TableCell>
      );
    }
    if (key === "amount") {
      const signed = tx.type === "income" ? tx.amount : -tx.amount;
      return (
        <TableCell key={key} className={`text-right font-medium ${signed >= 0 ? "text-foreground" : "text-destructive"}`} style={{ width: colWidths[widthIdx] }}>
          {formatCurrency(Math.abs(signed), currency)}
        </TableCell>
      );
    }
    if (key.startsWith("custom:")) {
      const colId = key.slice(7);
      const col = visibleCustom.find((c) => c.id === colId);
      return (
        <TableCell key={key} className={col?.type === "amount" ? "text-right font-medium" : ""} style={{ width: colWidths[widthIdx] }}>
          {getCustomCell(tx, colId)}
        </TableCell>
      );
    }
    return <TableCell key={key} style={{ width: colWidths[widthIdx] }} />;
  };

  const activeColKey = activeId && allColKeys.includes(String(activeId)) ? String(activeId) : null;
  const activeHeader = activeColKey ? headers[allColKeys.indexOf(activeColKey)] : null;
  const activeRow = activeId ? transactions.find((tx) => tx.id === activeId) : null;

  const handleRowSelect = (id: string) => {
    selectTransaction(id);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      setRightPanelOpen(true);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <div ref={scrollRef} className="flex-1 overflow-auto overscroll-contain">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Receipt className="size-10 mb-3 opacity-30" />
            <p className="text-sm">{t("ledger.noTransactions")}</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 z-10 bg-background select-none" style={{ width: 48, minWidth: 48 }}>
                    #
                  </TableHead>
                  <SortableContext items={allColKeys} strategy={horizontalListSortingStrategy}>
                    {allColKeys.map((key, i) => {
                      const wIdx = i + 1;
                      return (
                        <SortableHeader
                          key={key}
                          id={key}
                          width={colWidths[wIdx]}
                          isFixed={key === "date"}
                        >
                          {headers[i]}
                          {key !== "date" && (
                            <div
                              className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-border z-10"
                              onMouseDown={(e) => onResizeStart(wIdx, e)}
                            />
                          )}
                        </SortableHeader>
                      );
                    })}
                  </SortableContext>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext items={transactions.map((tx) => tx.id)} strategy={verticalListSortingStrategy}>
                  {transactions.map((tx, i) => (
                    <SortableRow
                      key={tx.id}
                      tx={tx}
                      index={i + 1}
                      selected={tx.id === selectedId}
                      onSelect={handleRowSelect}
                    >
                      {allColKeys.map((key, ci) => renderCell(tx, key, ci + 1))}
                    </SortableRow>
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
            <DragOverlay>
              {activeHeader ? (
                <DragOverlayHeader width={120}>
                  {activeHeader}
                </DragOverlayHeader>
              ) : activeRow ? (
                <div className="select-none bg-background border border-border rounded-md shadow-md px-3 py-2 text-sm font-medium max-w-[320px] truncate">
                  {formatDate(activeRow.date, dateFormat)} · {activeRow.description || activeRow.subcategory || activeRow.category}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}
