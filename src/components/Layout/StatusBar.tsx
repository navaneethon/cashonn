import { useState } from "react";
import { useCashbookStore, useActiveCashbook } from "@/stores/cashbookStore";
import { useTranslation } from "@/i18n/useTranslation";

export function StatusBar() {
  const activeCb = useActiveCashbook();
  const txCount = activeCb?.cashbook.transactions.length ?? 0;
  const hasFilter = !!useCashbookStore((s) => s.filter);
  const upgraded = !!activeCb?.pendingNormalization && !activeCb?.isDirty;
  const statusMessage = useCashbookStore((s) => s.statusMessage);
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const message = statusMessage || t("status.ready");

  return (
    <div className="relative flex items-center h-7 px-5 bg-card border-t border-border text-xs text-muted-foreground gap-5">
      {expanded && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close"
          className="fixed inset-0 z-40"
          onClick={() => setExpanded(false)}
        />
      )}
      {expanded && (
        <div className="absolute bottom-full left-0 right-0 z-50 max-h-64 overflow-y-auto border-t border-border bg-card px-5 py-3 text-xs text-foreground shadow-lg">
          <span className="flex items-start gap-2">
            <div className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
            <span className="whitespace-pre-wrap break-words">{message}</span>
          </span>
        </div>
      )}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label="Toggle status message"
        className="flex min-w-0 max-w-full items-center gap-2 text-left"
      >
        <div className="size-1.5 shrink-0 rounded-full bg-primary" />
        <span className="truncate">{message}</span>
      </button>
      {activeCb && (
        <>
          <span className="shrink-0">{txCount} record{txCount !== 1 ? "s" : ""}</span>
          {upgraded && (
            <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
              <span className="size-1.5 rounded-full border border-current" />
              {t("status.upgraded")}
            </span>
          )}
          {hasFilter && (
            <span className="flex shrink-0 items-center gap-1.5 text-primary font-medium">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
              </svg>
              {t("status.filtered")}
            </span>
          )}
        </>
      )}
    </div>
  );
}
