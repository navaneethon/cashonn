import type { CustomColumn, Transaction } from "@/types";

interface CustomColumnRef {
  id: string;
  name: string;
}

export interface CsvImportResult {
  transactions: Omit<Transaction, "id" | "orderOfEntry">[];
  newCustomColumns: CustomColumn[];
}

export type CsvColumnRole = "date" | "type" | "subcategory" | "description" | "amount" | "skip" | "custom";

export interface CsvColumnMapping {
  role: CsvColumnRole;
  /** Display/target name when role === "custom" */
  customName?: string;
}

export interface CsvStructure {
  headers: string[];
  dataRows: string[][];
  hasHeader: boolean;
  delimiter: string;
}

const STANDARD_ROLES = new Set<CsvColumnRole>(["date", "type", "subcategory", "description", "amount", "skip"]);

function normalizeHeaderToken(token: string): string {
  return token
    .replace(/^﻿/, "")
    .trim()
    .replace(/^"(.*)"$/, "$1")
    .toLowerCase()
    .replace("sub-category", "subcategory")
    .replace("sub category", "subcategory")
    .trim();
}

function isDateLike(v: string | undefined): boolean {
  if (!v) return false;
  const s = v.trim();
  return /^\d{4}-\d{1,2}-\d{1,2}$/.test(s) || /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(s);
}

function detectDelimiter(sampleLine: string): string {
  let inQuotes = false;
  let commas = 0;
  let semis = 0;
  let tabs = 0;
  for (const ch of sampleLine) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch === ",") commas++;
    else if (!inQuotes && ch === ";") semis++;
    else if (!inQuotes && ch === "\t") tabs++;
  }
  if (semis > commas && semis >= tabs) return ";";
  if (tabs > commas && tabs > semis) return "\t";
  return ",";
}

export function parseCsvStructure(csv: string): CsvStructure {
  const clean = csv.replace(/^﻿/, "");
  const lines = clean.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) {
    return { headers: [], dataRows: [], hasHeader: false, delimiter: "," };
  }
  const delimiter = detectDelimiter(lines[0]);
  const firstRow = parseCSVLine(lines[0], delimiter);
  // Header if first cell is not date-like (covers "Date", "Txn Date", quoted headers, etc.)
  const hasHeader = !isDateLike(firstRow[0]);
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const dataRows = dataLines.map((l) => parseCSVLine(l, delimiter));
  let headers = hasHeader ? firstRow.map((h) => h.replace(/^"(.*)"$/, "$1")) : firstRow.map((_, i) => `Column ${i + 1}`);
  // Align header count to widest data row so mappings cover every column
  const width = dataRows.reduce((w, r) => Math.max(w, r.length), headers.length);
  while (headers.length < width) headers.push(`Column ${headers.length + 1}`);
  return { headers, dataRows, hasHeader, delimiter };
}

export function guessCsvMappings(headers: string[]): CsvColumnMapping[] {
  const used = new Set<CsvColumnRole>();
  return headers.map((h) => {
    const n = normalizeHeaderToken(h);
    if (!h.trim()) return { role: "skip" as const };
    if ((n === "date" || n === "txn date" || n === "transaction date" || n.endsWith(" date") || n.startsWith("date ")) && !used.has("date")) {
      used.add("date");
      return { role: "date" as const };
    }
    if (n.includes("subcateg") && !used.has("subcategory")) {
      used.add("subcategory");
      return { role: "subcategory" as const };
    }
    if (n.includes("descript") && !used.has("description")) {
      used.add("description");
      return { role: "description" as const };
    }
    if ((n === "type" || n === "category" || n === "cr/dr" || n === "dr/cr" || n === "income/expense" || n === "nature") && !used.has("type")) {
      used.add("type");
      return { role: "type" as const };
    }
    if (
      (n === "amount" || n === "value" || n === "total" || n === "sum" || n === "amt" || n.includes("amount")) &&
      !used.has("amount")
    ) {
      used.add("amount");
      return { role: "amount" as const };
    }
    return { role: "custom" as const, customName: h.trim() };
  });
}

