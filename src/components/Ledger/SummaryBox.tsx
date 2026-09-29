import { useActiveCashbook, useCashbookStore } from "@/stores/cashbookStore";
import { useTranslation } from "@/i18n/useTranslation";
import { formatCurrency } from "@/utils/format";
import { applyFilter } from "@/utils/filter";
import { Separator } from "@/components/ui/separator";

export function SummaryBox({ variant = "block" }: { variant?: "block" | "compact" }) {
  const activeCb = useActiveCashbook();
  const filter = useCashbookStore((s) => s.filter);
  const transactions = applyFilter(activeCb?.cashbook.transactions ?? [], filter);
  const currency = activeCb?.cashbook.currency ?? "₹";
  const { t } = useTranslation();

  const records = transactions.length;
  const incomes = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const expenses = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const balance = (activeCb?.cashbook.beginningBalance ?? 0) + incomes - expenses;

  if (variant === "compact") {
    if (!activeCb) return null;
    return (
      <div className="grid grid-cols-3 gap-px border-t border-border bg-border text-xs lg:hidden">
        <div className="bg-card px-3 py-2">
          <div className="text-muted-foreground text-[10px] uppercase tracking-wide">{t("summary.income")}</div>
          <div className="font-medium text-primary truncate">{formatCurrency(incomes, currency)}</div>
        </div>
        <div className="bg-card px-3 py-2">
          <div className="text-muted-foreground text-[10px] uppercase tracking-wide">{t("summary.expense")}</div>
          <div className="font-medium text-destructive truncate">{formatCurrency(expenses, currency)}</div>
        </div>
        <div className="bg-card px-3 py-2">
          <div className="text-muted-foreground text-[10px] uppercase tracking-wide">{t("summary.balance")}</div>
          <div className={`font-semibold truncate ${balance >= 0 ? "text-primary" : "text-destructive"}`}>
            {formatCurrency(balance, currency)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-auto border-t border-border bg-muted/40 px-5 py-4">
      <div className="text-xs font-semibold text-muted-foreground mb-3">
        {t("summary.title")}
        {filter ? <span className="ml-1 text-muted-foreground/60">({t("summary.filtered")})</span> : null}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">{t("summary.records")}</span>
          <span className="font-medium">{records}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">{t("summary.income")}</span>
          <span className="font-medium text-primary">{formatCurrency(incomes, currency)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">{t("summary.expense")}</span>
          <span className="font-medium text-destructive">{formatCurrency(expenses, currency)}</span>
        </div>
        <Separator />
        <div className="flex justify-between items-center text-sm font-semibold">
          <span>{t("summary.balance")}</span>
          <span className={balance >= 0 ? "text-primary" : "text-destructive"}>
            {formatCurrency(balance, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}