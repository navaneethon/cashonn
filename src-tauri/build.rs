fn main() {
    tauri_build::try_build(
        tauri_build::Attributes::new().plugin(
            "doc",
            tauri_build::InlinedPlugin::new()
                .commands(&[
                    "open_document",
                    "get_pick_result",
                    "ping",
                    "write_cashbook_document",
                ])
                .default_permission(tauri_build::DefaultPermissionRule::AllowAllCommands),
        ),
    )
    .expect("failed to run tauri-build");
}
