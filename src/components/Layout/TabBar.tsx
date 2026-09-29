import { useCashbookStore } from "@/stores/cashbookStore";
import { X } from "lucide-react";

function Tab({ name, isActive, isDirty, onClick, onClose }: { name: string; isActive: boolean; isDirty: boolean; onClick: () => void; onClose: () => void }) {
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
        {isDirty && <span className="text-destructive ml-1.5">*</span>}
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

  if (openCashbooks.length === 0) return null;

  return (
    <div className="flex items-end bg-muted border-b border-border px-3 pt-1.5 gap-0.5 overflow-x-auto overscroll-contain">
      {openCashbooks.map((cb) => (
        <Tab
          key={cb.cashbook.id}
          name={cb.cashbook.name}
          isActive={cb.cashbook.id === activeCashbookId}
          isDirty={cb.isDirty}
          onClick={() => setActiveCashbook(cb.cashbook.id)}
          onClose={() => requestCloseCashbook(cb.cashbook.id)}
        />
      ))}
    </div>
  );
}
