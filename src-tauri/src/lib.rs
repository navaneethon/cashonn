use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::str::FromStr;
use std::sync::Mutex;
#[cfg(not(any(target_os = "android", target_os = "ios")))]
use tauri::{Emitter, Manager};
use tauri_plugin_fs::{FilePath, FsExt, OpenOptions};

/// `Value::default()` is `Null`, which would round-trip a transaction's custom data as
/// `"customData": null` - not the object the TypeScript type promises. Default to `{}` instead so
/// a file written before custom columns existed loads as an entry with no custom values.
fn empty_object() -> serde_json::Value {
    serde_json::Value::Object(serde_json::Map::new())
}

/// Both structs mirror `src/types/index.ts` exactly, and that mirror is load-bearing.
///
/// `deny_unknown_fields` is what makes this safe to maintain. Serde's default is to silently
/// ignore keys it does not know when reading and to omit them when writing - which means a field
/// added to the TypeScript type but forgotten here is destroyed on the next save with no error
/// anywhere. That is exactly how `subcategories` (the flat sub-category list added in v1.14.0) was
/// being dropped on every write. With the attribute, drift fails loudly at load instead.
///
/// The cost is that a genuine schema change must touch this file in the same commit. That is the
/// point: it is a deliberate tripwire, not a limitation. If this ever becomes painful, the better
/// answer is to delete the structs and pass `serde_json::Value` through untouched (see DR-58).
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(deny_unknown_fields)]
pub struct Transaction {
    pub id: String,
    pub date: String,
    #[serde(rename = "type")]
    pub tx_type: String,
    pub category: String,
    pub subcategory: String,
    pub description: String,
    pub amount: f64,
    #[serde(rename = "orderOfEntry")]
    pub order_of_entry: u32,
    /// Always written, never omitted. The TypeScript type declares `customData` as required, so
    /// the previous `Option<Value>` + `skip_serializing_if` made the round trip asymmetric: Rust
    /// decided whether the key existed while the frontend assumed it always did. `default` keeps
    /// files written before custom columns existed loadable.
    #[serde(rename = "customData", default = "empty_object")]
    pub custom_data: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(deny_unknown_fields)]
pub struct CashBook {
    pub id: String,
    pub name: String,
    pub description: String,
    pub currency: String,
    #[serde(rename = "beginningBalance")]
    pub beginning_balance: f64,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "passwordHash", skip_serializing_if = "Option::is_none")]
    pub password_hash: Option<String>,
    #[serde(rename = "passwordSalt", skip_serializing_if = "Option::is_none")]
    pub password_salt: Option<String>,
    #[serde(rename = "type")]
    pub book_type: String,
    pub transactions: Vec<Transaction>,
    pub categories: Vec<serde_json::Value>,
    /// The flat, cashbook-wide sub-category list (v1.14.0). This field was missing, so serde
    /// dropped it on read and omitted it on write - the list was never on disk, and re-seeding it
    /// from `transactions[].subcategory` on each open regenerated ids and capitalised names for
    /// any sub-category that had no transactions of its own.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub subcategories: Vec<serde_json::Value>,
    #[serde(rename = "regularPayments")]
    pub regular_payments: Vec<serde_json::Value>,
    pub settings: serde_json::Value,
}

/// Resolves a path string into a `FilePath`, interpreting `content://` (Android SAF)
/// and `file://` URIs as URLs so the fs plugin can open them through the content resolver.
/// Multi-char schemes are treated as URLs; single-char schemes (e.g. `C:\…`) stay paths.
fn resolve_fs_path(s: &str) -> FilePath {
    FilePath::from_str(s).unwrap_or_else(|_| PathBuf::from(s).into())
}

/// Cross-platform write: desktop uses the plain filesystem (with parent-dir creation);
/// Android SAF URIs are written through the fs plugin's content-resolver file descriptor.
fn write_bytes(app: &tauri::AppHandle, path: &str, content: &[u8]) -> Result<(), String> {
    use std::io::Write;
    let fp = resolve_fs_path(path);
    if let FilePath::Path(p) = &fp {
        if let Some(parent) = p.parent() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
        }
    }
    let mut opts = OpenOptions::new();
    opts.write(true).create(true).truncate(true);
    let mut file = app
        .fs()
        .open(fp, opts)
        .map_err(|e| format!("Failed to open file: {}", e))?;
    file.write_all(content)
        .map_err(|e| format!("Failed to write file: {}", e))?;
    Ok(())
}

