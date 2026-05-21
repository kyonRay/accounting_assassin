//! Diagnostic report collector for the StuckButton ("我卡住了") feature.
//!
//! # Allowlist (exhaustive)
//! The report contains ONLY these fields — nothing else:
//! - `app_version`           : cargo package version (compile-time constant, no user data)
//! - `os_version`            : macOS product version from `sw_vers` (system info only)
//! - `arch`                  : CPU architecture from `std::env::consts::ARCH` (no user data)
//! - `workspace_exists`      : bool — whether `~/accounting-learner/` directory exists
//! - `workspace_top_level`   : array of WorkspaceEntry (filename/dirname + kind + size_bytes only)
//!                             NO full paths, NO file content
//! - `tools`                 : array of ToolReport (AllowedCommand enum value, found bool, version string)
//!                             NO `path` field (path leaks `/Users/<realname>/`)
//! - `timestamp_utc`         : ISO8601 of collection time (no user data)
//!
//! # Hard constraints (DO NOT RELAX)
//! - `WorkspaceEntry` has no `content` field — intentional.
//! - `ToolReport` has no `path` field — `which` output leaks the user's real name from their home dir.
//! - Only top-level entries are listed; no recursion into subdirectories.
//! - The workspace directory itself is referred to by existence only, never by full path.
//! - Files outside `~/accounting-learner/` are never listed, enumerated, or read.

use serde::Serialize;
use std::process::Command;

use crate::commands::env::{AllowedCommand, check_command_exists};

/// A single entry in the top-level workspace listing.
///
/// ALLOWLIST: name (filename/dirname only), kind (File/Directory), size_bytes (for files).
/// NO full paths. NO file content.
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceEntry {
    /// The file or directory name only — never a full path.
    pub name: String,
    /// Whether this entry is a file or a directory.
    pub kind: EntryKind,
    /// File size in bytes. `None` for directories.
    pub size_bytes: Option<u64>,
}

/// Discriminates file entries from directory entries in the workspace listing.
#[derive(Debug, Serialize, Clone, PartialEq, Eq)]
pub enum EntryKind {
    File,
    Directory,
}

/// Tool presence and version result for one `AllowedCommand`.
///
/// ALLOWLIST: cmd (enum variant), found (bool), version (optional string).
/// NO `path` field — this is intentional; the path from `which` exposes the real home dir name.
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ToolReport {
    pub cmd: AllowedCommand,
    pub found: bool,
    pub version: Option<String>,
}

/// The complete diagnostic report returned by `collect_diagnostics`.
///
/// See module-level doc for the full allowlist.
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DiagnosticReport {
    pub app_version: String,
    pub os_version: String,
    pub arch: String,
    pub workspace_exists: bool,
    pub workspace_top_level: Vec<WorkspaceEntry>,
    pub tools: Vec<ToolReport>,
    pub timestamp_utc: String,
}

/// Read the macOS product version via `sw_vers -productVersion`.
/// Returns a fallback string on any error (never panics).
fn read_os_version() -> String {
    Command::new("sw_vers")
        .arg("-productVersion")
        .output()
        .ok()
        .and_then(|out| {
            if out.status.success() {
                Some(String::from_utf8_lossy(&out.stdout).trim().to_string())
            } else {
                None
            }
        })
        .unwrap_or_else(|| "unknown".to_string())
}

