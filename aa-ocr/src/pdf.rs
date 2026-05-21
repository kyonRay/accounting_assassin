//! PDF text-layer extraction via `pdf-extract`.
//!
//! Returns `Ok(Some(text))` when the PDF contains an embedded text layer,
//! `Ok(None)` when the page stream exists but yields no text (scanned image PDF),
//! and `Err(_)` on parse failures.

use std::path::Path;

/// Extract embedded text from a PDF file.
///
/// - Returns `Ok(Some(text))` when text is found in the text layer.
/// - Returns `Ok(None)` when the file is a valid PDF but contains no extractable
///   text (e.g. a scanned / image-only PDF).
/// - Returns `Err(e)` on IO errors or malformed PDF.
pub fn extract_text(path: &Path) -> Result<Option<String>, Box<dyn std::error::Error>> {
    let text = pdf_extract::extract_text(path)?;
    let trimmed = text.trim();
    if trimmed.is_empty() {
        Ok(None)
    } else {
        Ok(Some(trimmed.to_string()))
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn fixtures_dir() -> PathBuf {
        // Works whether tests are run from workspace root or aa-ocr/ directly.
        let manifest = std::env::var("CARGO_MANIFEST_DIR")
            .unwrap_or_else(|_| ".".to_string());
        PathBuf::from(manifest).join("tests/fixtures")
    }

    #[test]
    fn extracts_text_from_text_layer() {
        let path = fixtures_dir().join("text_layer.pdf");
        let result = extract_text(&path);
        assert!(result.is_ok(), "should not error: {:?}", result);
        let text = result.unwrap();
        assert!(text.is_some(), "text_layer.pdf should yield Some(text)");
        let content = text.unwrap();
        assert!(!content.is_empty(), "extracted text should not be empty");
        // Verify it contains the known content we embedded in the fixture
        assert!(
            content.contains("TEST INVOICE") || content.contains("Test Invoice"),
            "expected 'TEST INVOICE' in text layer, got: {:?}",
            content
        );
    }

    #[test]
    fn scanned_pdf_returns_none() {
        let path = fixtures_dir().join("scanned.pdf");
        let result = extract_text(&path);
        assert!(result.is_ok(), "should not error on scanned PDF: {:?}", result);
        assert!(
            result.unwrap().is_none(),
            "scanned.pdf should yield None (no text layer)"
        );
    }

    #[test]
    fn nonexistent_file_returns_err() {
        let path = fixtures_dir().join("does_not_exist.pdf");
        let result = extract_text(&path);
        assert!(result.is_err(), "missing file should return Err");
    }
}
