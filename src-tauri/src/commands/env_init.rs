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
pub struct InitReport {
    /// Absolute path to the created/verified workspace directory.
    pub workspace: String,
    /// Commands that were found on PATH.
    pub present: Vec<AllowedCommand>,
    /// Commands that were not found on PATH.
    pub missing: Vec<AllowedCommand>,
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

    Ok(InitReport {
        workspace: workspace.display().to_string(),
        present,
        missing,
    })
}