/// List the top-level contents of the workspace.
///
/// Returns (exists, entries) where entries is empty if the directory doesn't exist.
/// Only reads directory entry metadata (name, kind, size); NEVER reads file content.
fn list_workspace_top_level() -> (bool, Vec<WorkspaceEntry>) {
    let home = match dirs::home_dir() {
        Some(h) => h,
        None => return (false, vec![]),
    };
    let workspace = home.join("accounting-learner");

    if !workspace.exists() {
        return (false, vec![]);
    }

    let read_dir = match std::fs::read_dir(&workspace) {
        Ok(rd) => rd,
        Err(_) => return (true, vec![]),
    };

    let mut entries: Vec<WorkspaceEntry> = Vec::new();

    for entry_result in read_dir {
        let entry = match entry_result {
            Ok(e) => e,
            Err(_) => continue,
        };

        let file_name = entry.file_name();
        let name = file_name.to_string_lossy().to_string();

        // Skip hidden dot-entries like . and ..
        if name == "." || name == ".." {
            continue;
        }

        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        let kind = if metadata.is_dir() {
            EntryKind::Directory
        } else {
            EntryKind::File
        };

        let size_bytes = if kind == EntryKind::File {
            Some(metadata.len())
        } else {
            None
        };

        entries.push(WorkspaceEntry { name, kind, size_bytes });
    }

    // Sort for deterministic output (alphabetical by name)
    entries.sort_by(|a, b| a.name.cmp(&b.name));

    (true, entries)
}

/// Collect a version report for a single `AllowedCommand` without leaking its path.
///
/// Delegates to `check_command_exists` and discards the `path` field.
async fn probe_tool(cmd: AllowedCommand) -> ToolReport {
    match check_command_exists(cmd.clone()).await {
        Ok(check) => ToolReport {
            cmd,
            found: check.found,
            version: check.version,
            // Intentionally NOT copying check.path — see module doc.
        },
        Err(_) => ToolReport {
            cmd,
            found: false,
            version: None,
        },
    }
}

/// ISO8601 UTC timestamp, second precision. Uses std only (no chrono).
fn utc_timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    // Manual conversion: secs since epoch → YYYY-MM-DDTHH:MM:SSZ
    // Using a simple epoch-to-datetime algorithm (handles dates up to ~year 9999).
    let s = secs;
    let sec = s % 60;
    let min = (s / 60) % 60;
    let hour = (s / 3600) % 24;
    let days = s / 86400;

    // Days since 1970-01-01 → year, month, day
    let (year, month, day) = days_to_ymd(days);

    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        year, month, day, hour, min, sec
    )
}

