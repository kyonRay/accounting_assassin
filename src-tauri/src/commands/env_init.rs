//! `initialize_real_env` — one-time workspace bootstrap.
//!
//! Creates `~/accounting-learner/` and a README, then runs a health-check
//! for all whitelisted binaries. Called once when the user transitions from
//! sandbox mode to real-env mode (Ch 5+).

use serde::Serialize;

use super::env::{check_command_exists, AllowedCommand};
use crate::safety;

/// Report returned to the frontend after workspace initialization.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InitReport {
    /// Absolute path to the created/verified workspace directory.
    pub workspace: String,
    /// Commands that were found on PATH.
    pub present: Vec<AllowedCommand>,
    /// Commands that were not found on PATH.
    pub missing: Vec<AllowedCommand>,
    /// Whether the `aa-ocr` binary was successfully symlinked into
    /// `~/accounting-learner/.bin/aa-ocr`.
    pub aa_ocr_installed: bool,
}

/// README content written into the workspace on first initialization.
/// Written in Chinese per design spec (the target audience is Chinese-speaking).
const WORKSPACE_README: &str = r#"# 我的会计 AI 作业本

这是「记账杀手」 App 帮你管理的工作目录。所有课程练习产物都在这里。

不要把不相关的文件放进来 —— App 的「卡住按钮」诊断报告会扫描这个目录,只应该看到课程相关内容。
"#;

/// Initialize the real-env workspace.
///
/// Steps:
/// 1. Create `~/accounting-learner/` if it doesn't exist.
/// 2. Write a README only if one doesn't already exist (preserves user edits).
/// 3. Health-check all six `AllowedCommand` variants and report present/missing.
/// 4. Symlink the `aa-ocr` binary into `~/accounting-learner/.bin/aa-ocr`.
#[tauri::command]
pub async fn initialize_real_env() -> Result<InitReport, String> {
    // Resolve the uncanonicalised base path to create the directory.
    // We cannot call safety::workspace_root() yet because it canonicalizes,
    // and the directory may not exist until after create_dir_all.
    let home = dirs::home_dir()
        .ok_or_else(|| "home directory is unresolvable".to_string())?;
    let workspace_uncanonicalized = home.join("accounting-learner");

    // 1. Create workspace directory (idempotent).
    std::fs::create_dir_all(&workspace_uncanonicalized)
        .map_err(|e| format!("failed to create workspace directory: {}", e))?;

    // Now that the directory exists we can get the canonical path via the
    // shared path_guard helper — single source of truth, no duplication.
    let workspace = safety::workspace_root()
        .map_err(|e| format!("workspace root error: {}", e))?;

    // 2. Write README only on first creation (never overwrite user content).
    let readme_path = workspace.join("README.md");
    if !readme_path.exists() {
        std::fs::write(&readme_path, WORKSPACE_README)
            .map_err(|e| format!("failed to write workspace README: {}", e))?;
    }

    // 3. Health-check all allowed commands.
    let all_commands = [
        AllowedCommand::Python3,
        AllowedCommand::Claude,
        AllowedCommand::Brew,
        AllowedCommand::Git,
        AllowedCommand::Codex,
        AllowedCommand::Cursor,
    ];

    let mut present = Vec::new();
    let mut missing = Vec::new();

    for cmd in all_commands {
        match check_command_exists(cmd.clone()).await {
            Ok(check) if check.found => present.push(cmd),
            _ => missing.push(cmd),
        }
    }

    // 4. Symlink the aa-ocr binary.
    let source = resolve_aa_ocr_binary();
    let aa_ocr_installed = install_aa_ocr_symlink(&workspace, source.as_deref());

    Ok(InitReport {
        workspace: workspace.display().to_string(),
        present,
        missing,
        aa_ocr_installed,
    })
}

