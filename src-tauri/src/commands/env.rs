//! `check_command_exists` — enum-gated binary existence check.
//!
//! Security contract: the caller (React frontend) picks from a fixed enum of
//! known-safe binary names. There is NO way to check an arbitrary binary name
//! through this interface. Adding a new tool requires a code change and review.

use serde::{Deserialize, Serialize};
use std::process::Command;

/// The fixed set of binaries this app is allowed to probe.
///
/// Each variant maps to a single hard-coded binary name via `binary_name()`.
/// No string interpolation — the compiler enforces the closed set.
#[derive(Debug, Deserialize, Serialize, Clone, PartialEq, Eq)]
pub enum AllowedCommand {
    Python3,
    Claude,
    Brew,
    Git,
    Codex,
    Cursor,
}

impl AllowedCommand {
    /// Returns the fixed binary name for this command. Never accepts user input.
    pub fn binary_name(&self) -> &'static str {
        match self {
            AllowedCommand::Python3 => "python3",
            AllowedCommand::Claude => "claude",
            AllowedCommand::Brew => "brew",
            AllowedCommand::Git => "git",
            AllowedCommand::Codex => "codex",
            AllowedCommand::Cursor => "cursor",
        }
    }
}

/// Result returned to the frontend for each command existence check.
#[derive(Debug, Serialize)]
pub struct CommandCheck {
    pub found: bool,
    pub path: Option<String>,
    pub version: Option<String>,
}

/// Check whether a whitelisted command binary is installed and discoverable via PATH.
///
/// Implementation:
/// 1. Run `which <binary_name>` to locate the binary.
/// 2. If found, run `<binary> --version` and capture the first line of stdout.
#[tauri::command]
pub async fn check_command_exists(cmd: AllowedCommand) -> Result<CommandCheck, String> {
    let binary = cmd.binary_name();

    let which_output = Command::new("which")
        .arg(binary)
        .output()
        .map_err(|e| format!("failed to run `which {binary}`: {e}"))?;

    if !which_output.status.success() {
        return Ok(CommandCheck {
            found: false,
            path: None,
            version: None,
        });
    }

    let path_str = String::from_utf8_lossy(&which_output.stdout)
        .trim()
        .to_string();

    // Attempt to capture a version string. Failures are non-fatal.
    let version = Command::new(binary)
        .arg("--version")
        .output()
        .ok()
        .and_then(|out| {
            let text = if out.stdout.is_empty() {
                String::from_utf8_lossy(&out.stderr).into_owned()
            } else {
                String::from_utf8_lossy(&out.stdout).into_owned()
            };
            text.lines()
                .next()
                .map(|line| line.trim().to_string())
                .filter(|s| !s.is_empty())
        });

    Ok(CommandCheck {
        found: true,
        path: Some(path_str),
        version,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allowed_command_binary_names() {
        assert_eq!(AllowedCommand::Python3.binary_name(), "python3");
        assert_eq!(AllowedCommand::Claude.binary_name(), "claude");
        assert_eq!(AllowedCommand::Brew.binary_name(), "brew");
        assert_eq!(AllowedCommand::Git.binary_name(), "git");
        assert_eq!(AllowedCommand::Codex.binary_name(), "codex");
        assert_eq!(AllowedCommand::Cursor.binary_name(), "cursor");
    }

    #[test]
    fn allowed_command_deserialize_from_json() {
        let cases = [
            (r#""Python3""#, AllowedCommand::Python3),
            (r#""Claude""#, AllowedCommand::Claude),
            (r#""Brew""#, AllowedCommand::Brew),
            (r#""Git""#, AllowedCommand::Git),
            (r#""Codex""#, AllowedCommand::Codex),
            (r#""Cursor""#, AllowedCommand::Cursor),
        ];
        for (json, expected) in cases {
            let got: AllowedCommand =
                serde_json::from_str(json).unwrap_or_else(|e| panic!("failed to deserialize {json}: {e}"));
            assert_eq!(got, expected);
        }
    }
}
