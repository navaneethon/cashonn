import type { Transaction } from "@/types";

export interface LedgerFilter {
  fromDate?: string;
  toDate?: string;
  category?: string;
  subcategory?: string;
  customFilters?: Record<string, string>;
}

export function applyFilter(transactions: Transaction[], filter: LedgerFilter | null | undefined): Transaction[] {
  if (!filter) return transactions;
  return transactions.filter((tx) => {
    if (filter.fromDate && tx.date < filter.fromDate) return false;
    if (filter.toDate && tx.date > filter.toDate) return false;
    if (filter.category && filter.category !== "all" && tx.category !== filter.category) return false;
    if (filter.subcategory && filter.subcategory !== "all" && tx.subcategory !== filter.subcategory) return false;
    if (filter.customFilters) {
      for (const [colId, val] of Object.entries(filter.customFilters)) {
        if (val && val !== "all" && tx.customData?.[colId] !== val) return false;
      }
    }
    return true;
  });
}