#[tauri::command]
fn read_cashbook(app: tauri::AppHandle, path: String) -> Result<CashBook, String> {
    let content = app
        .fs()
        .read_to_string(resolve_fs_path(&path))
        .map_err(|e| format!("Failed to read file: {}", e))?;
    let cashbook: CashBook =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse JSON: {}", e))?;
    Ok(cashbook)
}

#[tauri::command]
fn write_cashbook(app: tauri::AppHandle, path: String, cashbook: CashBook) -> Result<(), String> {
    let json = serde_json::to_string_pretty(&cashbook)
        .map_err(|e| format!("Failed to serialize: {}", e))?;
    write_bytes(&app, &path, json.as_bytes())
}

#[tauri::command]
fn get_save_path(default_name: String) -> Result<String, String> {
    let desktop = dirs::desktop_dir().ok_or("Could not find desktop directory")?;
    let path = desktop.join(format!("{}.cshon", default_name));
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn write_file(app: tauri::AppHandle, path: String, content: String) -> Result<(), String> {
    write_bytes(&app, &path, content.as_bytes())
}

#[tauri::command]
fn read_file(app: tauri::AppHandle, path: String) -> Result<String, String> {
    app.fs()
        .read_to_string(resolve_fs_path(&path))
        .map_err(|e| format!("Failed to read file: {}", e))
}

fn is_cashbook_arg(arg: &str) -> bool {
    Path::new(arg)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.eq_ignore_ascii_case("cshon"))
        .unwrap_or(false)
}

fn cashbook_from_args(args: &[String]) -> Option<String> {
    args.iter()
        .skip(1)
        .find(|a| is_cashbook_arg(a))
        .cloned()
}

/// Android-only companion to `tauri-plugin-dialog`.
///
/// `openDocument` (Kotlin) runs the same fast `ACTION_GET_CONTENT` picker but asks for a
/// write grant as well, which is what lets Save overwrite a cloud file in place instead of
/// falling back to a "save a copy" dialog. JS drives it directly: `openDocument` answers as
/// soon as the picker is up and `getPickResult` hands over the picked uri, because a response
/// from an Android activity callback never reaches the webview.
/// `write_cashbook_document` performs the write in Kotlin rather
/// than through `tauri-plugin-fs`, whose Android `getFileDescriptor` swallows resolver failures
/// by never settling the invoke — that turned every failed save into a silent no-op.
#[cfg(target_os = "android")]
mod doc {
    use super::*;
    use tauri::{plugin::PluginHandle, Manager, Runtime};

    const PLUGIN_IDENTIFIER: &str = "com.cashonn.app";

    pub struct DocHandle<R: Runtime>(pub Mutex<Option<PluginHandle<R>>>);

    pub fn init<R: Runtime>() -> tauri::plugin::TauriPlugin<R> {
        tauri::plugin::Builder::new("doc")
            .setup(|app, api| {
                let handle = api.register_android_plugin(PLUGIN_IDENTIFIER, "DocPlugin")?;
                app.manage(DocHandle(Mutex::new(Some(handle))));
                Ok(())
            })
            // Deliberately no `open_document` command here. A Rust wrapper around the Kotlin
            // `openDocument` would block on run_mobile_plugin until Kotlin answers, and Kotlin
            // can only answer once the user leaves the picker - an activity-callback response
            // is dropped before it reaches the webview, so the wrapper would wait forever and
            // the frontend would hang on "Opening...". JS therefore calls the Kotlin commands
            // directly (`plugin:doc|open_document` then `plugin:doc|get_pick_result`).
            //
            // `write_cashbook_document` stays on the Rust side because it serializes the
            // cashbook, keeping the on-disk format in one place.
            .invoke_handler(tauri::generate_handler![write_cashbook_document])
            .build()
    }

    fn handle<R: Runtime>(
        state: tauri::State<'_, DocHandle<R>>,
    ) -> Result<PluginHandle<R>, String> {
        state
            .0
            .lock()
            .map_err(|_| "doc handle lock poisoned".to_string())?
            .as_ref()
            .ok_or("doc plugin not initialized".to_string())
            .cloned()
    }

