import type { Transaction } from "@/types";

export type LedgerSort = { sortBy: string; direction: "asc" | "desc" } | null;

export function byDateThenOrder(a: Transaction, b: Transaction): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  return a.orderOfEntry - b.orderOfEntry;
}

export function insertByDate(list: Transaction[], tx: Transaction): Transaction[] {
  const idx = list.findIndex((t) => t.date > tx.date);
  if (idx === -1) return [...list, tx];
  let insertAt = idx;
  while (
    insertAt < list.length &&
    list[insertAt].date === tx.date &&
    list[insertAt].orderOfEntry <= tx.orderOfEntry
  ) {
    insertAt++;
  }
  return [...list.slice(0, insertAt), tx, ...list.slice(insertAt)];
}

export function mergeByDate(existing: Transaction[], incoming: Transaction[]): Transaction[] {
  if (incoming.length === 0) return existing;
  return [...existing, ...incoming].sort(byDateThenOrder);
}

export function sortLedger(transactions: Transaction[], sort: LedgerSort): Transaction[] {
  if (sort?.sortBy === "manual") return transactions;
  if (!sort) return [...transactions].sort(byDateThenOrder);

  const dir = sort.direction === "asc" ? 1 : -1;
  if (sort.sortBy === "date") {
    return [...transactions].sort((a, b) => {
      if (a.date !== b.date) return (a.date < b.date ? -1 : 1) * dir;
      return a.orderOfEntry - b.orderOfEntry;
    });
  }

  return [...transactions].sort((a, b) => {
    const field = sort.sortBy as keyof Transaction;
    const va = a[field] ?? "";
    const vb = b[field] ?? "";
    if (va < vb) return -dir;
    if (va > vb) return dir;
    return a.orderOfEntry - b.orderOfEntry;
  });
}
