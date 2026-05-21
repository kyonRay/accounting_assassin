//! CLI integration tests for `aa-ocr`.
//!
//! Uses `assert_cmd` to spawn the binary and assert on exit codes and JSON stdout.
//! These tests require the binary to be built first (they run against `target/debug/aa-ocr`).

use assert_cmd::Command;
use std::path::PathBuf;

fn fixtures_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures")
}

fn aa_ocr() -> Command {
    Command::cargo_bin("aa-ocr").expect("aa-ocr binary not found; run `cargo build --bin aa-ocr` first")
}

/// Verify exit code 2 for a non-existent file.
#[test]
fn exit_code_2_file_not_found() {
    aa_ocr()
        .arg("/tmp/this_file_does_not_exist_12345.pdf")
        .assert()
        .code(2);
}

/// Verify exit code 2 output is valid JSON with source_file set.
#[test]
fn exit_code_2_emits_json() {
    let output = aa_ocr()
        .arg("/tmp/no_such_file.pdf")
        .output()
        .unwrap();

    assert_eq!(output.status.code(), Some(2));
    let stdout = String::from_utf8_lossy(&output.stdout);
    let parsed: serde_json::Value = serde_json::from_str(&stdout)
        .expect("stdout should be valid JSON even on exit code 2");
    assert_eq!(parsed["source_file"], "/tmp/no_such_file.pdf");
    assert!(parsed["fields"]["date"].is_object());
}

/// Verify exit code 3 for a scanned PDF (no text layer).
#[test]
fn exit_code_3_scanned_pdf() {
    let pdf = fixtures_dir().join("scanned.pdf");
    if !pdf.exists() {
        eprintln!("SKIP: scanned.pdf fixture not found");
        return;
    }
    aa_ocr()
        .arg(pdf.to_str().unwrap())
        .assert()
        .code(3);
}

/// Verify text-layer PDF produces valid JSON with raw_text non-empty.
/// Exit code is 4 (partial) because fixture has only ASCII text, not Chinese keywords.
#[test]
fn text_layer_pdf_emits_valid_json() {
    let pdf = fixtures_dir().join("text_layer.pdf");
    if !pdf.exists() {
        eprintln!("SKIP: text_layer.pdf fixture not found");
        return;
    }
    let output = aa_ocr()
        .arg(pdf.to_str().unwrap())
        .output()
        .unwrap();

    let stdout = String::from_utf8_lossy(&output.stdout);
    let parsed: serde_json::Value = serde_json::from_str(&stdout)
        .expect("stdout must be valid JSON");

    // raw_text must be non-empty (text layer found)
    assert!(!parsed["raw_text"].as_str().unwrap_or("").is_empty());

    // All four field keys must be present
    for key in &["date", "amount", "vendor", "tax_id"] {
        assert!(parsed["fields"][key].is_object(), "missing field: {}", key);
    }
}

/// Verify exit code 0 for the Chinese invoice PNG (all 4 fields extracted).
/// Only runs on macOS because Vision OCR is macOS-only.
#[cfg(target_os = "macos")]
#[test]
fn exit_code_0_chinese_invoice_image() {
    let img = fixtures_dir().join("chinese_invoice.png");
    if !img.exists() {
        eprintln!("SKIP: chinese_invoice.png fixture not found");
        return;
    }
    let output = aa_ocr()
        .arg(img.to_str().unwrap())
        .output()
        .unwrap();

    let stdout = String::from_utf8_lossy(&output.stdout);
    let parsed: serde_json::Value = serde_json::from_str(&stdout)
        .expect("stdout must be valid JSON");

    assert_eq!(
        output.status.code(),
        Some(0),
        "all 4 fields should be extracted from chinese_invoice.png; stdout: {}",
        stdout
    );

    // Spot-check a specific value
    assert_eq!(parsed["fields"]["tax_id"]["value"], "91310000MA1GH5XF2B");
    assert_eq!(parsed["fields"]["vendor"]["value"], "上海某某商贸有限公司");
}
