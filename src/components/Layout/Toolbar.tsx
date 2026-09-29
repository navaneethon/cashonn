import { useCashbookStore, useActiveCashbook } from "@/stores/cashbookStore";
import { useUIStore } from "@/stores/uiStore";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FilePlus, FolderOpen, Save, Printer, RotateCw, Filter, ArrowUpDown, Plus, Trash2, PanelRightOpen, PanelRightClose } from "lucide-react";
import { printCashbook } from "@/utils/print";
import { applyFilter } from "@/utils/filter";
import { isNarrowViewport, useIsNarrow } from "@/utils/useIsNarrow";

/**
 * On a phone the 32px `size="icon"` default is well under the 44px touch-target guidance, so
 * the narrow layout promotes every button to 44px with a larger glyph. Desktop keeps the
 * compact 32px density.
 */
function ToolbarButton({ icon, label, onClick, disabled, active, dot, roomy }: { icon: React.ReactNode; label: string; onClick?: () => void; disabled?: boolean; active?: boolean; dot?: boolean; roomy?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant={active ? "secondary" : "ghost"} size="icon" onClick={onClick} disabled={disabled} className={roomy ? "relative size-11" : "relative"} />}>
        {icon}
        {dot && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive" />}
      </TooltipTrigger>
      <TooltipContent><p>{label}</p></TooltipContent>
    </Tooltip>
  );
}

export function Toolbar() {
  const setActiveDialog = useCashbookStore((s) => s.setActiveDialog);
  const saveCashbook = useCashbookStore((s) => s.saveCashbook);
  const loadCashbook = useCashbookStore((s) => s.loadCashbook);
  const refreshActiveCashbook = useCashbookStore((s) => s.refreshActiveCashbook);
  const deleteSelectedTransaction = useCashbookStore((s) => s.deleteSelectedTransaction);
  const selectedTransactionId = useCashbookStore((s) => s.selectedTransactionId);
  const setSelectedTransaction = useCashbookStore((s) => s.setSelectedTransaction);
  const filter = useCashbookStore((s) => s.filter);
  const activeCb = useActiveCashbook();
  const hasActive = !!activeCb;
  const hasFilter = !!filter;
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel);
  const setRightPanelOpen = useUIStore((s) => s.setRightPanelOpen);

  const setStatusMessage = useCashbookStore((s) => s.setStatusMessage);
  const narrow = useIsNarrow();
  const icon = narrow ? "size-5" : "size-4";

  const handleNewEntry = () => {
    if (!hasActive) return;
    setSelectedTransaction(null);
    if (isNarrowViewport()) {
      setRightPanelOpen(true);
    }
  };

  const handlePrint = async () => {
    if (!activeCb) return;
    const txs = applyFilter(activeCb.cashbook.transactions, filter);
    setStatusMessage("Printing...");
    const ok = await printCashbook(activeCb.cashbook, txs);
    if (!ok) {
      setStatusMessage("Print could not be started - no print service available");
    }
  };

  return (
    <div className={`flex items-center bg-card border-b border-border overflow-x-auto overscroll-contain ${narrow ? "h-14 px-2 gap-1" : "h-11 px-4 gap-1"}`}>
      <ToolbarButton roomy={narrow} icon={<FilePlus className={icon} />} label="New (Ctrl+N)" onClick={() => setActiveDialog("new-cashbook")} />
      <ToolbarButton roomy={narrow} icon={<FolderOpen className={icon} />} label="Open (Ctrl+O)" onClick={loadCashbook} />
      <ToolbarButton roomy={narrow} icon={<Save className={icon} />} label="Save (Ctrl+S)" onClick={saveCashbook} disabled={!hasActive} />
      <ToolbarButton roomy={narrow} icon={<Printer className={icon} />} label="Print" onClick={handlePrint} disabled={!hasActive} />
      <Separator orientation="vertical" className="mx-1 h-6" />
      <ToolbarButton roomy={narrow} icon={<RotateCw className={icon} />} label="Refresh" onClick={refreshActiveCashbook} disabled={!hasActive} />
      <ToolbarButton roomy={narrow} icon={<Filter className={icon} />} label="Filter" onClick={() => setActiveDialog("filter")} disabled={!hasActive} dot={hasFilter} />
      <ToolbarButton roomy={narrow} icon={<ArrowUpDown className={icon} />} label="Sort" onClick={() => setActiveDialog("sort")} disabled={!hasActive} />
      <Separator orientation="vertical" className="mx-1 h-6" />
      <ToolbarButton roomy={narrow} icon={<Plus className={icon} />} label="New Entry" onClick={handleNewEntry} disabled={!hasActive} />
      <ToolbarButton roomy={narrow} icon={<Trash2 className={icon} />} label="Delete" onClick={deleteSelectedTransaction} disabled={!hasActive || !selectedTransactionId} />
      <div className="flex-1" />
      <ToolbarButton
        roomy={narrow}
        icon={rightPanelOpen ? <PanelRightClose className={icon} /> : <PanelRightOpen className={icon} />}
        label={rightPanelOpen ? "Hide Panel" : "Show Panel"}
        onClick={toggleRightPanel}
        active={rightPanelOpen}
      />
    </div>
  );
}
