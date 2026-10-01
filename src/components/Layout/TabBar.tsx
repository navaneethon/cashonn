import { useCashbookStore } from "@/stores/cashbookStore";
import { useTranslation } from "@/i18n/useTranslation";
import { X } from "lucide-react";

function Tab({
  name,
  isActive,
  isDirty,
  upgradedOnly,
  dirtyTitle,
  upgradedTitle,
  onClick,
  onClose,
}: {
  name: string;
  isActive: boolean;
  isDirty: boolean;
  upgradedOnly: boolean;
  dirtyTitle: string;
  upgradedTitle: string;
  onClick: () => void;
  onClose: () => void;
}) {
  // Two different states share one tab. An asterisk means "you changed this and it is not on
  // disk" — destructive red, because closing now loses work. A hollow dot means "we upgraded
  // this layout on open" — muted, because closing it costs nothing and re-opening redoes it.
  const marker = isDirty ? (
    <span className="text-destructive ml-1.5" title={dirtyTitle} aria-label={dirtyTitle}>
      *
    </span>
  ) : upgradedOnly ? (
    <span
      className="text-muted-foreground ml-1.5 inline-block size-1.5 rounded-full border border-current align-middle"
      title={upgradedTitle}
      aria-label={upgradedTitle}
    />
  ) : null;

  return (
    <div
      role="tab"
      tabIndex={0}
      aria-selected={isActive}
      className={`group flex items-center h-8 px-3 shrink-0 cursor-pointer select-none transition-colors rounded-t-md text-sm font-medium ${isActive ? "bg-background text-foreground shadow-[0_-1px_0_var(--primary)_inset]" : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
    >
      <span className="truncate max-w-[160px]">
        {name}
        {marker}
      </span>
      <span
        role="button"
        tabIndex={-1}
        className="ml-1 size-4 pointer-coarse:size-5 inline-flex items-center justify-center rounded-sm opacity-0 group-hover:opacity-100 pointer-coarse:opacity-100 transition-opacity hover:bg-accent hover:text-accent-foreground"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      >
        <X className="size-3" />
      </span>
    </div>
  );
}

export function TabBar() {
  const openCashbooks = useCashbookStore((s) => s.openCashbooks);
  const activeCashbookId = useCashbookStore((s) => s.activeCashbookId);
  const setActiveCashbook = useCashbookStore((s) => s.setActiveCashbook);
  const requestCloseCashbook = useCashbookStore((s) => s.requestCloseCashbook);
  const { t } = useTranslation();

  if (openCashbooks.length === 0) return null;

  return (
    <div className="flex items-end bg-muted border-b border-border px-3 pt-1.5 gap-0.5 overflow-x-auto overscroll-contain">
      {openCashbooks.map((cb) => (
        <Tab
          key={cb.cashbook.id}
          name={cb.cashbook.name}
          isActive={cb.cashbook.id === activeCashbookId}
          isDirty={cb.isDirty}
          upgradedOnly={!cb.isDirty && !!cb.pendingNormalization}
          dirtyTitle={t("tab.unsaved")}
          upgradedTitle={t("tab.upgraded")}
          onClick={() => setActiveCashbook(cb.cashbook.id)}
          onClose={() => requestCloseCashbook(cb.cashbook.id)}
        />
      ))}
    </div>
  );
}