//! macOS Vision Framework OCR via the `objc2-vision` crate.
//!
//! # Crate choice
//! We use `objc2-vision` 0.3.2 + `objc2-foundation` 0.3.2 (part of the madsmtm/objc2
//! ecosystem). At the time of writing (2026-05) this is the most complete, safe, and
//! actively maintained set of Apple framework bindings for Rust.  All 63 of the 64
//! objc2-vision features are enabled by default; no extra feature flags are needed.
//!
//! # Safety
//! objc2 0.6 / objc2-vision 0.3.2 mark most ObjC methods as safe; the only `unsafe`
//! blocks remaining are raw-pointer casts for the IS-A coercion from
//! VNRecognizeTextRequest to VNRequest (required for NSArray construction).
//!
//! # Non-macOS builds
//! This module is only compiled when the `vision` Cargo feature is active **and** we
//! are on macOS. On other platforms the module exports a stub that always returns an
//! error, so the crate can be `cargo check`-ed on Linux CI without failing.

#[cfg(all(feature = "vision", target_os = "macos"))]
mod inner {
    use objc2::AnyThread;
    use objc2::rc::Retained;
    use objc2::runtime::AnyObject;
    use objc2_foundation::{NSArray, NSDictionary, NSString, NSURL};
    use objc2_vision::{
        VNImageOption, VNImageRequestHandler, VNRecognizeTextRequest,
        VNRequestTextRecognitionLevel,
    };
    use std::path::Path;

    /// Run Vision text recognition on an image file.
    ///
    /// Returns the concatenated text from all recognized observations, joined by
    /// newlines.  Uses accurate recognition level with Chinese + English hints.
    pub fn ocr_image(path: &Path) -> Result<String, Box<dyn std::error::Error>> {
        let abs = path.canonicalize().map_err(|e| {
            format!("cannot resolve path {}: {}", path.display(), e)
        })?;

        let text = run_vision_ocr(&abs)?;
        Ok(text)
    }

    /// Inner function containing all objc2 calls.
    fn run_vision_ocr(abs_path: &Path) -> Result<String, Box<dyn std::error::Error>> {
        // ── Build NSURL from the absolute path ──────────────────────────────────
        let path_str = abs_path.to_str().ok_or("path is not valid UTF-8")?;

        let ns_path: Retained<NSString> = NSString::from_str(path_str);

        // fileURLWithPath is safe in objc2 0.6.
        let url: Retained<NSURL> = NSURL::fileURLWithPath(&ns_path);

        // ── Build VNImageRequestHandler from the URL ────────────────────────────
        // options type: &NSDictionary<VNImageOption, AnyObject>
        // (VNImageOption is NSString; both keys + values are AnyObject at runtime).
        let options: Retained<NSDictionary<VNImageOption, AnyObject>> =
            NSDictionary::new();

        // initWithURL_options is still `unsafe fn` because it is a designated
        // initializer that consumes `Allocated<Self>`.
        let handler: Retained<VNImageRequestHandler> = unsafe {
            VNImageRequestHandler::initWithURL_options(
                VNImageRequestHandler::alloc(),
                &url,
                &options,
            )
        };

        // ── Build VNRecognizeTextRequest ────────────────────────────────────────
        let request: Retained<VNRecognizeTextRequest> = VNRecognizeTextRequest::new();

        // Set recognition language hints: zh-Hans, zh-Hant, en
        let langs: [Retained<NSString>; 3] = [
            NSString::from_str("zh-Hans"),
            NSString::from_str("zh-Hant"),
            NSString::from_str("en"),
        ];
        let lang_array: Retained<NSArray<NSString>> =
            NSArray::from_retained_slice(&langs);

        request.setRecognitionLanguages(&lang_array);

        // Set recognition level to .accurate (raw value 0; 1 = Fast)
        request.setRecognitionLevel(VNRequestTextRecognitionLevel::Accurate);

        // ── Perform the request ─────────────────────────────────────────────────
        // performRequests_error takes &NSArray<VNRequest>; our request is a subtype.
        // Cast VNRecognizeTextRequest* to VNRequest* via raw-pointer coercion.
        // SAFETY: VNRecognizeTextRequest IS-A VNRequest. Both are repr(C) opaque
        // ObjC class wrappers in objc2; the pointer identity is valid and the ARC
        // retain count is unaffected (we hold `request` alive across this block).
        use objc2_vision::VNRequest;
        let req_array: Retained<NSArray<VNRequest>> = {
            let raw: *mut VNRequest =
                Retained::as_ptr(&request) as *mut VNRequest;
            // SAFETY: raw is non-null; `request` is alive for the duration.
            let req_ref: &VNRequest = unsafe { &*raw };
            NSArray::from_slice(&[req_ref])
        };

        handler
            .performRequests_error(&req_array)
            .map_err(|ns_err| {
                format!(
                    "Vision perform error: {}",
                    ns_err.localizedDescription()
                )
            })?;

        // ── Collect results ─────────────────────────────────────────────────────
        let observations = request.results();
        let Some(observations) = observations else {
            return Ok(String::new());
        };

        let mut lines = Vec::new();
        for obs in observations.iter() {
            let candidates = obs.topCandidates(1);
            // Use firstObject() — returns Option<Retained<T>>; .first() is a Rust
            // slice method not exposed on Retained<NSArray>.
            if let Some(top) = candidates.firstObject() {
                lines.push(top.string().to_string());
            }
        }

        Ok(lines.join("\n"))
    }
}

// ── Public API ──────────────────────────────────────────────────────────────

/// Run OCR on an image file using macOS Vision Framework.
///
/// Returns the recognized text as a single string with newline-separated lines.
/// Requires macOS; on other platforms always returns `Err("Vision is macOS-only")`.
#[cfg(all(feature = "vision", target_os = "macos"))]
pub fn ocr_image(path: &std::path::Path) -> Result<String, Box<dyn std::error::Error>> {
    inner::ocr_image(path)
}

/// Stub for non-macOS platforms.
#[cfg(not(all(feature = "vision", target_os = "macos")))]
pub fn ocr_image(_path: &std::path::Path) -> Result<String, Box<dyn std::error::Error>> {
    Err("Vision OCR is only available on macOS".into())
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn fixtures_dir() -> PathBuf {
        let manifest = std::env::var("CARGO_MANIFEST_DIR")
            .unwrap_or_else(|_| ".".to_string());
        PathBuf::from(manifest).join("tests/fixtures")
    }

    // This test requires macOS Vision — guard with target_os so Linux CI doesn't explode.
    #[cfg(target_os = "macos")]
    #[test]
    fn recognizes_chinese_invoice_image() {
        let path = fixtures_dir().join("chinese_invoice.png");
        if !path.exists() {
            eprintln!("SKIP: fixture {:?} not found", path);
            return;
        }
        let result = ocr_image(&path);
        assert!(result.is_ok(), "Vision OCR should succeed: {:?}", result);
        let text = result.unwrap();
        assert!(!text.is_empty(), "recognized text should not be empty");
        // The fixture contains the string "增值税" (Value Added Tax) — a common
        // Chinese invoice header.  Assert on content we control in the fixture.
        assert!(
            text.contains("增值税") || text.contains("发票") || text.contains("合计"),
            "expected Chinese invoice keywords in OCR output, got: {:?}",
            text
        );
    }

    #[cfg(not(target_os = "macos"))]
    #[test]
    fn ocr_image_errors_on_non_macos() {
        let result = ocr_image(std::path::Path::new("any.png"));
        assert!(result.is_err());
    }
}
