import { useCashbookStore } from "@/stores/cashbookStore";
import { NewCashbookDialog } from "./NewCashbookDialog";
import { FilterDialog } from "./FilterDialog";
import { SortDialog } from "./SortDialog";
import { PropertiesDialog } from "./PropertiesDialog";
import { ColumnsDialog } from "./ColumnsDialog";
import { CategoryNamesDialog } from "./CategoryNamesDialog";
import { RegularPaymentsDialog } from "./RegularPaymentsDialog";
import { DisplaySettingsDialog } from "./DisplaySettingsDialog";
import { PasswordPromptDialog } from "./PasswordPromptDialog";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import { ImportCsvDialog } from "./ImportCsvDialog";
import { HelpDialog } from "./HelpDialog";
import { AboutDialog } from "./AboutDialog";

export function DialogRouter() {
  const activeDialog = useCashbookStore((s) => s.activeDialog);
  const setActiveDialog = useCashbookStore((s) => s.setActiveDialog);
  const pendingCashbook = useCashbookStore((s) => s.pendingCashbook);
  const unsavedChangesOpen = useCashbookStore((s) => s.unsavedChangesOpen);
  const cancelClose = useCashbookStore((s) => s.cancelClose);

  const isDisplaySettings = activeDialog?.startsWith("display-settings");
  const displayTab = activeDialog?.split(":")[1] as "color" | "date" | "amount" | undefined;

  return (
    <>
      <NewCashbookDialog open={activeDialog === "new-cashbook"} onOpenChange={(open) => { if (!open) setActiveDialog(null); }} />
      <FilterDialog open={activeDialog === "filter"} onOpenChange={(open) => { if (!open) setActiveDialog(null); }} />
      <SortDialog open={activeDialog === "sort"} onOpenChange={(open) => { if (!open) setActiveDialog(null); }} />
      <PropertiesDialog open={activeDialog === "properties"} onOpenChange={(open) => { if (!open) setActiveDialog(null); }} />
      <ColumnsDialog open={activeDialog === "columns"} onOpenChange={(open) => { if (!open) setActiveDialog(null); }} />
      <CategoryNamesDialog open={activeDialog === "category-names"} onOpenChange={(open) => { if (!open) setActiveDialog(null); }} />
      <RegularPaymentsDialog open={activeDialog === "regular-payments"} onOpenChange={(open) => { if (!open) setActiveDialog(null); }} />
      <ImportCsvDialog open={activeDialog === "import-csv"} onOpenChange={(open) => { if (!open) setActiveDialog(null); }} />
      <DisplaySettingsDialog open={!!isDisplaySettings} onOpenChange={(open) => { if (!open) setActiveDialog(null); }} initialTab={displayTab ?? "color"} />
      <PasswordPromptDialog open={!!pendingCashbook} onOpenChange={(open) => { if (!open) { useCashbookStore.getState().setPendingCashbook(null); useCashbookStore.getState().setStatusMessage("Ready"); } }} />
      <UnsavedChangesDialog open={unsavedChangesOpen} onOpenChange={(open) => { if (!open) cancelClose(); }} />
      <ConfirmDeleteDialog open={activeDialog === "confirm-delete"} onOpenChange={(open) => { if (!open) setActiveDialog(null); }} />
      <HelpDialog open={activeDialog === "help"} onOpenChange={(open) => { if (!open) setActiveDialog(null); }} />
      <AboutDialog open={activeDialog === "about"} onOpenChange={(open) => { if (!open) setActiveDialog(null); }} />
    </>
  );
}
