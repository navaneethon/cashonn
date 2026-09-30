import { useState, useEffect, useMemo } from "react";
import { useCashbookStore, useActiveCashbook } from "@/stores/cashbookStore";
import { useTranslation } from "@/i18n/useTranslation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ChevronUp, ChevronDown, Pencil } from "lucide-react";
import type { CustomColumn, CustomColumnType } from "@/types";

interface ColumnsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COLUMN_TYPES: { value: CustomColumnType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "list", label: "Text from list" },
  { value: "amount", label: "Amount" },
];

function CustomColumnEditor({ column, isVisible, onToggleVisible, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast }: {
  column: CustomColumn;
  isVisible: boolean;
  onToggleVisible: (checked: boolean) => void;
  onChange: (c: CustomColumn) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const removeOption = (id: string) => {
    onChange({ ...column, options: column.options.filter((o) => o.id !== id) });
  };

  return (
    <div className="border border-border rounded-md p-3 space-y-2">
      <div className="flex items-center gap-2">
        <label className="flex items-center shrink-0 cursor-pointer" title="Show column">
          <Checkbox
            checked={isVisible}
            onCheckedChange={(checked) => onToggleVisible(!!checked)}
          />
        </label>
        <div className="flex flex-col">
          <Button variant="ghost" size="icon" className="size-5" disabled={isFirst} onClick={onMoveUp}>
            <ChevronUp className="size-3" />
          </Button>
          <Button variant="ghost" size="icon" className="size-5" disabled={isLast} onClick={onMoveDown}>
            <ChevronDown className="size-3" />
          </Button>
        </div>
        <Input
          className="flex-1 h-8"
          placeholder="Column name"
          value={column.name}
          onChange={(e) => onChange({ ...column, name: e.target.value })}
        />
        <select
          className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
          value={column.type}
          onChange={(e) => onChange({ ...column, type: e.target.value as CustomColumnType, options: e.target.value === "list" ? column.options : [] })}
        >
          {COLUMN_TYPES.map((ct) => (
            <option key={ct.value} value={ct.value}>{ct.label}</option>
          ))}
        </select>
        <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={onRemove}>
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      {column.type === "list" && column.options.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-8">
          {column.options.map((opt) => (
            <span key={opt.id} className="inline-flex items-center gap-1 text-xs bg-muted rounded-md px-2 py-0.5">
              {opt.capitalizedName}
              <button className="text-muted-foreground hover:text-destructive" onClick={() => removeOption(opt.id)}>
                <Trash2 className="size-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      {column.type === "list" && column.options.length === 0 && (
        <p className="text-xs text-muted-foreground pl-8">Options auto-populate as you type in the entry panel.</p>
      )}
    </div>
  );
}

function SubcategoryRow({ name, usedCount, onRequestDelete }: {
  name: string;
  usedCount: number;
  onRequestDelete: () => void;
}) {
  const renameSubcategory = useCashbookStore((s) => s.renameSubcategory);
  const setStatusMessage = useCashbookStore((s) => s.setStatusMessage);
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  useEffect(() => setDraft(name), [name]);

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === name) {
      setDraft(name);
      setEditing(false);
      return;
    }
    if (!renameSubcategory(name, trimmed)) {
      setStatusMessage(t("subcategory.renameFailed"));
      setDraft(name);
    }
    setEditing(false);
  };

  const inUse = t("subcategory.inUse").replace("{count}", String(usedCount));

  if (editing) {
    return (
      <Input
        className="h-7 w-32 text-xs"
        value={draft}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(name);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs bg-muted rounded-md px-2 py-0.5">
      {name}
      <button
        className="text-muted-foreground hover:text-foreground"
        title={t("subcategory.rename")}
        onClick={() => { setDraft(name); setEditing(true); }}
      >
        <Pencil className="size-2.5" />
      </button>
      {usedCount > 0 ? (
        <span className="text-[10px] text-muted-foreground" title={inUse}>
          {usedCount}
        </span>
      ) : (
        <button
          className="text-muted-foreground hover:text-destructive"
          title={t("subcategory.delete")}
          onClick={onRequestDelete}
        >
          <Trash2 className="size-2.5" />
        </button>
      )}
    </span>
  );
}

export function ColumnsDialog({ open, onOpenChange }: ColumnsDialogProps) {
  const updateSettings = useCashbookStore((s) => s.updateSettings);
  const removeSubcategory = useCashbookStore((s) => s.removeSubcategory);
  const activeCb = useActiveCashbook();
  const { t } = useTranslation();

  const [visible, setVisible] = useState<string[]>([]);
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [splitAmount, setSplitAmount] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState<CustomColumnType>("text");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useEffect(() => {
    if (open && activeCb) {
      const s = activeCb.cashbook.settings;
      setVisible(s.visibleColumns ?? ["date", "category", "subcategory", "description", "income", "expense"]);
      setCustomColumns(s.customColumns ?? []);
      setSplitAmount(s.splitIncomeExpenseColumns ?? true);
    }
  }, [open, activeCb]);

  const subcategories = activeCb?.cashbook.subcategories ?? [];

  // Sub-categories are edited here directly, so count the entries that depend on
  // each one. A sub-category still referenced by a transaction or a regular
  // payment can only be renamed -- deleting it would strand those entries on a
  // name that no longer exists in the cashbook.
  //
  // The list is flat, so usage is counted across income and expense together:
  // the same sub-category is legitimately used on both sides.
  const usageByName = useMemo(() => {
    const counts = new Map<string, number>();
    if (!activeCb) return counts;
    const { transactions, regularPayments } = activeCb.cashbook;
    const bump = (subcategory: string) => {
      if (!subcategory) return;
      counts.set(subcategory, (counts.get(subcategory) ?? 0) + 1);
    };
    transactions.forEach((tx) => bump(tx.subcategory));
    regularPayments.forEach((rp) => bump(rp.subcategory));
    return counts;
  }, [activeCb]);

  const BUILTIN_COLUMNS = [
    { value: "category", label: t("ledger.category") },
    { value: "subcategory", label: t("ledger.subcategory") },
    { value: "description", label: t("ledger.description") },
    ...(splitAmount
      ? [
          { value: "income", label: t("ledger.income") },
          { value: "expense", label: t("ledger.expense") },
        ]
      : []
    ),
  ];

  const toggleColumn = (value: string, checked: boolean) => {
    setVisible((prev) => checked ? [...prev, value] : prev.filter((v) => v !== value));
  };

  const addCustomColumn = () => {
    if (!newColName.trim()) return;
    const col: CustomColumn = {
      id: crypto.randomUUID(),
      name: newColName.trim(),
      type: newColType,
      options: [],
    };
    setCustomColumns((prev) => [...prev, col]);
    setVisible((prev) => [...prev, `custom:${col.id}`]);
    setNewColName("");
    setNewColType("text");
    setShowAdd(false);
  };

  const removeCustomColumn = (id: string) => {
    setCustomColumns((prev) => prev.filter((c) => c.id !== id));
    setVisible((prev) => prev.filter((v) => v !== `custom:${id}`));
  };

  const updateCustomColumn = (updated: CustomColumn) => {
    setCustomColumns((prev) => prev.map((c) => c.id === updated.id ? updated : c));
  };

  const moveCustomColumn = (index: number, direction: "up" | "down") => {
    setCustomColumns((prev) => {
      const next = [...prev];
      const swapIdx = direction === "up" ? index - 1 : index + 1;
      [next[index], next[swapIdx]] = [next[swapIdx], next[index]];
      return next;
    });
  };

  const handleSplitToggle = (checked: boolean) => {
    setSplitAmount(checked);
    if (checked) {
      setVisible((prev) => {
        const next = [...prev];
        if (!next.includes("income")) next.push("income");
        if (!next.includes("expense")) next.push("expense");
        next.splice(next.indexOf("amount"), 1);
        return next;
      });
    } else {
      setVisible((prev) => {
        const next = prev.filter((v) => v !== "income" && v !== "expense");
        if (!next.includes("amount")) next.push("amount");
        return next;
      });
    }
  };

  const handleApply = () => {
    updateSettings({ visibleColumns: visible, customColumns, splitIncomeExpenseColumns: splitAmount });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{t("columns.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <label className="flex items-center gap-3 text-sm cursor-pointer">
            <Checkbox
              checked={splitAmount}
              onCheckedChange={(checked) => handleSplitToggle(!!checked)}
            />
            <Label className="cursor-pointer">{t("columns.splitAmount")}</Label>
          </label>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase">{t("entry.category")}</Label>
            {BUILTIN_COLUMNS.map((col) => (
              <label key={col.value} className="flex items-center gap-3 text-sm cursor-pointer">
                <Checkbox
                  checked={visible.includes(col.value)}
                  onCheckedChange={(checked) => toggleColumn(col.value, !!checked)}
                />
                <Label>{col.label}</Label>
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase">{t("ledger.subcategory")}</Label>
            {subcategories.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("subcategory.none")}</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {subcategories.map((sub) => (
                  <SubcategoryRow
                    key={sub.id}
                    name={sub.name}
                    usedCount={usageByName.get(sub.name) ?? 0}
                    onRequestDelete={() => setPendingDelete(sub.name)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Custom Columns</Label>
              <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => setShowAdd(true)}>
                <Plus className="size-3" /> Add
              </Button>
            </div>
            {customColumns.length === 0 && !showAdd && (
              <p className="text-xs text-muted-foreground">No custom columns yet.</p>
            )}
            <div className="space-y-2">
              {customColumns.map((col, idx) => (
                <CustomColumnEditor
                  key={col.id}
                  column={col}
                  isVisible={visible.includes(`custom:${col.id}`)}
                  onToggleVisible={(checked) => toggleColumn(`custom:${col.id}`, checked)}
                  onChange={updateCustomColumn}
                  onRemove={() => removeCustomColumn(col.id)}
                  onMoveUp={() => moveCustomColumn(idx, "up")}
                  onMoveDown={() => moveCustomColumn(idx, "down")}
                  isFirst={idx === 0}
                  isLast={idx === customColumns.length - 1}
                />
              ))}
            </div>
            {showAdd && (
              <div className="border border-dashed border-border rounded-md p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    className="flex-1 h-8"
                    placeholder="Column name"
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    autoFocus
                  />
                  <select
                    className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                    value={newColType}
                    onChange={(e) => setNewColType(e.target.value as CustomColumnType)}
                  >
                    {COLUMN_TYPES.map((ct) => (
                      <option key={ct.value} value={ct.value}>{ct.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="h-7" onClick={addCustomColumn}>Add Column</Button>
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => { setShowAdd(false); setNewColName(""); }}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("dialog.cancel")}</Button>
          <Button onClick={handleApply}>{t("dialog.apply")}</Button>
        </DialogFooter>
      </DialogContent>

      <Dialog open={!!pendingDelete} onOpenChange={(o) => { if (!o) setPendingDelete(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t("subcategory.deleteTitle")}</DialogTitle>
            <DialogDescription>{t("subcategory.deleteMessage")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>{t("dialog.cancel")}</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (pendingDelete) removeSubcategory(pendingDelete);
                setPendingDelete(null);
              }}
            >
              {t("confirmDelete.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