export function transactionsToCSV(transactions: Transaction[], customColumns: CustomColumnRef[] = []): string {
  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const customHeader = customColumns.map((c) => escape(c.name));
  const header = ["Date", "Category", "Subcategory", "Description", "Amount", ...customHeader].join(",");

  const rows = transactions.map((tx) => {
    const customValues = customColumns.map((c) => escape(tx.customData?.[c.id] ?? ""));
    return [
      tx.date,
      tx.type === "income" ? "Income" : "Expense",
      escape(tx.subcategory),
      escape(tx.description),
      tx.amount.toFixed(2),
      ...customValues,
    ].join(",");
  });
  return [header, ...rows].join("\n");
}

export function csvToTransactions(
  csv: string,
  existingCustomColumns: CustomColumnRef[] = [],
  mappings?: CsvColumnMapping[],
): CsvImportResult {
  const structure = parseCsvStructure(csv);
  if (structure.headers.length === 0 || structure.dataRows.length === 0) {
    return { transactions: [], newCustomColumns: [] };
  }

  const { headers, dataRows } = structure;
  const guess = guessCsvMappings(headers);
  const map: CsvColumnMapping[] = headers.map((_, i) => mappings?.[i] ?? guess[i] ?? { role: "custom", customName: headers[i] });

  const existingByName = new Map(existingCustomColumns.map((cc) => [normalizeHeaderToken(cc.name), cc.id]));
  const newCustomColumns: CustomColumn[] = [];
  const customColIndex = new Map<number, string>();

  map.forEach((m, idx) => {
    if (m.role !== "custom") return;
    const name = (m.customName || headers[idx] || "").trim();
    if (!name) return;
    const key = normalizeHeaderToken(name);
    const existing = existingByName.get(key);
    if (existing) {
      customColIndex.set(idx, existing);
      return;
    }
    const col: CustomColumn = { id: crypto.randomUUID(), name, type: "text", options: [] };
    newCustomColumns.push(col);
    existingByName.set(key, col.id);
    customColIndex.set(idx, col.id);
  });

  const findIdx = (role: CsvColumnRole) => map.findIndex((m) => m.role === role);
  const dateIdx = findIdx("date");
  const typeIdx = findIdx("type");
  const subIdx = findIdx("subcategory");
  const descIdx = findIdx("description");
  const amtIdx = findIdx("amount");
  const at = (idx: number, cols: string[]) => (idx >= 0 && idx < cols.length ? cols[idx] : "");

  const transactions = dataRows.map((cols) => {
    const amountRaw = at(amtIdx, cols).replace(/[^0-9.,-]/g, "").replace(/,(?=\d{3}\b)/g, "");
    const amount = parseFloat(amountRaw.replace(/,(?=\d{2}$)/, ".")) || 0;

    let type: "income" | "expense" = "expense";
    const typeRaw = at(typeIdx, cols).toLowerCase();
    if (typeRaw.includes("income") || typeRaw === "cr" || typeRaw === "credit") type = "income";
    else if (typeRaw.includes("expense") || typeRaw === "dr" || typeRaw === "debit") type = "expense";

    let customData: Record<string, string> = {};
    customColIndex.forEach((colId, idx) => {
      const v = at(idx, cols);
      if (v) customData = { ...customData, [colId]: v };
    });

    return {
      date: at(dateIdx, cols) || new Date().toISOString().split("T")[0],
      type,
      category: type === "income" ? "incomes" : "expenses",
      subcategory: at(subIdx, cols) || "Other",
      description: at(descIdx, cols) || "",
      amount: Math.abs(amount),
      customData,
    };
  });

  return { transactions, newCustomColumns };
}

function parseCSVLine(line: string, delimiter = ","): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());
  return result;
}

export { STANDARD_ROLES };
