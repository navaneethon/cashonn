import { useState, useEffect, useMemo } from "react";
import { useCashbookStore } from "@/stores/cashbookStore";
import { useTranslation } from "@/i18n/useTranslation";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseCsvStructure, guessCsvMappings, type CsvColumnMapping, type CsvColumnRole } from "@/utils/csv";

interface ImportCsvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLE_OPTIONS: { value: CsvColumnRole; labelKey: Parameters<ReturnType<typeof useTranslation>["t"]>[0] }[] = [
  { value: "date", labelKey: "importCsv.role.date" },
  { value: "type", labelKey: "importCsv.role.type" },
  { value: "subcategory", labelKey: "importCsv.role.subcategory" },
  { value: "description", labelKey: "importCsv.role.description" },
  { value: "amount", labelKey: "importCsv.role.amount" },
  { value: "custom", labelKey: "importCsv.role.custom" },
  { value: "skip", labelKey: "importCsv.role.skip" },
];

export function ImportCsvDialog({ open, onOpenChange }: ImportCsvDialogProps) {
  const pendingCsvImport = useCashbookStore((s) => s.pendingCsvImport);
  const setPendingCsvImport = useCashbookStore((s) => s.setPendingCsvImport);
  const importTransactions = useCashbookStore((s) => s.importTransactions);
  const { t } = useTranslation();

  const structure = useMemo(() => (open && pendingCsvImport ? parseCsvStructure(pendingCsvImport) : null), [open, pendingCsvImport]);
  const [mappings, setMappings] = useState<CsvColumnMapping[]>([]);

  useEffect(() => {
    if (open && structure) {
      setMappings(guessCsvMappings(structure.headers));
    }
  }, [open, structure]);

  const sampleRows = structure?.dataRows.slice(0, 3) ?? [];
  const rowCount = structure?.dataRows.length ?? 0;
  const customCount = mappings.filter((m) => m.role === "custom" && (m.customName || "").trim()).length;
  const mappedRoles = mappings.filter((m) => m.role !== "skip" && m.role !== "custom").length;

  const setRole = (idx: number, role: CsvColumnRole) => {
    setMappings((prev) => prev.map((m, i) => (i === idx ? { ...m, role } : m)));
  };

  const setCustomName = (idx: number, name: string) => {
    setMappings((prev) => prev.map((m, i) => (i === idx ? { ...m, role: "custom", customName: name } : m)));
  };

  const handleImport = () => {
    if (!pendingCsvImport || rowCount === 0) return;
    importTransactions(pendingCsvImport, mappings);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setPendingCsvImport(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleCancel(); }}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{t("importCsv.title")}</DialogTitle>
        </DialogHeader>

        {!structure || rowCount === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t("importCsv.empty")}</p>
        ) : (
          <div className="space-y-4 py-1">
            <p className="text-xs text-muted-foreground">
              {t("importCsv.rowsFound")} {rowCount} · {t("importCsv.mapHint")}
            </p>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">{t("importCsv.columns")}</Label>
              {structure.headers.map((header, idx) => {
                const m = mappings[idx] ?? { role: "custom" as const, customName: header };
                return (
                  <div key={idx} className="border border-border rounded-md p-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium flex-1 truncate" title={header}>{header}</span>
                      <select
                        className="h-8 rounded-md border border-input bg-transparent px-2 text-sm max-w-[160px]"
                        value={m.role}
                        onChange={(e) => setRole(idx, e.target.value as CsvColumnRole)}
                      >
                        {ROLE_OPTIONS.map((ro) => (
                          <option key={ro.value} value={ro.value}>{t(ro.labelKey)}</option>
                        ))}
                      </select>
                    </div>
                    {m.role === "custom" && (
                      <Input
                        className="h-7 text-xs"
                        placeholder={t("importCsv.customName")}
                        value={m.customName ?? header}
                        onChange={(e) => setCustomName(idx, e.target.value)}
                      />
                    )}
                    <p className="text-[10px] text-muted-foreground truncate">
                      {sampleRows.map((r) => r[idx] ?? "").filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground">
              {t("importCsv.summary")} {mappedRoles} {t("importCsv.standardCols")} · {customCount} {t("importCsv.customCols")}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>{t("dialog.cancel")}</Button>
          <Button onClick={handleImport} disabled={!structure || rowCount === 0}>
            {t("importCsv.importBtn")} ({rowCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
