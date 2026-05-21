//! Path guard: canonicalize + workspace prefix-check for every user-supplied path.
//!
//! All Tauri commands that accept a relative path MUST call `check_inside_workspace`
//! before doing anything with the path. This is the single enforcement point for the
//! spec § 4.3 invariant: "路径全部规范化 + prefix 校验".

use std::path::{Path, PathBuf};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum PathGuardError {
    /// The resolved path escapes `~/accounting-learner/`. Security boundary violated.
    #[error("路径越界: resolved path is outside the workspace boundary")]
    OutsideWorkspace,

    /// The path was provided as absolute. Only relative workspace paths are accepted.
    #[error("absolute paths are not accepted; provide a path relative to the workspace")]
    AbsolutePath,

    /// The target path does not exist on disk (canonicalize failed).
    #[error("path not found: {0}")]
    NotFound(PathBuf),

    /// The home directory could not be resolved. Fatal configuration error.
    #[error("home directory is unresolvable; cannot determine workspace root")]
    HomeUnresolvable,

    /// Underlying IO error during canonicalization or other fs operations.
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

/// Returns the canonicalized workspace root (`~/accounting-learner/`).
///
/// Panics at runtime only if the home directory cannot be resolved (should never
/// happen in a normal macOS process environment).
pub fn workspace_root() -> Result<PathBuf, PathGuardError> {
    let home = dirs::home_dir().ok_or(PathGuardError::HomeUnresolvable)?;
    let root = home.join("accounting-learner");
    Ok(root)
}

/// Validates that `rel` is a relative path that resolves inside the workspace.
///
/// Steps:
/// 1. Reject absolute paths immediately.
/// 2. Join workspace root + `rel`.
/// 3. Canonicalize (follows symlinks). If the target doesn't exist, return `NotFound`.
/// 4. Verify the canonical path starts_with the canonical workspace root.
///    Rejects `../` escapes AND symlinks that point outside the workspace.
/// 5. Return the canonical path on success.
pub fn check_inside_workspace(rel: &Path) -> Result<PathBuf, PathGuardError> {
    if rel.is_absolute() {
        return Err(PathGuardError::AbsolutePath);
    }

    let root = workspace_root()?;
    let joined = root.join(rel);

    // Canonicalize the workspace root separately so we can compare canonical forms.
    // If the workspace root doesn't exist yet, we can't canonicalize it — but that
    // means the file definitely doesn't exist either, so we return NotFound.
    let canonical_root = match root.canonicalize() {
        Ok(p) => p,
        Err(_) => {
            // Workspace root doesn't exist yet; path can't be inside it.
            return Err(PathGuardError::NotFound(joined));
        }
    };

    let canonical_path = match joined.canonicalize() {
        Ok(p) => p,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            return Err(PathGuardError::NotFound(joined));
        }
        Err(e) => return Err(PathGuardError::Io(e)),
    };

    if !canonical_path.starts_with(&canonical_root) {
        return Err(PathGuardError::OutsideWorkspace);
    }

    Ok(canonical_path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::os::unix::fs::symlink;
    use tempfile::TempDir;

    /// Override the HOME environment variable and run `check_inside_workspace`
    /// in a controlled temp directory.
    ///
    /// Because `dirs::home_dir()` reads $HOME on Unix, we can redirect it per-test.
    /// Tests must NOT run in parallel with the HOME override (each test gets its own
    /// TempDir and unique HOME path, but std::env::set_var is process-global — use
    /// the serial approach: set HOME, call, then restore).
    ///
    /// We serialize these tests via a mutex to avoid races.
    use std::sync::Mutex;
    static HOME_LOCK: Mutex<()> = Mutex::new(());

    fn with_fake_home<F: FnOnce(&TempDir)>(f: F) {
        let _guard = HOME_LOCK.lock().unwrap();
        let tmp = TempDir::new().unwrap();
        let workspace = tmp.path().join("accounting-learner");
        fs::create_dir_all(&workspace).unwrap();
        let old_home = std::env::var("HOME").ok();
        // Safety: single-threaded thanks to the mutex
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

    // 1. Happy path — a real file inside the workspace returns Ok.
    #[test]
    fn happy_path_inside_workspace() {
        with_fake_home(|tmp| {
            let ws = tmp.path().join("accounting-learner");
            let dir = ws.join("invoices");
            fs::create_dir_all(&dir).unwrap();
            let file = dir.join("2026-04.csv");
            fs::write(&file, "date,amount").unwrap();

            let result = check_inside_workspace(Path::new("invoices/2026-04.csv"));
            assert!(result.is_ok(), "expected Ok, got {:?}", result);
            let canonical = result.unwrap();
            let canonical_ws = ws.canonicalize().unwrap();
            assert!(canonical.starts_with(canonical_ws));
        });
    }

    // 2. Absolute path is rejected immediately with AbsolutePath.
    #[test]
    fn absolute_path_rejected() {
        with_fake_home(|_tmp| {
            let result = check_inside_workspace(Path::new("/etc/passwd"));
            assert!(
                matches!(result, Err(PathGuardError::AbsolutePath)),
                "expected AbsolutePath, got {:?}",
                result
            );
        });
    }

    // 3. Parent-escape `../../etc/passwd` is rejected with OutsideWorkspace.
    #[test]
    fn dotdot_escape_rejected() {
        with_fake_home(|tmp| {
            // Create the target so canonicalize succeeds and we get the prefix check,
            // not a NotFound. /etc/passwd exists on macOS; we just need a real path.
            // We create a real file at the escape destination inside the tmp tree.
            let outside = tmp.path().join("outside.txt");
            fs::write(&outside, "secret").unwrap();

            // ../../outside.txt from workspace root: workspace is tmp/accounting-learner,
            // so ../../ goes to tmp's parent. Let's use a known-outside path instead.
            // The workspace is at tmp/accounting-learner/; ../outside.txt is tmp/outside.txt.
            let result = check_inside_workspace(Path::new("../outside.txt"));
            match &result {
                Err(PathGuardError::OutsideWorkspace) => {}
                Err(PathGuardError::NotFound(_)) => {
                    // Also acceptable: the escape resolves outside the workspace and
                    // canonicalize might fail depending on OS — either rejection is correct.
                }
                other => panic!("expected OutsideWorkspace or NotFound, got {:?}", other),
            }
        });
    }

    // 4. Symlink inside workspace pointing outside is rejected with OutsideWorkspace.
    #[test]
    fn symlink_escape_rejected() {
        with_fake_home(|tmp| {
            let ws = tmp.path().join("accounting-learner");

            // Create a real file outside the workspace.
            let outside_file = tmp.path().join("secret.txt");
            fs::write(&outside_file, "top secret").unwrap();

            // Create a symlink inside the workspace that points to it.
            let evil_link = ws.join("evil-link");
            symlink(&outside_file, &evil_link).unwrap();

            let result = check_inside_workspace(Path::new("evil-link"));
            assert!(
                matches!(result, Err(PathGuardError::OutsideWorkspace)),
                "expected OutsideWorkspace (symlink escape), got {:?}",
                result
            );
        });
    }

    // 5. Non-existent path returns NotFound (not OutsideWorkspace).
    #[test]
    fn nonexistent_path_returns_not_found() {
        with_fake_home(|_tmp| {
            let result = check_inside_workspace(Path::new("does-not-exist/file.txt"));
            assert!(
                matches!(result, Err(PathGuardError::NotFound(_))),
                "expected NotFound, got {:?}",
                result
            );
        });
    }
}
