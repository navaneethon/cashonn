import type { Category } from "@/types";

/** Default category names by position: index 0 is income, index 1 is expense. */
export const CATEGORY_LEGACY = ["incomes", "expenses"] as const;

/**
 * Resolve an entry's `type` to the cashbook's real category name.
 *
 * Categories can be renamed (Advanced -> Names of Categories), so entries must
 * always be written with the cashbook's current name rather than the legacy
 * default; otherwise those entries detach from the category on load.
 */
export function categoryNameFor(categories: Category[], type: "income" | "expense"): string {
  const idx = type === "income" ? 0 : 1;
  return categories[idx]?.name || CATEGORY_LEGACY[idx];
}