    #[tauri::command]
    pub fn write_cashbook_document(
        state: tauri::State<'_, DocHandle<tauri::Wry>>,
        path: String,
        cashbook: CashBook,
    ) -> Result<(), String> {
        // Serialize here rather than in the frontend so Android files stay byte-identical to
        // the desktop `write_cashbook` output and there is a single source of truth for the
        // on-disk format.
        let json = serde_json::to_string_pretty(&cashbook)
            .map_err(|e| format!("Failed to serialize: {}", e))?;
        handle(state)?
            .run_mobile_plugin::<serde_json::Value>(
                "writeDocument",
                serde_json::json!({ "uri": path, "content": json }),
            )
            .map(|_| ())
            .map_err(|e| format!("{}", e))
    }

    /// Opens the Android system print dialog for pre-rendered cashbook HTML.
    ///
    /// Android WebView has no `window.print()`, so the frontend cannot print by itself. The
    /// markup is produced by the shared print template in `src/utils/print.ts` and handed to
    /// `PrintManager` here, which is the only route to the real print UI (and "Save as PDF").
    #[tauri::command]
    pub fn print_cashbook(
        state: tauri::State<'_, DocHandle<tauri::Wry>>,
        html: String,
        job_name: String,
    ) -> Result<(), String> {
        handle(state)?
            .run_mobile_plugin::<serde_json::Value>(
                "printCashbook",
                serde_json::json!({ "html": html, "jobName": job_name }),
            )
            .map(|_| ())
            .map_err(|e| format!("{}", e))
    }
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn focus_main_window(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.unminimize();
        let _ = win.set_focus();
    }
}

#[tauri::command]
fn take_startup_file(state: tauri::State<'_, Mutex<Option<String>>>) -> Option<String> {
    state.lock().ok().and_then(|mut g| g.take())
}

