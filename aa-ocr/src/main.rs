//! aa-ocr — Invoice OCR CLI for 记账杀手 (Accounting Assassin)
//!
//! Usage:
//!   aa-ocr <path-to-file>
//!
//! Accepts PDF and common image formats.  Emits a JSON document to stdout
//! (spec § 5.3.1.1) and exits with one of:
//!   0 — all 4 fields extracted
//!   2 — file not found
//!   3 — no text could be extracted
//!   4 — partial extraction (1–3 fields present)
//!
//! JSON is always written to stdout regardless of exit code.

mod output;
mod pdf;
mod vision;

use output::{extract_fields, exit_code, OcrOutput};
use std::path::PathBuf;
use std::process;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 2 {
        eprintln!("Usage: aa-ocr <file>");
        process::exit(1);
    }

    let path = PathBuf::from(&args[1]);

    // Exit code 2: file not found
    if !path.exists() {
        let output = OcrOutput {
            source_file: args[1].clone(),
            fields: extract_fields(""),
            raw_text: String::new(),
        };
        println!("{}", serde_json::to_string_pretty(&output).unwrap_or_default());
        process::exit(2);
    }

    // Dispatch based on file extension
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default();

    let raw_text = if ext == "pdf" {
        handle_pdf(&path)
    } else {
        handle_image(&path)
    };

    let fields = extract_fields(&raw_text);
    let code = exit_code(&fields, &raw_text);

    let output = OcrOutput {
        source_file: args[1].clone(),
        fields,
        raw_text,
    };

    println!(
        "{}",
        serde_json::to_string_pretty(&output).unwrap_or_else(|e| {
            format!(r#"{{"error":"json serialization failed: {}"}}"#, e)
        })
    );

    process::exit(code);
}

/// Handle a PDF file: try text-layer extraction first, fall back to Vision OCR.
///
/// Implements spec § 5.3.1.1:
/// - Text-layer PDFs: extracted directly via `pdf-extract`.
/// - Scanned/image-only PDFs (`Ok(None)`): rasterized page-by-page via PDFKit
///   and fed into Vision OCR (`vision::ocr_pdf_via_vision`).
fn handle_pdf(path: &PathBuf) -> String {
    match pdf::extract_text(path) {
        Ok(Some(text)) => text,
        Ok(None) => {
            // Scanned PDF — rasterize via PDFKit and run Vision OCR.
            eprintln!("aa-ocr: PDF has no text layer; falling back to Vision OCR (PDFKit rasterize)");
            match vision::ocr_pdf_via_vision(path) {
                Ok(text) => text,
                Err(e) => {
                    eprintln!("aa-ocr: Vision PDF OCR error: {}", e);
                    String::new()
                }
            }
        }
        Err(e) => {
            eprintln!("aa-ocr: pdf-extract error: {}", e);
            String::new()
        }
    }
}

/// Handle an image file via macOS Vision OCR.
fn handle_image(path: &PathBuf) -> String {
    match vision::ocr_image(path) {
        Ok(text) => text,
        Err(e) => {
            eprintln!("aa-ocr: Vision OCR error: {}", e);
            String::new()
        }
    }
}
