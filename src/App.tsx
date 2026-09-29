import { MenuBar } from "@/components/Menu/MenuBar";
import { Toolbar } from "@/components/Layout/Toolbar";
import { TabBar } from "@/components/Layout/TabBar";
import { StatusBar } from "@/components/Layout/StatusBar";
import { LedgerTable } from "@/components/Ledger/LedgerTable";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SummaryBox } from "@/components/Ledger/SummaryBox";
import { EntryPanel } from "@/components/Entry/EntryPanel";
import { DialogRouter } from "@/components/Dialogs/DialogRouter";
import { useUIStore } from "@/stores/uiStore";
import { useCashbookStore } from "@/stores/cashbookStore";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useEffect } from "react";

function isNarrowViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;
}

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export default function App() {
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);
  const setRightPanelOpen = useUIStore((s) => s.setRightPanelOpen);

  useEffect(() => {
    if (isNarrowViewport()) {
      setRightPanelOpen(false);
    }
  }, [setRightPanelOpen]);

  useEffect(() => {
    if (!isTauri()) {
      const handler = (e: BeforeUnloadEvent) => {
        const hasDirty = useCashbookStore.getState().openCashbooks.some((cb) => cb.isDirty);
        if (hasDirty) {
          e.preventDefault();
          e.returnValue = "";
        }
      };
      window.addEventListener("beforeunload", handler);
      return () => window.removeEventListener("beforeunload", handler);
    }
    let unlistenClose: (() => void) | undefined;
    let unlistenOpen: (() => void) | undefined;
    (async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      unlistenClose = await getCurrentWindow().onCloseRequested(async (event) => {
        event.preventDefault();
        await useCashbookStore.getState().requestClose();
      });

      const { listen } = await import("@tauri-apps/api/event");
      const { invoke } = await import("@tauri-apps/api/core");

      unlistenOpen = await listen<string>("open-file", (event) => {
        void useCashbookStore.getState().openCashbookFromPath(event.payload);
      });

      const startupFile = await invoke<string | null>("take_startup_file");
      if (startupFile) {
        void useCashbookStore.getState().openCashbookFromPath(startupFile);
      }
    })();
    return () => {
      unlistenClose?.();
      unlistenOpen?.();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      const store = useCashbookStore.getState();
      if (key === "n") {
        e.preventDefault();
        store.setActiveDialog("new-cashbook");
      } else if (key === "o") {
        e.preventDefault();
        void store.loadCashbook();
      } else if (key === "s") {
        e.preventDefault();
        void store.saveCashbook();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <MenuBar />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex flex-1 flex-col overflow-hidden">
          <Toolbar />
          <TabBar />
          <ErrorBoundary>
            <LedgerTable />
          </ErrorBoundary>
          <SummaryBox variant="compact" />
        </main>
        {rightPanelOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              aria-hidden="true"
              onClick={() => setRightPanelOpen(false)}
            />
            <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col overflow-auto border-l border-border bg-card shadow-xl lg:static lg:inset-auto lg:z-auto lg:w-80 lg:max-w-none lg:bg-transparent lg:shadow-none">
              <div className="sticky top-0 z-10 flex items-center justify-end gap-2 border-b border-border bg-card px-3 pt-2 pb-1 lg:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Close panel"
                  onClick={() => setRightPanelOpen(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>
              <EntryPanel />
              <SummaryBox />
            </aside>
          </>
        )}
      </div>
      <StatusBar />
      <DialogRouter />
    </div>
  );
}
