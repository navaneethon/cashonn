import { useState } from "react";
import { useCashbookStore } from "@/stores/cashbookStore";
import { useTranslation } from "@/i18n/useTranslation";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface SortDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SORT_FIELDS = [
  { value: "date", label: "Date" },
  { value: "subcategory", label: "Sub-Category" },
  { value: "description", label: "Description" },
  { value: "amount", label: "Amount" },
  { value: "orderOfEntry", label: "Order of Entry" },
  { value: "manual", label: "Manual (drag order)" },
].sort((a, b) => a.label.localeCompare(b.label));

export function SortDialog({ open, onOpenChange }: SortDialogProps) {
  const sort = useCashbookStore((s) => s.sort);
  const setSort = useCashbookStore((s) => s.setSort);
  const { t } = useTranslation();

  const [sortBy, setSortBy] = useState(sort?.sortBy ?? "date");
  const [direction, setDirection] = useState<"asc" | "desc">(sort?.direction ?? "asc");

  const handleApply = () => {
    if (sortBy === "manual") {
      setSort({ sortBy: "manual", direction: "asc" });
    } else {
      setSort({ sortBy, direction });
    }
    onOpenChange(false);
  };

  const handleClear = () => {
    setSort({ sortBy: "date", direction: "asc" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{t("sort.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t("sort.sortBy")}</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {SORT_FIELDS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          {sortBy !== "manual" && (
            <div className="space-y-2">
              <Label>{t("sort.direction")}</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                value={direction}
                onChange={(e) => setDirection(e.target.value as "asc" | "desc")}
              >
                <option value="asc">{t("sort.ascending")}</option>
                <option value="desc">{t("sort.descending")}</option>
              </select>
            </div>
          )}
          {sortBy === "manual" && (
            <p className="text-xs text-muted-foreground">
              Rows keep the order you set by dragging them in the ledger. Clear Sort returns to date order.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClear}>{t("sort.clear")}</Button>
          <Button onClick={handleApply}>{t("dialog.apply")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