/// Symlink the bundled `aa-ocr` binary into `~/accounting-learner/.bin/aa-ocr`.
///
/// `source` is the path to the binary to link.  Pass `None` to indicate the
/// binary could not be resolved (the function will return `false` in that case).
///
/// Returns `true` if the symlink was created / verified successfully,
/// `false` if the source binary is `None` or the symlink operation failed (non-fatal).
///
/// Behaviour:
/// - Creates `~/accounting-learner/.bin/` if missing.
/// - If the symlink exists and already points to the correct target → no-op (idempotent).
/// - If the symlink exists but points elsewhere → replace.
/// - If `source` is `None` → log warning, return false.
///
/// Taking the source path as an argument makes the function testable without
/// relying on the current executable layout.
fn install_aa_ocr_symlink(workspace: &std::path::Path, source: Option<&std::path::Path>) -> bool {
    let bin_dir = workspace.join(".bin");
    if let Err(e) = std::fs::create_dir_all(&bin_dir) {
        eprintln!("aa-ocr symlink: failed to create .bin dir: {}", e);
        return false;
    }

    let source = match source {
        Some(p) => p,
        None => {
            eprintln!(
                "aa-ocr symlink: binary not found — in dev mode run `cargo build --bin aa-ocr` first"
            );
            return false;
        }
    };

    let link = bin_dir.join("aa-ocr");

    // Check if the symlink already points to the right place (idempotent).
    if link.exists() || std::fs::symlink_metadata(&link).is_ok() {
        if let Ok(current_target) = std::fs::read_link(&link) {
            if current_target == source {
                return true; // Already correct — nothing to do.
            }
        }
        // Exists but wrong target (or not a symlink) — remove it.
        if let Err(e) = std::fs::remove_file(&link) {
            eprintln!("aa-ocr symlink: failed to remove stale link: {}", e);
            return false;
        }
    }

    // Create the symlink.
    match std::os::unix::fs::symlink(source, &link) {
        Ok(()) => true,
        Err(e) => {
            eprintln!("aa-ocr symlink: failed to create symlink {:?} → {:?}: {}", link, source, e);
            false
        }
    }
}

