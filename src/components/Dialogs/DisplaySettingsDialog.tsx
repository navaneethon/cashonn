import { useState, useEffect } from "react";
import { useCashbookStore, useActiveCashbook } from "@/stores/cashbookStore";
import { useUIStore } from "@/stores/uiStore";
import { useTranslation } from "@/i18n/useTranslation";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface DisplaySettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: "color" | "date" | "amount";
}

const COLOR_SCHEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System Default" },
];

const DATE_FORMATS = [
  { value: "dd-mm-yyyy", label: "DD-MM-YYYY" },
  { value: "mm-dd-yyyy", label: "MM-DD-YYYY" },
  { value: "yyyy-mm-dd", label: "YYYY-MM-DD" },
  { value: "dd/mm/yyyy", label: "DD/MM/YYYY" },
  { value: "mm/dd/yyyy", label: "MM/DD/YYYY" },
];

const AMOUNT_FORMATS = [
  { value: "standard", label: "Standard (1,234.56)" },
  { value: "indian", label: "Indian (12,34,567.00)" },
  { value: "european", label: "European (1.234,56)" },
];

export function DisplaySettingsDialog({ open, onOpenChange, initialTab = "color" }: DisplaySettingsDialogProps) {
  const activeCb = useActiveCashbook();
  const updateSettings = useCashbookStore((s) => s.updateSettings);
  const uiTheme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const { t } = useTranslation();

  const settings = activeCb?.cashbook.settings;
  const [colorScheme, setColorScheme] = useState(uiTheme);
  const [dateFormat, setDateFormat] = useState(settings?.dateFormat ?? "dd-mm-yyyy");
  const [amountFormat, setAmountFormat] = useState(settings?.amountFormat ?? "standard");
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (open) {
      setColorScheme(uiTheme);
      setDateFormat(settings?.dateFormat ?? "dd-mm-yyyy");
      setAmountFormat(settings?.amountFormat ?? "standard");
      setActiveTab(initialTab);
    }
  }, [open, uiTheme, settings, initialTab]);

  const handleApply = () => {
    setTheme(colorScheme as "light" | "dark" | "system");
    updateSettings({ colorScheme, dateFormat, amountFormat });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{t("displaySettings.title")}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 border-b border-border mb-4">
          {(["color", "date", "amount"] as const).map((tab) => (
            <button
              key={tab}
              className={`px-4 py-2 text-sm font-medium transition-colors -mb-px ${activeTab === tab ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "color" ? t("displaySettings.colorScheme") : tab === "date" ? t("displaySettings.dateFormat") : t("displaySettings.amountFormat")}
            </button>
          ))}
        </div>

        <div className="py-2">
          {activeTab === "color" && (
            <RadioGroup value={colorScheme} onValueChange={(v) => setColorScheme((v ?? "system") as "light" | "dark" | "system")}>
              {COLOR_SCHEMES.map((scheme) => (
                <label key={scheme.value} className="flex items-center gap-3 py-2 cursor-pointer">
                  <RadioGroupItem value={scheme.value} />
                  <Label className="cursor-pointer">{scheme.label}</Label>
                </label>
              ))}
            </RadioGroup>
          )}

          {activeTab === "date" && (
            <RadioGroup value={dateFormat} onValueChange={(v) => setDateFormat(v ?? "dd-mm-yyyy")}>
              {DATE_FORMATS.map((fmt) => (
                <label key={fmt.value} className="flex items-center gap-3 py-2 cursor-pointer">
                  <RadioGroupItem value={fmt.value} />
                  <Label className="cursor-pointer">{fmt.label}</Label>
                </label>
              ))}
            </RadioGroup>
          )}

          {activeTab === "amount" && (
            <RadioGroup value={amountFormat} onValueChange={(v) => setAmountFormat(v ?? "standard")}>
              {AMOUNT_FORMATS.map((fmt) => (
                <label key={fmt.value} className="flex items-center gap-3 py-2 cursor-pointer">
                  <RadioGroupItem value={fmt.value} />
                  <Label className="cursor-pointer">{fmt.label}</Label>
                </label>
              ))}
            </RadioGroup>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("dialog.cancel")}</Button>
          <Button onClick={handleApply}>{t("dialog.apply")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
