import { useState, useEffect, useRef, useMemo } from "react";
import { useCashbookStore, useActiveCashbook } from "@/stores/cashbookStore";
import { useTranslation } from "@/i18n/useTranslation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, TrendingDown, CalendarDays } from "lucide-react";
import { formatDate, parseDate, getTodayString, byLabel } from "@/utils/format";
import { categoryNameFor } from "@/utils/categories";
import type { CustomColumn } from "@/types";

export function EntryPanel() {
  const activeCb = useActiveCashbook();
  const addTransaction = useCashbookStore((s) => s.addTransaction);
  const updateTransaction = useCashbookStore((s) => s.updateTransaction);
  const addSubcategory = useCashbookStore((s) => s.addSubcategory);
  const selectedId = useCashbookStore((s) => s.selectedTransactionId);
  const setSelectedTransaction = useCashbookStore((s) => s.setSelectedTransaction);
  const setStatusMessage = useCashbookStore((s) => s.setStatusMessage);
  const { t } = useTranslation();

  const dateFormat = activeCb?.cashbook.settings.dateFormat ?? "dd-mm-yyyy";
  const [type, setType] = useState<"income" | "expense">("expense");
  const [date, setDate] = useState(getTodayString());
  const [dateText, setDateText] = useState(() => formatDate(getTodayString(), dateFormat));
  const [amount, setAmount] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [description, setDescription] = useState("");
  const [catSearch, setCatSearch] = useState("");
  const [catOpen, setCatOpen] = useState(false);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const catRef = useRef<HTMLDivElement>(null);
  const nativeDateRef = useRef<HTMLInputElement>(null);

  const categories = activeCb?.cashbook.categories ?? [];
  const allSubcategories = useMemo(() => {
    const seen = new Map<string, typeof categories[0]["subcategories"][0]>();
    for (const cat of categories) {
      for (const sub of cat.subcategories) {
        if (!seen.has(sub.name)) seen.set(sub.name, sub);
      }
    }
    return Array.from(seen.values()).sort(byLabel);
  }, [categories]);

  const customColumns = activeCb?.cashbook.settings.customColumns ?? [];

  const filteredSubs = useMemo(() => {
    if (!catSearch) return allSubcategories;
    const q = catSearch.toLowerCase();
    return allSubcategories.filter((s) => s.name.toLowerCase().includes(q) || s.capitalizedName.toLowerCase().includes(q));
  }, [allSubcategories, catSearch]);

  const selectedTx = activeCb && selectedId
    ? activeCb.cashbook.transactions.find((tx) => tx.id === selectedId)
    : null;

  useEffect(() => {
    if (selectedTx) {
      setType(selectedTx.type);
      setDate(selectedTx.date);
      setDateText(formatDate(selectedTx.date, dateFormat));
      setAmount(String(selectedTx.amount));
      setSubcategory(selectedTx.subcategory);
      setDescription(selectedTx.description);
      setCustomValues(selectedTx.customData ?? {});
    }
  }, [selectedId]);

  // Re-format the visible date text when the display format changes
  useEffect(() => {
    setDateText(formatDate(date, dateFormat));
  }, [dateFormat]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) {
        setCatOpen(false);
        setCatSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const resetForm = () => {
    setAmount("");
    setSubcategory("");
    setDescription("");
    setType("expense");
    const today = getTodayString();
    setDate(today);
    setDateText(formatDate(today, dateFormat));
    setCatSearch("");
    setCatOpen(false);
    setCustomValues({});
  };

  const handleDateInput = (value: string) => {
    setDateText(value);
    const parsed = parseDate(value, dateFormat);
    if (parsed) setDate(parsed);
  };

  const openNativeDatePicker = () => {
    const el = nativeDateRef.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
      el.click();
    }
  };

  const handleNativeDateChange = (value: string) => {
    if (!value) return;
    setDate(value);
    setDateText(formatDate(value, dateFormat));
  };

  const setCustomValue = (colId: string, val: string) => {
    setCustomValues((prev) => ({ ...prev, [colId]: val }));
  };

  const handleAdd = () => {
    const iso = parseDate(dateText, dateFormat);
    if (!amount || !iso) {
      if (dateText.trim() && !iso) setStatusMessage(`Invalid date — expected format like ${formatDate("2026-01-31", dateFormat)}`);
      return;
    }
    const category = categoryNameFor(categories, type);
    addTransaction({ type, date: iso, amount: parseFloat(amount) || 0, category, subcategory, description, customData: customValues });
    resetForm();
  };

  const handleUpdate = () => {
    if (!selectedId || !amount) return;
    const iso = parseDate(dateText, dateFormat);
    if (!iso) {
      setStatusMessage(`Invalid date — expected format like ${formatDate("2026-01-31", dateFormat)}`);
      return;
    }
    const category = categoryNameFor(categories, type);
    updateTransaction(selectedId, { type, date: iso, amount: parseFloat(amount) || 0, category, subcategory, description, customData: customValues });
    setSelectedTransaction(null);
    resetForm();
  };

  const handleCancel = () => {
    setSelectedTransaction(null);
    resetForm();
  };

  if (!activeCb) return null;

  const selectedSubObj = allSubcategories.find((s) => s.name === subcategory);

  return (
    <div className="bg-card px-4 pt-2 pb-4 space-y-3">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {selectedId ? t("entry.editEntry") : t("entry.newEntry")}
      </span>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">{t("entry.date")}</Label>
          <div className="relative">
            <Input
              value={dateText}
              placeholder={formatDate("2026-01-31", dateFormat)}
              className="pr-9"
              onChange={(e) => handleDateInput(e.target.value)}
              onBlur={() => setDateText(formatDate(parseDate(dateText, dateFormat) ?? date, dateFormat))}
            />
            <button
              type="button"
              aria-label={t("entry.date")}
              className="absolute right-1 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
              onClick={openNativeDatePicker}
            >
              <CalendarDays className="size-4" />
            </button>
            <input
              ref={nativeDateRef}
              type="date"
              value={date}
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => handleNativeDateChange(e.target.value)}
              className="pointer-events-none absolute right-1 top-1/2 h-px w-px -translate-y-1/2 opacity-0"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">{t("entry.category")}</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={type === "income" ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => { setType("income"); setSubcategory(""); setCatSearch(""); }}
            >
              <TrendingUp className="size-3.5" />
              {t("entry.income")}
            </Button>
            <Button
              variant={type === "expense" ? "destructive" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => { setType("expense"); setSubcategory(""); setCatSearch(""); }}
            >
              <TrendingDown className="size-3.5" />
              {t("entry.expense")}
            </Button>
          </div>
        </div>

        <div className="space-y-1.5" ref={catRef}>
          <Label className="text-xs">{t("entry.subcategory")}</Label>
          <div className="relative">
            <input
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground"
              placeholder={selectedSubObj ? selectedSubObj.capitalizedName : "Type to search..."}
              value={catSearch || (selectedSubObj ? selectedSubObj.capitalizedName : "")}
              onFocus={() => setCatOpen(true)}
              onChange={(e) => { setCatSearch(e.target.value); setCatOpen(true); }}
            />
            {catOpen && (
              <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-40 overflow-auto">
                {filteredSubs.map((s) => (
                  <div
                    key={s.id}
                    className={`px-3 py-1.5 text-sm cursor-pointer hover:bg-accent ${subcategory === s.name ? "bg-accent font-medium" : ""}`}
                    onMouseDown={() => { setSubcategory(s.name); setCatSearch(""); setCatOpen(false); }}
                  >
                    {s.capitalizedName}
                  </div>
                ))}
                {filteredSubs.length === 0 && !catSearch && (
                  <div className="px-3 py-1.5 text-sm text-muted-foreground">No subcategories yet</div>
                )}
                {catSearch && !allSubcategories.some((s) => s.name.toLowerCase() === catSearch.toLowerCase()) && (
                  <div
                    className="px-3 py-1.5 text-sm text-primary cursor-pointer hover:bg-accent flex items-center gap-1.5 border-t border-border"
                    onMouseDown={() => {
                      const catName = categoryNameFor(categories, type);
                      addSubcategory(catName, catSearch);
                      setSubcategory(catSearch);
                      setCatSearch("");
                      setCatOpen(false);
                    }}
                  >
                    Add "{catSearch}" as new subcategory
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">{t("entry.description")}</Label>
          <Input placeholder="Optional description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {customColumns.map((col) => (
          <CustomColumnInput key={col.id} column={col} value={customValues[col.id] ?? ""} onChange={(v) => setCustomValue(col.id, v)} />
        ))}

        <div className="space-y-1.5">
          <Label className="text-xs">{t("entry.amount")}</Label>
          <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-2">
        {selectedId ? (
          <>
            <Button className="flex-1" onClick={handleUpdate}>{t("entry.update")}</Button>
            <Button className="flex-1" variant="outline" onClick={handleCancel}>{t("entry.cancel")}</Button>
          </>
        ) : (
          <Button className="w-full" onClick={handleAdd}>{t("entry.add")}</Button>
        )}
      </div>
    </div>
  );
}

