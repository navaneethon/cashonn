import { useCashbookStore } from "@/stores/cashbookStore";
import { useTranslation } from "@/i18n/useTranslation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConfirmDeleteDialog({ open, onOpenChange }: ConfirmDeleteDialogProps) {
  const selectedTransactionId = useCashbookStore((s) => s.selectedTransactionId);
  const removeTransaction = useCashbookStore((s) => s.removeTransaction);
  const setActiveDialog = useCashbookStore((s) => s.setActiveDialog);
  const { t } = useTranslation();

  const handleConfirm = () => {
    if (selectedTransactionId) removeTransaction(selectedTransactionId);
    onOpenChange(false);
    setActiveDialog(null);
  };

  const handleCancel = () => {
    onOpenChange(false);
    setActiveDialog(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleCancel(); }}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{t("confirmDelete.title")}</DialogTitle>
          <DialogDescription>{t("confirmDelete.message")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>{t("dialog.cancel")}</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!selectedTransactionId}>
            {t("confirmDelete.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
