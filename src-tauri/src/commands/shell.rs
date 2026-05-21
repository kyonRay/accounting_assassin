//! `open_terminal_at` — opens macOS Terminal.app at a workspace-relative path.
//!
//! Security contract (DO NOT regress):
//! - Accepts only a *relative* path; absolute paths are rejected by the path guard.
//! - Uses `open -a Terminal <path>` — this opens a *new Terminal window* positioned
//!   at the given directory. It does NOT execute any commands or scripts.
//! - `tauri-plugin-shell` is intentionally NOT used — it adds attack surface.
//! - No `do script` AppleScript — that would execute arbitrary code in the terminal.
//! - No arbitrary command string is accepted from the caller. Ever.

use std::path::PathBuf;
use std::process::Command;

use crate::safety;

/// Open macOS Terminal.app at a workspace-relative directory.
///
/// The directory must already exist; this command does not create directories
/// (use `initialize_real_env` for that).
///
/// Implementation: `open -a Terminal <canonical_path>`
/// This causes Terminal to open a new window with that directory as CWD.
/// No commands are executed in the new terminal session.
#[tauri::command]
pub async fn open_terminal_at(rel_path: PathBuf) -> Result<(), String> {
    let canonical = safety::check_inside_workspace(&rel_path).map_err(|e| {
        format!("cannot open terminal: {}", e)
    })?;

    // Verify the resolved path is a directory that exists.
    if !canonical.is_dir() {
        return Err(format!(
            "cannot open terminal: {:?} is not a directory or does not exist",
            canonical
        ));
    }

    // `open -a Terminal <path>` — opens a new Terminal window at <path>.
    // This is the ONLY way we open a terminal. No AppleScript, no `do script`,
    // no command string from the caller is ever executed.
    let status = Command::new("open")
        .arg("-a")
        .arg("Terminal")
        .arg(&canonical)
        .status()
        .map_err(|e| format!("failed to launch Terminal.app: {}", e))?;

    if status.success() {
        Ok(())
    } else {
        Err(format!(
            "Terminal.app exited with non-zero status: {:?}",
            status.code()
        ))
    }
}
