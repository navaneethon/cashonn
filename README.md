# Cashonn

Cross-platform cash-bookkeeping app for desktop (Windows) and Android. Built with **Tauri 2** + **React 19** + **TypeScript** + **Vite** + **Tailwind CSS v4** + **shadcn/ui v4**.

**Current version:** `v1.14.0` · **App id:** `com.cashonn.app` · **Author:** Navaneeth Narayanan · **Cashbook extension:** `.cshon` · **Window:** 1280×800 (min 1024×700)

> This repository holds the application source. Repository history begins at `v1.13.0`; earlier versions predate this repository.

---

## Features

### Ledger & entries
- Income / expense ledger with separate **Income** and **Expense** columns, or a single Amount column (toggle in Advanced → Columns).
- Entry panel: add and update transactions (date, category, subcategory, description, amount, custom fields); clicking a row loads it for edit.
- Running **summary rail**: record count, total income, total expense, balance.
- Row selection, delete selected entry, ledger headers drag-to-reorder (`@dnd-kit`) and resize.

### Cash books
- **Multi-cashbook tabs** with a dirty (unsaved) marker and per-tab close.
- New / Open / Save / Save As / Save All; Properties (name, description, currency, beginning balance, book type).
- **Unsaved-changes dialog on close** listing exactly which books have unsaved edits, with Save All / Don't Save / Cancel. A dirty book is always named in the prompt, including when the active tab is a different book.
- **Password gate** on open (password set/remove in Properties). *At-rest file encryption is not implemented.*
- **Refresh** reloads the active book from disk and clears the dirty flag.
- Empty state offers **Create New** and **Open Cashbook** as explicit actions.

### Categories & subcategories
- Two-way category model (Incomes / Expenses) with free-form subcategories.
- Flat subcategory picker with type-to-search; new subcategories auto-register on entry/import.
- Advanced → **Names of Categories…** renames both category labels.
- Rename-safe matching: filters, imports, and schedulers fall back to positional category lookup.

### Custom columns
- Three column types: **Text**, **Text from list** (dropdown), **Amount**.
- Manage in Advanced → Columns: add, rename, reorder, delete; choose visible built-in columns; split vs combined amount columns.
- List options **auto-seed** from existing transaction values on import, type change, open, and refresh; type a new value in the entry panel to add an option.
- Custom columns appear in the entry panel, ledger, filter dialog, CSV export, and print.

### CSV import / export
- **Import CSV…** opens a **column-mapping dialog** before anything is written:
  - Auto-guessed roles: Date, Category (Income/Expense), Subcategory, Description, Amount, Custom column, Skip.
  - Editable custom-column names, 3-row sample preview, row count on Import.
  - Handles quoted headers, UTF-8 BOM, comma / semicolon / tab delimiters, and non-standard header names.
  - Imported subcategories register into the category tree in the same transaction.
- **Export CSV…** writes Date, Category, Subcategory, Description, Amount plus every custom column (quote-escaped).

### Filter, sort & display
- Filter by date range, category, subcategory, and per-custom-column values; a shared `applyFilter` drives the table **and** the summary.
- Sort by column; edits under an active filter report status instead of vanishing silently.
- Display menu:
  - Colour scheme: Light / Dark / System.
  - **Date format:** DD-MM-YYYY, MM-DD-YYYY, YYYY-MM-YYYY, DD/MM/YYYY, MM/DD/YYYY — used in the ledger, print, **and the entry-panel date field**.
  - Amount format: Standard / Indian / European grouping.

### Regular payments
- CRUD dialog: name, interval (days/weeks/months/years), next due date, category, subcategory, description, amount, type.
- **Scheduler posts due occurrences on open and refresh**: catch-up for missed intervals (capped at 100 per payment), `nextPayment` advances past today, status bar reports the count.

### Print
- Prints the **currently filtered** rows plus a summary block.
- **Desktop** renders the document in a hidden iframe and calls `window.print()`. The print is triggered by the iframe's real `load` event (with a 2s ceiling so a document that never fires it still prints) rather than a fixed delay, so slow machines cannot open the dialog before the table has laid out.
- **Android** has no `window.print()`, so the markup is handed to a native `PrintManager` job via `DocPlugin.printCashbook`, which opens the system print dialog — including **Save as PDF** and any installed printer.
- Both platforms share one print template (`src/utils/print.ts`), so the document is identical.