function CustomColumnInput({ column, value, onChange }: { column: CustomColumn; value: string; onChange: (v: string) => void }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const addCustomColumnOption = useCashbookStore((s) => s.addCustomColumnOption);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    if (!search) return [...column.options].sort(byLabel);
    const q = search.toLowerCase();
    return column.options.filter((o) => o.name.toLowerCase().includes(q) || o.capitalizedName.toLowerCase().includes(q)).sort(byLabel);
  }, [column.options, search]);

  const selectedOpt = column.options.find((o) => o.name === value);

  if (column.type === "amount") {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">{column.name}</Label>
        <Input type="number" placeholder="0.00" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    );
  }

  if (column.type === "list") {
    return (
      <div className="space-y-1.5" ref={ref}>
        <Label className="text-xs">{column.name}</Label>
        <div className="relative">
          <input
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground"
            placeholder={selectedOpt ? selectedOpt.capitalizedName : "Type to search..."}
            value={search || (selectedOpt ? selectedOpt.capitalizedName : "")}
            onFocus={() => setOpen(true)}
            onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          />
          {open && (
            <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-40 overflow-auto">
              <div
                className={`px-3 py-1.5 text-sm cursor-pointer hover:bg-accent ${!value ? "bg-accent font-medium" : ""}`}
                onMouseDown={() => { onChange(""); setOpen(false); setSearch(""); }}
              >
                None
              </div>
              {filtered.map((opt) => (
                <div
                  key={opt.id}
                  className={`px-3 py-1.5 text-sm cursor-pointer hover:bg-accent ${value === opt.name ? "bg-accent font-medium" : ""}`}
                  onMouseDown={() => { onChange(opt.name); setOpen(false); setSearch(""); }}
                >
                  {opt.capitalizedName}
                </div>
              ))}
              {search && !column.options.some((o) => o.name.toLowerCase() === search.toLowerCase()) && (
                <div
                  className="px-3 py-1.5 text-sm text-primary cursor-pointer hover:bg-accent flex items-center gap-1.5 border-t border-border"
                  onMouseDown={() => {
                    addCustomColumnOption(column.id, search);
                    onChange(search);
                    setSearch("");
                    setOpen(false);
                  }}
                >
                  Add "{search}" as new option
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{column.name}</Label>
      <Input placeholder={`Enter ${column.name.toLowerCase()}...`} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
