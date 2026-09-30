import { useState, useMemo } from "react";
import { useCashbookStore, useActiveCashbook } from "@/stores/cashbookStore";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useTranslation } from "@/i18n/useTranslation";
import { byLabel } from "@/utils/format";

interface FilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FilterDialog({ open, onOpenChange }: FilterDialogProps) {
  const setFilter = useCashbookStore((s) => s.setFilter);
  const activeCb = useActiveCashbook();
  const { t } = useTranslation();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [subcategory, setSubcategory] = useState("all");
  const [customFilters, setCustomFilters] = useState<Record<string, string>>({});

  // One flat list for the whole cashbook; transactions are still scanned so a
  // legacy row with an unregistered sub-category still shows up as a choice.
  const allSubcategories = useMemo(() => {
    const transactions = activeCb?.cashbook.transactions ?? [];
    const seen = new Map<string, { id: string; name: string; capitalizedName: string }>();
    for (const sub of activeCb?.cashbook.subcategories ?? []) {
      if (!seen.has(sub.name)) seen.set(sub.name, sub);
    }
    for (const tx of transactions) {
      if (tx.subcategory && !seen.has(tx.subcategory)) {
        const capitalizedName = tx.subcategory.charAt(0).toUpperCase() + tx.subcategory.slice(1);
        seen.set(tx.subcategory, { id: tx.subcategory, name: tx.subcategory, capitalizedName });
      }
    }
    return Array.from(seen.values()).sort(byLabel);
  }, [activeCb]);
  const customColumns = activeCb?.cashbook.settings.customColumns ?? [];

  const handleApply = () => {
    setFilter({
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      subcategory: subcategory === "all" ? undefined : subcategory,
      customFilters: Object.keys(customFilters).length > 0 ? customFilters : undefined,
    });
    onOpenChange(false);
  };

  const handleClear = () => {
    setFilter(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{t("filter.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("filter.fromDate")}</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("filter.toDate")}</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("filter.category")}</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
            >
              <option value="all">{t("filter.all")}</option>
              {allSubcategories.map((s) => (
                <option key={s.id} value={s.name}>{s.capitalizedName}</option>
              ))}
            </select>
          </div>
          {customColumns.map((col) => (
            <div className="space-y-2" key={col.id}>
              <Label>{col.name}</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                value={customFilters[col.id] ?? "all"}
                onChange={(e) => setCustomFilters((prev) => ({ ...prev, [col.id]: e.target.value }))}
              >
                <option value="all">{t("filter.all")}</option>
                {[...col.options].sort(byLabel).map((opt) => (
                  <option key={opt.id} value={opt.name}>{opt.capitalizedName}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClear}>{t("filter.clear")}</Button>
          <Button onClick={handleApply}>{t("dialog.apply")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