/// Resolve the absolute path to the `aa-ocr` binary.
///
/// - In debug / dev builds (`cfg!(debug_assertions)`): look for
///   `<workspace_root>/target/debug/aa-ocr` relative to the Cargo manifest.
/// - In release builds: look adjacent to the running executable.
///
/// Returns `None` if the binary cannot be found.
fn resolve_aa_ocr_binary() -> Option<std::path::PathBuf> {
    if cfg!(debug_assertions) {
        // Dev path: the Cargo workspace root is two levels up from src-tauri/
        // (this binary lives in src-tauri/target/debug/accounting-assassin, so
        // the workspace target/ is at the same level as src-tauri/).
        let exe = std::env::current_exe().ok()?;
        // Typical dev layout: .../target/debug/accounting-assassin
        // Walk up to find target/debug/ then look for aa-ocr there.
        let target_debug = exe.parent()?; // .../target/debug
        let candidate = target_debug.join("aa-ocr");
        if candidate.exists() {
            return Some(candidate);
        }
        None
    } else {
        // Release / bundled: binary is expected to be bundled alongside the app.
        // Tauri bundles resources into Contents/Resources/ on macOS.
        let exe = std::env::current_exe().ok()?;
        // macOS .app: .../MacOS/accounting-assassin
        // Resources: .../Resources/aa-ocr
        let resources = exe.parent()?.parent()?.join("Resources");
        let candidate = resources.join("aa-ocr");
        if candidate.exists() {
            return Some(candidate);
        }
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_util::HOME_LOCK;
    use std::fs;
    use tempfile::TempDir;

    fn with_fake_home<F: FnOnce(&TempDir)>(f: F) {
        let _guard = HOME_LOCK.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
        let tmp = TempDir::new().unwrap();
        let workspace = tmp.path().join("accounting-learner");
        fs::create_dir_all(&workspace).unwrap();
        let old_home = std::env::var("HOME").ok();
        unsafe {
            std::env::set_var("HOME", tmp.path());
        }
        f(&tmp);
        unsafe {
            match old_home {
                Some(h) => std::env::set_var("HOME", h),
                None => std::env::remove_var("HOME"),
            }
        }
    }

    /// Real idempotency test: `install_aa_ocr_symlink` with an explicit source path.
    ///
    /// 1. Creates a fake binary in tempdir.
    /// 2. Calls `install_aa_ocr_symlink` with that source → asserts `true` (created).
    /// 3. Calls `install_aa_ocr_symlink` again with the same source → asserts `true` (idempotent).
    /// 4. Verifies the symlink still points to the expected target.
    #[test]
    fn symlink_creation_idempotent() {
        with_fake_home(|tmp| {
            let workspace = tmp.path().join("accounting-learner");
            let fake_bin = tmp.path().join("aa-ocr-fake");
            fs::write(&fake_bin, "#!/bin/sh\necho ok").unwrap();

            // First call: should create the symlink and return true.
            let result1 = install_aa_ocr_symlink(&workspace, Some(&fake_bin));
            assert!(result1, "first install_aa_ocr_symlink call should return true");

            let link = workspace.join(".bin").join("aa-ocr");
            assert!(
                std::fs::symlink_metadata(&link).is_ok(),
                "symlink should exist after first call"
            );
            assert_eq!(
                std::fs::read_link(&link).unwrap(),
                fake_bin,
                "symlink should point to fake_bin"
            );

            // Second call with same source: should be a no-op and return true.
            let result2 = install_aa_ocr_symlink(&workspace, Some(&fake_bin));
            assert!(result2, "second install_aa_ocr_symlink call should also return true (idempotent)");

            // Verify the symlink still points to the correct target after the no-op.
            assert_eq!(
                std::fs::read_link(&link).unwrap(),
                fake_bin,
                "symlink should still point to fake_bin after idempotent call"
            );
        });
    }

    /// Symlink replacement: stale symlink pointing to a different target is replaced.
    #[test]
    fn symlink_stale_is_replaced() {
        with_fake_home(|tmp| {
            let workspace = tmp.path().join("accounting-learner");
            let old_bin = tmp.path().join("old-aa-ocr");
            let new_bin = tmp.path().join("new-aa-ocr");
            fs::write(&old_bin, "#!/bin/sh").unwrap();
            fs::write(&new_bin, "#!/bin/sh\necho new").unwrap();

            // Create symlink pointing to old_bin.
            let result1 = install_aa_ocr_symlink(&workspace, Some(&old_bin));
            assert!(result1, "initial symlink install should succeed");

            let link = workspace.join(".bin").join("aa-ocr");
            assert_eq!(std::fs::read_link(&link).unwrap(), old_bin);

            // Call again with new_bin — should replace the stale symlink.
            let result2 = install_aa_ocr_symlink(&workspace, Some(&new_bin));
            assert!(result2, "replacement symlink install should succeed");
            assert_eq!(
                std::fs::read_link(&link).unwrap(),
                new_bin,
                "symlink should now point to new_bin"
            );
        });
    }

    /// Missing binary: `install_aa_ocr_symlink` with `source = None` returns `false`.
    ///
    /// The `.bin/` directory should still be created (so the workspace layout is
    /// consistent regardless of binary availability), but the function returns false.
    #[test]
    fn missing_binary_returns_false() {
        with_fake_home(|tmp| {
            let workspace = tmp.path().join("accounting-learner");

            // Pass None to simulate "binary not found".
            let result = install_aa_ocr_symlink(&workspace, None);
            assert!(!result, "install_aa_ocr_symlink with None source should return false");

            // The .bin dir should still be created.
            let bin_dir = workspace.join(".bin");
            assert!(bin_dir.exists(), ".bin dir should be created even when source is None");

            // No symlink should have been created.
            let link = bin_dir.join("aa-ocr");
            assert!(
                !link.exists() && std::fs::symlink_metadata(&link).is_err(),
                "no symlink should exist when source is None"
            );
        });
    }
}