### Internationalization
- English and **Malayalam** UI (Language menu); Noto Sans Malayalam applied via `.lang-ml`.

### Mobile UI (Android / narrow viewports)
- Below 1024px the app switches to a **hamburger menu**, a slide-over right panel, and a compact totals strip.
- The hamburger panel is an **accordion**: one column, one section expanded at a time. Tapping **Display** expands it and collapses **File**. The full menu structure stays visible, so there is no drill-down and no back button.
- Every menu row and toolbar button is a **44×44px** touch target; desktop keeps its compact density.
- Keyboard shortcut hints are hidden on phones.

### Desktop integration (Tauri 2)
- Native file open/save dialogs; read/write cash-book files on disk.
- Window close routed through the unsaved-changes flow (`core:window:allow-destroy`).
- Bundled icons; MSI/NSIS installers via `tauri build`.
- File associations for `.cshon`.

### Android integration
- Storage Access Framework open/save via `ACTION_OPEN_DOCUMENT` / `ACTION_CREATE_DOCUMENT`, with a **write grant** requested at open time.
- Writes try mode `w` then `wt`, and a failure returns a real error instead of hanging.
- **Cloud storage:** providers such as Google Drive may grant read-only access even when a write is requested. Cashonn detects the refusal and falls back to **File → Save As**, then remembers the returned location, so a cloud book prompts once per session and later saves happen in place.

---

## Known limitations / roadmap
- At-rest file encryption is not implemented (the password gates opening only).
- `Survey` menu entry is present but not yet wired to anything.
- Charts deferred to a future version.
- Android is release-signed and device-verified; deep-link open of `.cshon` from other apps is still pending.

---

## Getting started

### Prerequisites
- Node.js 20+ and npm
- Rust toolchain (`rustup`) for Tauri
- Windows: WebView2 (bundled with recent Windows 10/11)
- Android (only for APK builds): Android Studio + SDK, and the NDK/rust targets Tauri requests

### Development
```bash
npm install
npx tauri dev
```

- Frontend dev server: `http://localhost:1420` (Vite, `strictPort`).
- Vite **does not watch** `src-tauri/**` — this avoids EBUSY on cargo output during `tauri dev`.
- If the Cashonn exe is running, close it before rebuilding (file lock).

### Frontend only
```bash
npm run dev      # Vite
npm run build    # tsc && vite build -> dist/
```

### Production build (desktop)
```bash
npx tauri build --no-bundle   # single exe (fast)
npx tauri build               # exe + MSI + NSIS installers
```

> **Important:** always build release binaries with `npx tauri build …`, never raw `cargo build --release`.
> Tauri decides dev vs prod at compile time via the `custom-protocol` feature; a raw cargo build produces a dev-mode binary that tries to load `http://localhost:1420`.

### Production build (Android APK)
```bash
npx tauri android build --apk            # universal APK (arm64-v8a, armeabi-v7a, x86, x86_64)
npx tauri android build --apk --target aarch64   # arm64 only, smaller
```

Output: `src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk`

> **Important — stale-asset guard.** Tauri embeds `dist/` into the Rust binary at **compile** time. If you only
> changed `src/`, cargo will not recompile and the binary keeps serving the previous build. Force a rebuild by
> touching the build script (this changes its mtime, nothing else):
> ```bash
> touch src-tauri/build.rs
> ```
> Do **not** rely on `cargo clean -p cashonn` for this. It cleans the *host* target only; measured on this
> project it removed 49 host files but **0** cross-target Android files, so a previously-built APK would keep
> serving stale assets.
> Verify the result by confirming the current bundle name is embedded in the binary — the string
> `index-<hash>.js` should appear inside `cashonn.exe`, or inside
> `lib/<abi>/libcashonn_lib.so` inside the APK. A missing new hash means you shipped a stale build.

### Production build (macOS)
macOS artifacts **cannot** be cross-compiled from Windows or Linux — Tauri embeds the frontend into a native
binary and requires the macOS toolchain. Build it on a Mac, or let GitHub Actions do it.

```bash
# on a macOS machine with Xcode CLT + Rust installed
npm ci && npx tauri build --target universal-apple-darwin
```

