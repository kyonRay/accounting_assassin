#!/usr/bin/env bash
#
# package-dmg.sh — build, ad-hoc-sign, and stage the macOS .dmg for distribution
#
# Pipeline:
#   1. pnpm tauri:build                                  (produces .app + .dmg)
#   2. codesign --force --deep --sign - <App>            (ad-hoc; spec § 10.2:
#      no Apple Developer Program — users open via right-click → "打开" once)
#   3. find the produced AccountingAssassin_*.dmg        (glob via `find`, NOT
#      a quoted bash var — bash does not expand globs inside quoted strings;
#      Codex review fix #5b)
#   4. Copy the DMG + docs/首次安装说明.pdf into release/
#
# Exit codes:
#   0  success
#   1  pnpm tauri:build failed | .app missing | .dmg missing
#
# Notes:
#   - The 首次安装说明.pdf (Task 9.2) may not exist when this script is first
#     used. A missing PDF prints a WARNING to stderr but does NOT fail — the
#     DMG itself is the load-bearing artifact.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# This is a Cargo workspace (root Cargo.toml + aa-ocr/ + src-tauri/), so all
# crates build to the workspace-level target/, NOT src-tauri/target/.
# Probe workspace root first, fall back to src-tauri/ for non-workspace layouts.
INSTALL_PDF="docs/首次安装说明.pdf"
RELEASE_DIR="release"

echo "→ pnpm tauri:build (this can take 3–10 min on first build)..."
pnpm tauri:build

APP=""
DMG_DIR=""
for CANDIDATE in "target/release/bundle" "src-tauri/target/release/bundle"; do
  if [ -d "${CANDIDATE}/macos/AccountingAssassin.app" ]; then
    APP="${CANDIDATE}/macos/AccountingAssassin.app"
    DMG_DIR="${CANDIDATE}/dmg"
    break
  fi
done

if [ -z "$APP" ]; then
  echo "ERROR: built .app not found under target/release/bundle/macos/ or src-tauri/target/release/bundle/macos/" >&2
  echo "       (tauri:build appeared to succeed but the bundle is missing)" >&2
  exit 1
fi

echo "→ ad-hoc signing $APP..."
codesign --force --deep --sign - "$APP"

# Codex review fix #5b: bash does not expand globs inside quoted variables, so
# `DMG="$DMG_DIR/AccountingAssassin_*.dmg"; cp "$DMG" ...` would attempt to
# copy a file literally named with a `*`. Use `find` instead.
DMG="$(find "$DMG_DIR" -maxdepth 1 -type f -name 'AccountingAssassin_*.dmg' | head -1)"
if [ -z "$DMG" ]; then
  echo "ERROR: no AccountingAssassin_*.dmg produced under $DMG_DIR" >&2
  exit 1
fi

mkdir -p "$RELEASE_DIR"
cp "$DMG" "$RELEASE_DIR/"

if [ -f "$INSTALL_PDF" ]; then
  cp "$INSTALL_PDF" "$RELEASE_DIR/"
else
  echo "WARNING: $INSTALL_PDF not found — skipping (Task 9.2 produces this file)." >&2
  echo "         The DMG is staged, but end users will lack the install guide." >&2
fi

echo
echo "Release artifacts:"
ls -lh "$RELEASE_DIR/"
