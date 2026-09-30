import type { Category } from "@/types";

/** Default category names by position: index 0 is income, index 1 is expense. */
export const CATEGORY_LEGACY = ["incomes", "expenses"] as const;

/**
 * Every name that can identify the category at `idx`.
 *
 * Categories can be renamed (Advanced -> Names of Categories), but books saved
 * before a rename still carry the legacy name on their transactions and
 * regular payments. Both spellings must match when reading or writing entries,
 * or those entries detach from their category's subcategory list.
 */
export function categoryAliases(categories: Category[], idx: number): string[] {
  const current = categories[idx]?.name;
  const legacy = CATEGORY_LEGACY[idx];
  if (current && legacy && current !== legacy) return [current, legacy];
  return [current || legacy].filter(Boolean);
}

/** Index of the category `name` refers to, falling back to its legacy position. */
export function categoryIndexFor(categories: Category[], name: string): number {
  const direct = categories.findIndex((c) => c.name === name);
  if (direct !== -1) return direct;
  const legacyIdx = (CATEGORY_LEGACY as readonly string[]).indexOf(name);
  return legacyIdx !== -1 && categories[legacyIdx] ? legacyIdx : -1;
}

/** Resolve an entry's `type` to the cashbook's real category name. */
export function categoryNameFor(categories: Category[], type: "income" | "expense"): string {
  const idx = type === "income" ? 0 : 1;
  return categories[idx]?.name || CATEGORY_LEGACY[idx];
}