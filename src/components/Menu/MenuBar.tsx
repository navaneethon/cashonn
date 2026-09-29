import { useState, type ReactNode } from "react";
import { Menu as MenuIcon, ChevronRight } from "lucide-react";
import { useCashbookStore, useActiveCashbook } from "@/stores/cashbookStore";
import { useUIStore } from "@/stores/uiStore";
import { useTranslation } from "@/i18n/useTranslation";
import { useIsNarrow } from "@/utils/useIsNarrow";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function MenuBar() {
  const setActiveDialog = useCashbookStore((s) => s.setActiveDialog);
  const saveCashbook = useCashbookStore((s) => s.saveCashbook);
  const saveCashbookAs = useCashbookStore((s) => s.saveCashbookAs);
  const loadCashbook = useCashbookStore((s) => s.loadCashbook);
  const exportCSV = useCashbookStore((s) => s.exportCSV);
  const setPendingCsvImport = useCashbookStore((s) => s.setPendingCsvImport);
  const activeCb = useActiveCashbook();
  const language = useUIStore((s) => s.language);
  const setLanguage = useUIStore((s) => s.setLanguage);
  const { t } = useTranslation();
  const narrow = useIsNarrow();
  const [openSection, setOpenSection] = useState<string | null>(null);

  const handleExit = async () => {
    await useCashbookStore.getState().requestClose();
  };

  const handleImportCSV = async () => {
    if (!isTauri()) { alert("Run 'npx tauri dev' to use file dialogs"); return; }
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: false,
        filters: [{ name: "CSV", extensions: ["csv"] }],
      });
      if (!selected) return;

      const filePath = Array.isArray(selected) ? selected[0] : selected;
      const { invoke } = await import("@tauri-apps/api/core");
      const content = await invoke<string>("read_file", { path: filePath });
      // Open mapping dialog instead of importing blindly
      setPendingCsvImport(content);
      setActiveDialog("import-csv");
    } catch (err) {
      console.error("Import failed:", err);
    }
  };

  // Menu bodies — rendered inside the desktop dropdowns or the mobile submenus.
  const fileItems = (
    <>
      <DropdownMenuItem onClick={() => setActiveDialog("new-cashbook")}>
        <span className="flex-1">{t("file.new")}</span>
        <span className="ml-4 hidden text-xs text-muted-foreground sm:inline">Ctrl+N</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => loadCashbook()}>
        <span className="flex-1">{t("file.open")}</span>
        <span className="ml-4 hidden text-xs text-muted-foreground sm:inline">Ctrl+O</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => saveCashbook()}>
        <span className="flex-1">{t("file.save")}</span>
        <span className="ml-4 hidden text-xs text-muted-foreground sm:inline">Ctrl+S</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => saveCashbookAs()} disabled={!activeCb}>
        <span className="flex-1">{t("file.saveAs")}</span>
        <span className="ml-4 hidden text-xs text-muted-foreground sm:inline">Ctrl+Shift+S</span>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={handleImportCSV} disabled={!activeCb}>{t("file.importCSV")}</DropdownMenuItem>
      <DropdownMenuItem onClick={() => exportCSV()} disabled={!activeCb}>{t("file.exportCSV")}</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => setActiveDialog("properties")}>{t("file.properties")}</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={handleExit}>{t("file.exit")}</DropdownMenuItem>
    </>
  );

  const displayItems = (
    <>
      <DropdownMenuItem onClick={() => setActiveDialog("display-settings:color")}>{t("display.colourScheme")}</DropdownMenuItem>
      <DropdownMenuItem onClick={() => setActiveDialog("display-settings:date")}>{t("display.dateFormat")}</DropdownMenuItem>
      <DropdownMenuItem onClick={() => setActiveDialog("display-settings:amount")}>{t("display.amountFormat")}</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => setActiveDialog("filter")}>{t("display.filter")}</DropdownMenuItem>
      <DropdownMenuItem onClick={() => setActiveDialog("sort")}>{t("display.sort")}</DropdownMenuItem>
    </>
  );

  const advancedItems = (
    <>
      <DropdownMenuItem onClick={() => setActiveDialog("regular-payments")}>{t("advanced.regularPayments")}</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => setActiveDialog("category-names")}>{t("advanced.categoryNames")}</DropdownMenuItem>
      <DropdownMenuItem onClick={() => setActiveDialog("columns")}>{t("advanced.columns")}</DropdownMenuItem>
    </>
  );

  const languageItems = (
    <>
      <DropdownMenuItem onClick={() => setLanguage("en")}>
        {language === "en" ? "✓ " : ""}English
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setLanguage("ml")}>
        {language === "ml" ? "✓ " : ""}Malayalam
      </DropdownMenuItem>
    </>
  );

  const helpItems = (
    <>
      <DropdownMenuItem onClick={() => setActiveDialog("help")}>{t("help.guide")}</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => setActiveDialog("about")}>{t("about.title")}</DropdownMenuItem>
    </>
  );

  // Mobile section header. `closeOnClick={false}` keeps the panel open so the header can act as a
  // disclosure; every other item still closes the menu, which is what you want once a choice is
  // made. `display: contents` on the wrapper means the header and its items sit directly in the
  // panel, so the existing item/separator styling is unchanged.
  const section = (id: string, label: string, items: ReactNode) => {
    const open = openSection === id;
    return (
      <div className="contents">
        <DropdownMenuItem
          closeOnClick={false}
          aria-expanded={open}
          onClick={() => setOpenSection(open ? null : id)}
          className={`justify-between font-medium ${open ? "bg-accent text-accent-foreground" : ""}`}
        >
          <span className="flex-1 text-left">{label}</span>
          <ChevronRight
            className={`size-4 shrink-0 transition-transform duration-150 ${open ? "rotate-90" : ""}`}
          />
        </DropdownMenuItem>
        {open ? (
          <div className="ml-3 border-l border-border pl-1.5 pb-1">
            <div className="-mx-1.5">{items}</div>
          </div>
        ) : null}
      </div>
    );
  };

  if (narrow) {
    // Mobile: one hamburger, one column, sections behave like accordions. Only one section is
    // expanded at a time, so the panel height is bounded by a single section plus the headers,
    // and the whole menu structure stays visible while you pick an item - unlike the previous
    // drill-down, where opening a submenu replaced the list and hid the other sections.
    return (
      <div className="flex items-center h-12 px-2 bg-card border-b border-border">
        <DropdownMenu
          onOpenChange={(open) => {
            if (!open) setOpenSection(null);
          }}
        >
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={t("menu.open")} className="size-11" />}>
            <MenuIcon className="size-6" />
          </DropdownMenuTrigger>
          {/* roomy gives every item a 44px touch target; the panel is wider and
              capped to the viewport so it cannot overflow a narrow phone. */}
          <DropdownMenuContent className="w-72 max-w-[calc(100vw-1rem)]" align="start" roomy>
            {section("file", t("menu.file"), fileItems)}
            {section("display", t("menu.display"), displayItems)}
            {section("advanced", t("menu.advanced"), advancedItems)}
            {section("language", t("menu.language"), languageItems)}
            <DropdownMenuItem>{t("menu.survey")}</DropdownMenuItem>
            {section("help", t("menu.help"), helpItems)}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 h-10 px-4 bg-card border-b border-border overflow-x-auto overscroll-contain">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>{t("menu.file")}</DropdownMenuTrigger>
        <DropdownMenuContent>{fileItems}</DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>{t("menu.display")}</DropdownMenuTrigger>
        <DropdownMenuContent>{displayItems}</DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>{t("menu.advanced")}</DropdownMenuTrigger>
        <DropdownMenuContent>{advancedItems}</DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>{t("menu.language")}</DropdownMenuTrigger>
        <DropdownMenuContent>{languageItems}</DropdownMenuContent>
      </DropdownMenu>

      <Button variant="ghost" size="sm">{t("menu.survey")}</Button>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>{t("menu.help")}</DropdownMenuTrigger>
        <DropdownMenuContent>{helpItems}</DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
