//! `read_user_file` — workspace-bounded file read.
//!
//! All file access goes through the path guard before touching the filesystem.
//! Symlink escapes and `../` traversal are caught by `check_inside_workspace`.

use std::path::PathBuf;

use crate::safety;
use crate::safety::PathGuardError;

/// Read a file from the user's workspace (`~/accounting-learner/<rel_path>`).
///
/// Rejects any path that is:
/// - absolute
/// - resolves outside `~/accounting-learner/` after canonicalization
/// - a symlink pointing outside the workspace
///
/// Security note: path violations are logged server-side because they may indicate
/// a misconfigured chapter or (in adversarial contexts) a path traversal attempt.
#[tauri::command]
pub async fn read_user_file(rel_path: PathBuf) -> Result<String, String> {
    let canonical = safety::check_inside_workspace(&rel_path).map_err(|e| {
        match &e {
            PathGuardError::OutsideWorkspace | PathGuardError::AbsolutePath => {
                // Security boundary violated — log server-side.
                eprintln!(
                    "[SECURITY] read_user_file: 路径越界 — rejected rel_path={:?}: {}",
                    rel_path, e
                );
                format!("路径越界:不允许访问 {:?}", rel_path)
            }
            PathGuardError::NotFound(p) => {
                format!("file not found: {:?}", p)
            }
            _ => format!("path error: {}", e),
        }
    })?;

    std::fs::read_to_string(&canonical)
        .map_err(|e| format!("failed to read {:?}: {}", canonical, e))
}
