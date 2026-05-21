/// Process-global mutex for serializing tests that mutate `$HOME` via
/// `std::env::set_var("HOME", …)`.
///
/// `dirs::home_dir()` reads `$HOME` on Unix, and `set_var` is process-global.
/// Both `safety::path_guard` and `diagnostics::report` have tests that
/// temporarily redirect `$HOME` to a `TempDir`.  Without a shared lock those
/// tests race when `cargo test` runs them in parallel across threads.
///
/// **Usage** (in every test module that overrides HOME):
/// ```rust
/// use crate::test_util::HOME_LOCK;
/// let _guard = HOME_LOCK.lock().unwrap_or_else(|p| p.into_inner());
/// ```
#[cfg(test)]
pub(crate) static HOME_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());
