import { create } from "zustand";

type Theme = "light" | "dark" | "system";
type Language = "en" | "ml";

interface UIStore {
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
  theme: Theme;
  language: Language;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleRightPanel: () => void;
  setRightPanelOpen: (open: boolean) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setLanguage: (lang: Language) => void;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");

  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.add(prefersDark ? "dark" : "light");
  } else {
    root.classList.add(theme);
  }
}

function applyLanguage(lang: Language) {
  const root = document.documentElement;
  root.classList.remove("lang-en", "lang-ml");
  root.classList.add(`lang-${lang}`);
}

const saved = (typeof localStorage !== "undefined" && localStorage.getItem("theme") as Theme) || "system";
const savedLang = (typeof localStorage !== "undefined" && localStorage.getItem("language") as Language) || "en";

export const useUIStore = create<UIStore>((set, get) => ({
  sidebarOpen: true,
  rightPanelOpen: true,
  theme: saved,
  language: savedLang,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),

  toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
  setRightPanelOpen: (open: boolean) => set({ rightPanelOpen: open }),

  setTheme: (theme: Theme) => {
    applyTheme(theme);
    localStorage.setItem("theme", theme);
    set({ theme });
  },

  toggleTheme: () => {
    const current = get().theme;
    const next: Theme = current === "dark" ? "light" : "dark";
    get().setTheme(next);
  },

  setLanguage: (lang: Language) => {
    applyLanguage(lang);
    localStorage.setItem("language", lang);
    set({ language: lang });
  },
}));

applyTheme(saved);
applyLanguage(savedLang);
