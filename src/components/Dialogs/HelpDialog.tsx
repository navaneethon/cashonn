import { useTranslation } from "@/i18n/useTranslation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t("help.guide")}</DialogTitle>
          <DialogDescription>{t("help.guideSubtitle")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2 text-sm max-h-[60vh] overflow-auto">
          <section>
            <h4 className="font-medium mb-1">{t("help.section.cashbook")}</h4>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>{t("help.cashbook.new")}</li>
              <li>{t("help.cashbook.open")}</li>
              <li>{t("help.cashbook.save")}</li>
              <li>{t("help.cashbook.tabs")}</li>
            </ul>
          </section>
          <section>
            <h4 className="font-medium mb-1">{t("help.section.entries")}</h4>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>{t("help.entries.add")}</li>
              <li>{t("help.entries.edit")}</li>
              <li>{t("help.entries.date")}</li>
              <li>{t("help.entries.categories")}</li>
            </ul>
          </section>
          <section>
            <h4 className="font-medium mb-1">{t("help.section.display")}</h4>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>{t("help.display.filter")}</li>
              <li>{t("help.display.sort")}</li>
              <li>{t("help.display.format")}</li>
            </ul>
          </section>
          <section>
            <h4 className="font-medium mb-1">{t("help.section.csv")}</h4>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>{t("help.csv.import")}</li>
              <li>{t("help.csv.export")}</li>
            </ul>
          </section>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{t("dialog.close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
