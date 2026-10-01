import { useCashbookStore } from "@/stores/cashbookStore";
import { useTranslation } from "@/i18n/useTranslation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnsavedChangesDialog({ open }: UnsavedChangesDialogProps) {
  const openCashbooks = useCashbookStore((s) => s.openCashbooks);
  const pendingCloseCashbookId = useCashbookStore((s) => s.pendingCloseCashbookId);
  const confirmSaveAndClose = useCashbookStore((s) => s.confirmSaveAndClose);
  const discardAndClose = useCashbookStore((s) => s.discardAndClose);
  const cancelClose = useCashbookStore((s) => s.cancelClose);
  const { t } = useTranslation();

  // A tab close is about one cashbook; a window close is about every dirty one.
  const closingOne = pendingCloseCashbookId !== null;
  const dirty = closingOne
    ? openCashbooks.filter((cb) => cb.cashbook.id === pendingCloseCashbookId)
    : openCashbooks.filter((cb) => cb.isDirty);
  const name = dirty[0]?.cashbook.name ?? "";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) cancelClose();
      }}
    >
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{t("unsaved.title")}</DialogTitle>
          <DialogDescription>
            {closingOne ? t("unsaved.one").replace("{name}", name) : t("unsaved.many")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {dirty.map((cb) => (
            <div key={cb.cashbook.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <span className="font-medium truncate">{cb.cashbook.name}</span>
              <span className="text-xs text-muted-foreground shrink-0 ml-2">
                {cb.filePath ? t("unsaved.modified") : t("unsaved.newFile")}
              </span>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={cancelClose}>{t("dialog.cancel")}</Button>
          <Button variant="outline" onClick={discardAndClose}>{t("unsaved.discard")}</Button>
          <Button onClick={confirmSaveAndClose}>{closingOne ? t("unsaved.save") : t("unsaved.saveAll")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}