/// Force-close the app. `WebviewWindow::destroy()` is a no-op on Android, so
/// the frontend routes File → Exit here on that platform.
#[tauri::command]
fn exit_app() {
    std::process::exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let startup_file = cashbook_from_args(&std::env::args().collect::<Vec<_>>());

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    let builder = tauri::Builder::default()
        .manage(Mutex::new(startup_file))
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            focus_main_window(app);
            if let Some(path) = cashbook_from_args(&argv) {
                let _ = app.emit("open-file", path);
            }
        }));

    #[cfg(any(target_os = "android", target_os = "ios"))]
    let mut builder = tauri::Builder::default().manage(Mutex::new(startup_file));

    // Android-only: fast file picker that also requests a write grant, plus a write path
    // that reports failures instead of hanging. See the `doc` module and DR-46.
    #[cfg(target_os = "android")]
    {
        builder = builder.plugin(doc::init());
    }

    builder
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            read_cashbook,
            write_cashbook,
            get_save_path,
            write_file,
            read_file,
            take_startup_file,
            exit_app,
            // Android-only passthrough to the `doc` plugin's print command. It is harmless on
            // desktop because the command does not exist there and is never invoked; the
            // frontend only calls it when it detects the Android runtime.
            #[cfg(target_os = "android")]
            doc::print_cashbook,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A cashbook with every field the TypeScript type can produce. This is the contract: if
    /// someone adds a field to `src/types/index.ts` they must extend this fixture too, and
    /// `round_trip_preserves_every_field` will tell them when they have not.
    fn full_cashbook_json() -> serde_json::Value {
        serde_json::json!({
            "id": "cb-1",
            "name": "Household",
            "description": "Household",
            "currency": "₹",
            "beginningBalance": 100.5,
            "createdAt": "2026-01-01T00:00:00.000Z",
            "passwordHash": "h",
            "passwordSalt": "s",
            "type": "standard",
            "transactions": [{
                "id": "t-1",
                "date": "2026-01-02",
                "type": "expenses",
                "category": "expenses",
                "subcategory": "Rent",
                "description": "January rent",
                "amount": 1200.0,
                "orderOfEntry": 1,
                "customData": { "col-1": "Recurring" }
            }],
            "categories": [
                { "id": "c-1", "name": "incomes", "capitalizedName": "Incomes" },
                { "id": "c-2", "name": "expenses", "capitalizedName": "Expenses" }
            ],
            // The field that was silently dropped on every save from v1.14.0 to v1.14.1.
            "subcategories": [
                { "id": "s-1", "name": "Rent", "capitalizedName": "Rent" },
                { "id": "s-2", "name": "Unused", "capitalizedName": "Unused" }
            ],
            "regularPayments": [],
            "settings": {
                "colorScheme": "system",
                "dateFormat": "dd-mm-yyyy",
                "amountFormat": "standard",
                "recordNumbering": "sequential",
                "visibleColumns": ["date", "category"],
                "splitIncomeExpenseColumns": true,
                "sortBy": "date",
                "sortDirection": "asc",
                "customColumns": []
            }
        })
    }

    /// The core regression: read a cashbook, write it back, get the identical document.
    /// `subcategories` used to fail this silently - it deserialized into a struct that had
    /// nowhere to put it, and serialized back without it.
    #[test]
    fn round_trip_preserves_every_field() {
        let original = full_cashbook_json();
        let cashbook: CashBook = serde_json::from_value(original.clone()).expect("deserialize");
        let written = serde_json::to_value(&cashbook).expect("serialize");
        assert_eq!(original, written, "cashbook changed during a read/write round trip");
    }

    /// A sub-category with no transactions is the case data loss hid behind: name-based
    /// re-seeding on load regenerates it, so only its id and capitalised name were ever at
    /// risk. Assert the ids survive so that regression cannot come back quietly.
    #[test]
    fn subcategories_keep_their_identity() {
        let original = full_cashbook_json();
        let cashbook: CashBook = serde_json::from_value(original).expect("deserialize");
        let written = serde_json::to_value(&cashbook).expect("serialize");
        let subs = written["subcategories"].as_array().expect("subcategories array");
        assert_eq!(subs.len(), 2);
        assert_eq!(subs[1]["id"], "s-2");
        assert_eq!(subs[1]["capitalizedName"], "Unused");
    }

    /// Files written before custom columns existed have no `customData` key. They must load,
    /// and the value they gain must be an empty object - not `null`, which `Value::default()`
    /// would have produced and which the TypeScript `Record<string, string>` does not allow.
    #[test]
    fn missing_custom_data_defaults_to_empty_object() {
        let mut original = full_cashbook_json();
        original["transactions"][0]
            .as_object_mut()
            .unwrap()
            .remove("customData");

        let cashbook: CashBook = serde_json::from_value(original.clone()).expect("deserialize");
        assert_eq!(cashbook.transactions[0].custom_data, serde_json::json!({}));

        let written = serde_json::to_value(&cashbook).expect("serialize");
        assert_eq!(
            written["transactions"][0]["customData"],
            serde_json::json!({}),
            "customData must be written as an object, never omitted and never null"
        );
    }

    /// Cashbooks saved by v1.14.0/v1.14.1 have no `subcategories` key at all, because the Rust
    /// struct never wrote one. They must still open.
    #[test]
    fn cashbook_without_subcategories_still_loads() {
        let mut original = full_cashbook_json();
        original
            .as_object_mut()
            .unwrap()
            .remove("subcategories");

        let cashbook: CashBook = serde_json::from_value(original).expect("deserialize");
        assert!(cashbook.subcategories.is_empty());
    }

    /// The tripwire. Before this, a field added to the TypeScript type and forgotten here was
    /// destroyed on the next save with no error. Now it fails at load, which is loud and local.
    #[test]
    fn unknown_cashbook_field_is_rejected() {
        let mut original = full_cashbook_json();
        original["someFieldFromTheFuture"] = serde_json::json!("value");

        let err = serde_json::from_value::<CashBook>(original).expect_err("must reject");
        assert!(
            err.to_string().contains("someFieldFromTheFuture"),
            "error should name the offending field, got: {err}"
        );
    }

    #[test]
    fn unknown_transaction_field_is_rejected() {
        let mut original = full_cashbook_json();
        original["transactions"][0]["someFieldFromTheFuture"] = serde_json::json!(1);

        let err = serde_json::from_value::<CashBook>(original).expect_err("must reject");
        assert!(
            err.to_string().contains("someFieldFromTheFuture"),
            "error should name the offending field, got: {err}"
        );
    }

    /// Guards the mojibake that shipped in `cashbookStore.ts`: the rupee sign written as UTF-8
    /// bytes then re-encoded, which turned U+20B9 into the three characters `â‚¹`. Any cashbook
    /// the app writes should carry the real sign.
    #[test]
    fn rupee_currency_survives_the_boundary() {
        let cashbook: CashBook = serde_json::from_value(full_cashbook_json()).expect("deserialize");
        assert_eq!(cashbook.currency, "₹");
    }
}
