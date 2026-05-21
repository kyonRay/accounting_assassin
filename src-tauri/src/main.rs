#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use accounting_assassin::commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::env::check_command_exists,
            commands::fs::read_user_file,
            commands::checker::run_bundled_checker,
            commands::shell::open_terminal_at,
            commands::env_init::initialize_real_env,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