/// Convert days since 1970-01-01 to (year, month, day). Handles leap years.
fn days_to_ymd(mut days: u64) -> (u64, u64, u64) {
    let mut year = 1970u64;
    loop {
        let days_in_year = if is_leap(year) { 366 } else { 365 };
        if days < days_in_year {
            break;
        }
        days -= days_in_year;
        year += 1;
    }
    let leap = is_leap(year);
    let month_days: &[u64] = if leap {
        &[31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        &[31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };
    let mut month = 0u64;
    for &md in month_days {
        if days < md {
            break;
        }
        days -= md;
        month += 1;
    }
    (year, month + 1, days + 1)
}

fn is_leap(year: u64) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}

/// Collect the full diagnostic report.
///
/// This is a `#[tauri::command]` — it must be registered in `main.rs`.
///
/// # Allowlist enforcement
/// This function hardcodes every field. It accepts no caller parameters.
/// The `WorkspaceEntry` struct has no `content` field.
/// The `ToolReport` struct has no `path` field.
#[tauri::command]
pub async fn collect_diagnostics() -> Result<DiagnosticReport, String> {
    let app_version = env!("CARGO_PKG_VERSION").to_string();
    let os_version = read_os_version();
    let arch = std::env::consts::ARCH.to_string();
    let timestamp_utc = utc_timestamp();

    let (workspace_exists, workspace_top_level) = list_workspace_top_level();

    let all_commands = [
        AllowedCommand::Python3,
        AllowedCommand::Claude,
        AllowedCommand::Brew,
        AllowedCommand::Git,
        AllowedCommand::Codex,
        AllowedCommand::Cursor,
    ];

    let mut tools = Vec::with_capacity(all_commands.len());
    for cmd in all_commands {
        tools.push(probe_tool(cmd).await);
    }

    Ok(DiagnosticReport {
        app_version,
        os_version,
        arch,
        workspace_exists,
        workspace_top_level,
        tools,
        timestamp_utc,
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::sync::Mutex;
    use tempfile::TempDir;

    /// Serialize HOME-override tests so they don't race.
    /// `dirs::home_dir()` reads $HOME on Unix; `std::env::set_var` is process-global.
    static HOME_LOCK: Mutex<()> = Mutex::new(());

    /// Helper: build a single-threaded tokio runtime for calling async functions
    /// from sync test contexts.
    fn rt() -> tokio::runtime::Runtime {
        tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("tokio runtime")
    }

    /// Override HOME, run an async closure, then restore HOME.
    fn with_home_override<F, Fut>(home_path: &std::path::Path, f: F)
    where
        F: FnOnce() -> Fut,
        Fut: std::future::Future<Output = ()>,
    {
        let old = std::env::var("HOME").ok();
        // SAFETY: single-threaded thanks to HOME_LOCK held by caller.
        unsafe { std::env::set_var("HOME", home_path) };
        rt().block_on(f());
        unsafe {
            match old {
                Some(h) => std::env::set_var("HOME", h),
                None => std::env::remove_var("HOME"),
            }
        }
    }

    // ── Test 1: snapshot — file names appear; NO file content in report ──────

    #[test]
    fn snapshot_workspace_names_present_no_content() {
        let _guard = HOME_LOCK.lock().unwrap_or_else(|p| p.into_inner());
        let tmp = TempDir::new().unwrap();
        let ws = tmp.path().join("accounting-learner");
        fs::create_dir_all(&ws).unwrap();
        fs::write(ws.join("README.md"), "# Secret financial data: $99999").unwrap();
        fs::write(ws.join("invoice.csv"), "vendor,amount\nAcme,1234.00").unwrap();
        fs::create_dir_all(ws.join("scripts")).unwrap();

        with_home_override(tmp.path(), || async {
            let report = collect_diagnostics().await.unwrap();

            assert!(report.workspace_exists, "workspace_exists should be true");

            let names: Vec<&str> = report
                .workspace_top_level
                .iter()
                .map(|e| e.name.as_str())
                .collect();
            assert!(names.contains(&"README.md"), "README.md should be listed: {:?}", names);
            assert!(names.contains(&"invoice.csv"), "invoice.csv should be listed: {:?}", names);
            assert!(names.contains(&"scripts"), "scripts dir should be listed: {:?}", names);

            // Serialize to JSON and verify file CONTENT is absent
            let json = serde_json::to_string(&report).unwrap();
            assert!(
                !json.contains("Secret financial data"),
                "file content must NOT appear in the report JSON"
            );
            assert!(
                !json.contains("vendor,amount"),
                "CSV content must NOT appear in the report JSON"
            );

            // Verify no `content` key anywhere
            assert!(
                !json.contains(r#""content""#),
                "JSON must not contain a 'content' field"
            );
        });
    }

    // ── Test 2: outside-workspace rejection ──────────────────────────────────

    #[test]
    fn outside_workspace_file_not_in_report() {
        let _guard = HOME_LOCK.lock().unwrap_or_else(|p| p.into_inner());
        let tmp = TempDir::new().unwrap();
        let ws = tmp.path().join("accounting-learner");
        fs::create_dir_all(&ws).unwrap();

        // Place a "secret" file OUTSIDE the workspace (sibling of accounting-learner)
        let secret = tmp.path().join("Documents").join("secret.txt");
        fs::create_dir_all(secret.parent().unwrap()).unwrap();
        fs::write(&secret, "TOP SECRET CREDENTIALS: pw=hunter2").unwrap();

        with_home_override(tmp.path(), || async {
            let report = collect_diagnostics().await.unwrap();
            let json = serde_json::to_string(&report).unwrap();

            // Neither the filename nor the content should appear
            assert!(
                !json.contains("secret.txt"),
                "filename outside workspace must NOT appear in report"
            );
            assert!(
                !json.contains("TOP SECRET"),
                "content outside workspace must NOT appear in report"
            );
            assert!(
                !json.contains("hunter2"),
                "credentials outside workspace must NOT appear in report"
            );
            assert!(
                !json.contains("Documents"),
                "outside directory name must NOT appear in report"
            );
        });
    }

    // ── Test 3: no workspace → does not panic, workspace_exists = false ──────

    #[test]
    fn no_workspace_does_not_panic() {
        let _guard = HOME_LOCK.lock().unwrap_or_else(|p| p.into_inner());
        let tmp = TempDir::new().unwrap();
        // Do NOT create accounting-learner/

        with_home_override(tmp.path(), || async {
            let result = collect_diagnostics().await;
            let report = result.expect("collect_diagnostics must not error when workspace is absent");
            assert!(
                !report.workspace_exists,
                "workspace_exists should be false when ~/accounting-learner/ doesn't exist"
            );
            assert!(
                report.workspace_top_level.is_empty(),
                "workspace_top_level should be empty when workspace doesn't exist"
            );
        });
    }

    // ── RAII helper: restores HOME on drop (panic-safe) ──────────────────────

    struct HomeGuard(Option<String>);
    impl Drop for HomeGuard {
        fn drop(&mut self) {
            // SAFETY: HOME_LOCK is held by the calling test (single-threaded writes).
            unsafe {
                match &self.0 {
                    Some(h) => std::env::set_var("HOME", h),
                    None => std::env::remove_var("HOME"),
                }
            }
        }
    }

    /// Override $HOME to `new` and return a guard that restores the old value on drop.
    /// The caller must hold `HOME_LOCK` for the duration of the guard's lifetime.
    fn override_home(new: &std::path::Path) -> HomeGuard {
        let old = std::env::var("HOME").ok();
        // SAFETY: HOME_LOCK is held by the calling test.
        unsafe { std::env::set_var("HOME", new) };
        HomeGuard(old)
    }

    // ── Test 4: EntryKind correctly distinguishes files from directories ──────

    #[test]
    fn entry_kind_file_vs_directory() {
        let _lock = HOME_LOCK.lock().unwrap_or_else(|p| p.into_inner());
        let tmp = TempDir::new().unwrap();
        let ws = tmp.path().join("accounting-learner");
        fs::create_dir_all(&ws).unwrap();
        fs::write(ws.join("a.txt"), "hello").unwrap();
        fs::create_dir_all(ws.join("subdir")).unwrap();

        // _home restores HOME on drop — panic-safe even if an assert fires below.
        let _home = override_home(tmp.path());

        let (exists, entries) = list_workspace_top_level();
        assert!(exists);

        let file_entry = entries.iter().find(|e| e.name == "a.txt").unwrap();
        assert_eq!(file_entry.kind, EntryKind::File);
        assert!(file_entry.size_bytes.is_some());

        let dir_entry = entries.iter().find(|e| e.name == "subdir").unwrap();
        assert_eq!(dir_entry.kind, EntryKind::Directory);
        assert!(dir_entry.size_bytes.is_none());
    }

    // ── Test 5: report JSON does not contain any "path" field ────────────────

    #[test]
    fn tool_report_has_no_path_field() {
        let _guard = HOME_LOCK.lock().unwrap_or_else(|p| p.into_inner());
        let tmp = TempDir::new().unwrap();
        let ws = tmp.path().join("accounting-learner");
        fs::create_dir_all(&ws).unwrap();

        with_home_override(tmp.path(), || async {
            let report = collect_diagnostics().await.unwrap();
            let json = serde_json::to_string(&report).unwrap();
            // The `path` key must not appear in the tools section
            // (WorkspaceEntry fields are "name", "kind", "sizeBytes" — also no "path")
            assert!(
                !json.contains(r#""path""#),
                "JSON must not contain a 'path' field anywhere (privacy leak): {}",
                &json[..json.len().min(400)]
            );
        });
    }
}
