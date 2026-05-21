//! `run_bundled_checker` — stub for the chapter-exercise checker pipeline.
//!
//! The enum `BundledChecker` is intentionally empty at Task 4.1 time. Its purpose
//! here is to **lock the type signature**: future chapter implementations (Task 4.5+)
//! add variants to this enum; they can never accidentally accept a raw `String`
//! from the frontend because the IPC layer enforces the enum.
//!
//! Concrete checkers are added in Tasks 4.5 and beyond, one per chapter exercise.

use serde::{Deserialize, Serialize};

/// Exhaustive list of app-bundled chapter checkers.
///
/// TODO(Task 4.5+): add one variant per chapter exercise that requires server-side
/// verification, e.g.:
///   `Ch01BasicJournalEntry,`
///   `Ch04SpreadsheetBalance,`
///   …
///
/// Constraint: variants here correspond to **bundled** scripts under the app
/// resources directory. They NEVER accept user-supplied paths or script names.
#[derive(Debug, Deserialize, Serialize)]
pub enum BundledChecker {
    // Intentionally empty — populated per chapter in Task 4.5+.
}

/// The structured result returned by a bundled checker.
#[derive(Debug, Serialize)]
pub struct CheckerResult {
    pub passed: bool,
    pub message: String,
    pub details: Option<String>,
}

/// Run a bundled chapter checker by name (enum-gated, never accepts user paths).
///
/// Returns an error until concrete checkers are registered in Task 4.5+.
/// This stub proves the IPC plumbing compiles and the type signature is correct.
#[tauri::command]
pub async fn run_bundled_checker(name: BundledChecker) -> Result<CheckerResult, String> {
    // The match is exhaustive over an empty enum — this branch is unreachable at
    // runtime today, but the compiler will force us to handle new variants when
    // they're added in Task 4.5+.
    match name {}
}
