import type { CashBook, Transaction } from "@/types";
import { formatCurrency, formatDate } from "@/utils/format";

type PrintColKey = "date" | "category" | "subcategory" | "description" | "income" | "expense" | "amount" | (string & {});

function isAndroidRuntime(): boolean {
  return (
    typeof navigator !== "undefined" &&
    /Android/i.test(navigator.userAgent) &&
    typeof window !== "undefined" &&
    "__TAURI_INTERNALS__" in window
  );
}

/** Hands the markup to the native PrintManager job. Kept in one place so the desktop path stays clean. */
async function printCashbookNative(html: string, jobName: string): Promise<boolean> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("print_cashbook", { html, jobName: jobName || "Cashonn" });
    return true;
  } catch (err) {
    console.error("Native print failed:", err);
    return false;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function resolvePrintColumns(cashbook: CashBook): PrintColKey[] {
  const splitAmount = cashbook.settings.splitIncomeExpenseColumns ?? true;
  const customColumns = cashbook.settings.customColumns ?? [];
  const visible = cashbook.settings.visibleColumns ?? [
    "date",
    "category",
    "subcategory",
    "description",
    "income",
    "expense",
  ];

  return visible.filter((k) => {
    if (k === "date") return true;
    if (k === "amount") return !splitAmount;
    if (k === "income") return splitAmount;
    if (k === "expense") return splitAmount;
    if (k.startsWith("custom:")) {
      const colId = k.slice(7);
      return customColumns.some((c) => c.id === colId);
    }
    return ["category", "subcategory", "description", "income", "expense", "amount"].includes(k);
  });
}

function headerLabel(key: PrintColKey, cashbook: CashBook): { label: string; right?: boolean } {
  switch (key) {
    case "date":
      return { label: "Date" };
    case "category":
      return { label: "Category" };
    case "subcategory":
      return { label: "Sub-Category" };
    case "description":
      return { label: "Description" };
    case "income":
      return { label: "Income", right: true };
    case "expense":
      return { label: "Expense", right: true };
    case "amount":
      return { label: "Amount", right: true };
    default: {
      if (key.startsWith("custom:")) {
        const colId = key.slice(7);
        const col = cashbook.settings.customColumns.find((c) => c.id === colId);
        return { label: col?.name ?? "Column" };
      }
      return { label: key };
    }
  }
}

function cellHtml(key: PrintColKey, tx: Transaction, cashbook: CashBook, dateFormat: string): string {
  const currency = cashbook.currency;
  if (key === "date") {
    return `<td class="date">${formatDate(tx.date, dateFormat)}</td>`;
  }
  if (key === "category") {
    return `<td><span class="badge ${tx.type === "income" ? "badge-green" : "badge-red"}">${tx.type === "income" ? "Income" : "Expense"}</span></td>`;
  }
  if (key === "subcategory") {
    return `<td>${escapeHtml(tx.subcategory || "—")}</td>`;
  }
  if (key === "description") {
    return `<td>${escapeHtml(tx.description)}</td>`;
  }
  if (key === "income") {
    return `<td class="amt ${tx.type === "income" ? "text-green" : ""}">${tx.type === "income" ? formatCurrency(tx.amount, currency) : ""}</td>`;
  }
  if (key === "expense") {
    return `<td class="amt ${tx.type === "expense" ? "text-red" : ""}">${tx.type === "expense" ? formatCurrency(tx.amount, currency) : ""}</td>`;
  }
  if (key === "amount") {
    const signed = tx.type === "income" ? tx.amount : -tx.amount;
    return `<td class="amt ${signed >= 0 ? "text-green" : "text-red"}">${formatCurrency(tx.amount, currency)}</td>`;
  }
  if (key.startsWith("custom:")) {
    const colId = key.slice(7);
    const val = tx.customData?.[colId] ?? "";
    const col = cashbook.settings.customColumns.find((c) => c.id === colId);
    if (col?.type === "amount") {
      return `<td class="amt">${val ? formatCurrency(parseFloat(val) || 0, currency) : ""}</td>`;
    }
    if (col?.type === "list") {
      const opt = Array.isArray(col.options) ? col.options.find((o) => o.name === val) : undefined;
      return `<td>${escapeHtml(opt ? opt.capitalizedName : val)}</td>`;
    }
    return `<td>${escapeHtml(val)}</td>`;
  }
  return `<td></td>`;
}

/**
 * Renders the printable document. Exported so the Android path can hand the same markup to the
 * native print adapter instead of relying on `window.print()`.
 */
export function buildPrintHtml(cashbook: CashBook, filteredTransactions: Transaction[]): string {
  const { name, beginningBalance } = cashbook;
  const dateFormat = cashbook.settings.dateFormat ?? "dd-mm-yyyy";
  const currency = cashbook.currency;
  const records = filteredTransactions.length;
  const incomes = filteredTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const expenses = filteredTransactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const balance = beginningBalance + incomes - expenses;

  const colKeys = resolvePrintColumns(cashbook);
  const headersHtml = colKeys
    .map((key) => {
      const { label, right } = headerLabel(key, cashbook);
      return `<th${right ? ' style="text-align:right"' : ""}${key === "date" ? ' class="date"' : ""}>${escapeHtml(label)}</th>`;
    })
    .join("");

  const rows = filteredTransactions
    .map(
      (tx, i) => `
    <tr>
      <td class="num">${i + 1}</td>
      ${colKeys.map((key) => cellHtml(key, tx, cashbook, dateFormat)).join("")}
    </tr>
  `
    )
    .join("\n");

  const subtitle = `${filteredTransactions.length} of ${cashbook.transactions.length} transactions${
    cashbook.transactions.length !== filteredTransactions.length ? " (filtered)" : ""
  }`;

  return `<!DOCTYPE html>
<html>
<head>
  <title>${escapeHtml(name)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #1a1a1a; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .subtitle { font-size: 12px; color: #666; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 24px; table-layout: auto; }
    th { text-align: left; padding: 6px 8px; border-bottom: 2px solid #333; font-weight: 600; font-size: 11px; text-transform: uppercase; color: #555; white-space: nowrap; }
    th.date, td.date { white-space: nowrap; width: 1%; }
    td { padding: 5px 8px; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
    td.num { width: 30px; color: #888; white-space: nowrap; }
    td.amt { text-align: right; font-weight: 500; white-space: nowrap; }
    .badge { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 500; white-space: nowrap; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .text-green { color: #166534; }
    .text-red { color: #991b1b; }
    .summary { border-top: 2px solid #333; padding-top: 12px; max-width: 300px; margin-left: auto; }
    .summary-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 13px; }
    .summary-row.total { font-weight: 700; border-top: 1px solid #ccc; padding-top: 6px; margin-top: 4px; }
    .summary-label { color: #555; }
    @media print {
      body { padding: 0; }
      @page { margin: 12mm; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(name)}</h1>
  <div class="subtitle">${subtitle}</div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        ${headersHtml}
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <div class="summary">
    <div class="summary-row"><span class="summary-label">Records</span><span>${records}</span></div>
    <div class="summary-row"><span class="summary-label">Income</span><span class="text-green">${formatCurrency(incomes, currency)}</span></div>
    <div class="summary-row"><span class="summary-label">Expense</span><span class="text-red">${formatCurrency(expenses, currency)}</span></div>
    <div class="summary-row total"><span>Balance</span><span class="${balance >= 0 ? "text-green" : "text-red"}">${formatCurrency(balance, currency)}</span></div>
  </div>
</body>
</html>`;
}

/**
 * Prints a cashbook.
 *
 * Android WebView does not implement `window.print()` at all, so the hidden-iframe path can
 * never work there. On Android the markup goes to a native `PrintManager` job instead, which
 * opens the system print dialog (and therefore "Save as PDF" and any installed printer).
 * Everywhere else the iframe path is used, hardened to wait for the real `load` event.
 *
 * Resolves false when printing could not be started, so the caller can tell the user.
 */
export async function printCashbook(cashbook: CashBook, filteredTransactions: Transaction[]): Promise<boolean> {
  const html = buildPrintHtml(cashbook, filteredTransactions);

  if (isAndroidRuntime()) {
    return printCashbookNative(html, cashbook.name);
  }

  const iframe = document.createElement("iframe");
  // Off-screen rather than zero-sized: a 0x0 iframe can fail to lay out in some webviews, and
  // the print adapter needs a real viewport to paginate against.
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.border = "none";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  const cleanup = () => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  };

  const doc = iframe.contentDocument;
  if (!doc) {
    cleanup();
    return false;
  }

  return new Promise<boolean>((resolve) => {
    // Wait for the document to actually finish loading. The previous fixed 300ms delay was a
    // guess: on a slow webview the print dialog could open before the table had laid out, and
    // on a fast one it just wasted time. `load` is the real signal, with a ceiling so a document
    // that never fires it still prints something rather than hanging forever.
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(ceiling);
      try {
        if (ok) iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error("Print failed:", err);
      }
      // Give the dialog a moment to open before tearing the frame down.
      setTimeout(cleanup, 1000);
      resolve(true);
    };

    const ceiling = setTimeout(() => finish(true), 2000);
    iframe.addEventListener(
      "load",
      () => finish(true),
      { once: true }
    );

    doc.open();
    doc.write(html);
    doc.close();
  });
}