Output: `src-tauri/target/universal-apple-darwin/release/bundle/macos/` and `.../bundle/dmg/`

The committed workflow `.github/workflows/macos-build.yml` runs exactly that on a `macos-latest` runner and
uploads both the `.app` and the `.dmg` as artifacts. It triggers on a `v*` tag push, or manually via
**Actions → macOS build → Run workflow**.

> **Bundle identifier.** The base `tauri.conf.json` uses `com.cashonn.app`, which Tauri warns ends with `.app`
> and therefore collides with the macOS bundle extension. `src-tauri/tauri.macos.conf.json` overrides the
> identifier to `com.navaneeth.cashonn` for macOS only. Tauri merges that file over the base config using
> JSON Merge Patch, so **Android keeps `com.cashonn.app`** and existing installs update normally.
> Never "fix" the warning by editing the base identifier — that would break Android upgrade continuity.

> **Signing.** The workflow produces **unsigned** builds. They run fine on the Mac that built them; on any
> other Mac Gatekeeper will block them (right-click → Open, or System Settings → Privacy & Security → Open
> Anyway). To distribute to other people you need a "Developer ID Application" certificate and Apple
> notarisation — the workflow documents the five `APPLE_*` repository secrets needed.

---

## Project layout

```
cashmanager-app/
├── package.json
├── vite.config.ts            # port 1420; ignores src-tauri in the watcher
├── src/
│   ├── main.tsx / App.tsx
│   ├── components/
│   │   ├── Menu/             # MenuBar (File, Display, Advanced, Language, Help)
│   │   ├── Layout/           # Toolbar, TabBar, StatusBar
│   │   ├── Ledger/           # LedgerTable, SummaryBox
│   │   ├── Entry/            # EntryPanel
│   │   ├── Dialogs/          # New/Filter/Sort/Properties/Columns/.../ImportCsv
│   │   └── ui/               # shadcn/ui primitives (incl. dropdown-menu)
│   ├── stores/               # Zustand: cashbookStore, uiStore
│   ├── utils/                # csv, filter, format, print, password, useIsNarrow
│   ├── types/                # CashBook, Transaction, settings
│   └── i18n/                 # en + ml translations
└── src-tauri/
    ├── Cargo.toml
    ├── build.rs              # command allowlist; also the stale-asset rebuild trigger
    ├── tauri.conf.json
    ├── tauri.macos.conf.json # macOS-only override: bundle identifier (see build notes)
    ├── capabilities/         # default.json
    ├── src/                  # Rust: lib.rs, main.rs, file I/O + mobile print commands
    └── gen/android/          # Android project (tracked: Kotlin plugin sources, gradle, res)
        └── app/src/main/java/com/cashonn/app/
            ├── MainActivity.kt
            └── DocPlugin.kt  # SAF open/save + native PrintManager print
```

`.github/workflows/macos-build.yml` is tracked in the repo root's `.github/workflows/`.

### Architecture notes
- **Android plugin commands** live in `DocPlugin.kt` and are bridged from Rust in the `doc` module of
  `src-tauri/src/lib.rs`. The print command is Android-only; the frontend only invokes it after detecting
  the Android runtime.
- **Roomy menu density** is driven by React context in `src/components/ui/dropdown-menu.tsx`. Base UI renders
  submenu popups in a portal, so a CSS descendant selector cannot reach them, but a context can — that is what
  lets the phone menu get 44px targets without duplicating the item lists.
- **Release profile.** `src-tauri/Cargo.toml` sets `lto = "thin"`, `codegen-units = 1` and `strip = true`.
  Without it cargo ships defaults, and the native libraries end up roughly 40% larger — most of the Android win
  comes from `strip`, since the Gradle release `.so` files were previously unstripped. `thin` LTO is used
  instead of fat LTO because it captures most of the benefit at a fraction of the link time.
- **Binary size is dominated by the Tauri runtime, not by application code.** The whole frontend `dist/` is
  ~780 KB while a single release `libcashonn_lib.so` is ~7.8 MB (arm64). Trimming TypeScript has little effect;
  cutting ABIs does. An arm64-only APK is roughly half the universal one.

---

## License

All rights reserved unless otherwise stated by the project owner.
Copyright © Navaneeth Narayanan.
