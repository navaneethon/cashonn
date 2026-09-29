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
import { version } from "../../../package.json";

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{t("about.title")}</DialogTitle>
          <DialogDescription>{t("about.tagline")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("about.app")}</span>
            <span className="font-medium">Cashonn</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("about.version")}</span>
            <span className="font-medium">{version}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("about.author")}</span>
            <span className="font-medium">Navaneeth Narayanan</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("about.identifier")}</span>
            <span className="font-medium">com.cashonn.app</span>
          </div>
          <p className="text-xs text-muted-foreground pt-2 border-t border-border">
            {t("about.copyright")}
          </p>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{t("dialog.close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
