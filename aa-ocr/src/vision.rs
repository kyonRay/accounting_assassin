//! macOS Vision Framework OCR via the `objc2-vision` crate.
//!
//! # Crate choice
//! We use `objc2-vision` 0.3.2 + `objc2-foundation` 0.3.2 (part of the madsmtm/objc2
//! ecosystem). At the time of writing (2026-05) this is the most complete, safe, and
//! actively maintained set of Apple framework bindings for Rust.  All 63 of the 64
//! objc2-vision features are enabled by default; no extra feature flags are needed.
//!
//! # Scanned PDF fallback (spec § 5.3.1.1 b)
//! `ocr_pdf_via_vision` rasterizes each page via `objc2-pdf-kit` (PDFPage →
//! CGBitmapContext) then feeds the resulting CGImage into `VNImageRequestHandler`.
//! `objc2-core-graphics` supplies `CGBitmapContextCreate` / `CGBitmapContextCreateImage`.
//!
//! # Safety
//! objc2 0.6 / objc2-vision 0.3.2 mark most ObjC methods as safe; the only `unsafe`
//! blocks remaining are raw-pointer casts for the IS-A coercion from
//! VNRecognizeTextRequest to VNRequest (required for NSArray construction), plus the
//! designated-initializer calls required by the objc2 API convention.
//!
//! # Non-macOS builds
//! This module is only compiled when the `vision` Cargo feature is active **and** we
//! are on macOS. On other platforms the module exports stubs that always return an
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

        let text = run_vision_ocr_url(&abs)?;
        Ok(text)
    }

    /// Rasterize each page of a scanned PDF via PDFKit and run Vision OCR on each page.
    ///
    /// Uses `objc2-pdf-kit` to open the document and render pages into a
    /// `CGBitmapContext` at ~144 DPI equivalent (2× scale on a 72-DPI PDF page).
    /// The resulting `CGImage` is fed directly into `VNImageRequestHandler`.
    ///
    /// Returns the concatenated OCR text for all pages, separated by `\n\n`.
    /// Returns `Ok(String::new())` when the document loads but all pages yield
    /// no recognized text.
    pub fn ocr_pdf_via_vision(path: &Path) -> Result<String, Box<dyn std::error::Error>> {
        use objc2_core_graphics::{
            CGBitmapContextCreate, CGBitmapContextCreateImage,
            CGColorSpace, CGContext,
        };
        // CGRect/CGPoint/CGSize are geometry types from objc2-core-foundation.
        use objc2_core_foundation::{CGPoint, CGRect, CGSize};
        use objc2_pdf_kit::{PDFDisplayBox, PDFDocument};
        use std::ptr;

        let abs = path.canonicalize().map_err(|e| {
            format!("cannot resolve path {}: {}", path.display(), e)
        })?;

        let path_str = abs.to_str().ok_or("path is not valid UTF-8")?;
        let ns_path = NSString::from_str(path_str);
        let url = NSURL::fileURLWithPath(&ns_path);

        // Load PDFDocument.
        let doc = unsafe {
            PDFDocument::initWithURL(PDFDocument::alloc(), &url)
                .ok_or("PDFDocument: failed to open file")?
        };

        let page_count = unsafe { doc.pageCount() };
        if page_count == 0 {
            return Ok(String::new());
        }

        // Rasterize at scale 2.0 (≈ 144 DPI for a standard 72-DPI PDF page).
        let scale: f64 = 2.0;

        let mut page_texts: Vec<String> = Vec::new();

        for page_idx in 0..page_count {
            let page = unsafe {
                doc.pageAtIndex(page_idx)
                    .ok_or_else(|| format!("PDFDocument: page {} is nil", page_idx))?
            };

            // Get the media-box size in PDF points.
            let bounds = unsafe { page.boundsForBox(PDFDisplayBox::MediaBox) };
            let pt_w = bounds.size.width;
            let pt_h = bounds.size.height;

            // Pixel dimensions at the chosen scale.
            let px_w = (pt_w * scale).ceil() as usize;
            let px_h = (pt_h * scale).ceil() as usize;

            if px_w == 0 || px_h == 0 {
                continue;
            }

            // ── Create a CGBitmapContext (RGBA, 8 bits/component) ──────────────
            // kCGBitmapByteOrder32Host (0x4000) | kCGImageAlphaPremultipliedFirst (0x2) = 0x4002.
            // This is the most compatible BGRA format on macOS ARM/Intel.
            const BITMAP_INFO: u32 = 0x4002_u32;
            let bytes_per_row = px_w * 4;

            let color_space = CGColorSpace::new_device_rgb()
                .ok_or("CGColorSpace::new_device_rgb returned nil")?;

            // SAFETY: null data pointer is valid (CG allocates the backing store).
            let ctx = unsafe {
                CGBitmapContextCreate(
                    ptr::null_mut(),
                    px_w,
                    px_h,
                    8,
                    bytes_per_row,
                    Some(&color_space),
                    BITMAP_INFO,
                )
                .ok_or("CGBitmapContextCreate returned nil")?
            };

            // ── White background ───────────────────────────────────────────────
            // The zero-filled buffer is transparent black; fill white for OCR contrast.
            // These are associated functions on CGContext taking Option<&CGContext>.
            CGContext::set_rgb_fill_color(Some(&ctx), 1.0, 1.0, 1.0, 1.0);
            CGContext::fill_rect(
                Some(&ctx),
                CGRect {
                    origin: CGPoint { x: 0.0, y: 0.0 },
                    size: CGSize {
                        width: px_w as f64,
                        height: px_h as f64,
                    },
                },
            );

            // ── Scale + draw PDF page into the context ─────────────────────────
            // PDF coordinate system has origin at bottom-left; CGContext matches.
            CGContext::scale_ctm(Some(&ctx), scale, scale);
            unsafe { page.drawWithBox_toContext(PDFDisplayBox::MediaBox, &ctx) };

            // ── Extract CGImage ────────────────────────────────────────────────
            let cg_image = CGBitmapContextCreateImage(Some(&ctx))
                .ok_or("CGBitmapContextCreateImage returned nil")?;

            // ── Run Vision OCR on the CGImage ──────────────────────────────────
            let text = run_vision_ocr_cgimage(&cg_image)?;
            if !text.is_empty() {
                page_texts.push(text);
            }
        }

        Ok(page_texts.join("\n\n"))
    }

    /// Inner helper: run Vision OCR on a `CGImage` directly.
    fn run_vision_ocr_cgimage(
        cg_image: &objc2_core_graphics::CGImage,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let options: Retained<NSDictionary<VNImageOption, AnyObject>> =
            NSDictionary::new();

        let handler: Retained<VNImageRequestHandler> = unsafe {
            VNImageRequestHandler::initWithCGImage_options(
                VNImageRequestHandler::alloc(),
                cg_image,
                &options,
            )
        };

        collect_vision_results(&handler)
    }

    /// Inner function: run Vision OCR handler from a file URL.
    fn run_vision_ocr_url(abs_path: &Path) -> Result<String, Box<dyn std::error::Error>> {
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

        collect_vision_results(&handler)
    }

    /// Shared helper: build + perform a VNRecognizeTextRequest on the given handler,
    /// and collect the resulting text lines.
    fn collect_vision_results(
        handler: &VNImageRequestHandler,
    ) -> Result<String, Box<dyn std::error::Error>> {
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

/// Rasterize each page of a scanned PDF via PDFKit and run Vision OCR on each page.
///
/// This implements spec § 5.3.1.1 (b): the fallback path for scanned/image-only PDFs
/// that yield no text from `pdf-extract`.
///
/// Requires macOS; on other platforms always returns `Err("Vision OCR is only available on macOS")`.
#[cfg(all(feature = "vision", target_os = "macos"))]
pub fn ocr_pdf_via_vision(path: &std::path::Path) -> Result<String, Box<dyn std::error::Error>> {
    inner::ocr_pdf_via_vision(path)
}

/// Stub for non-macOS platforms.
#[cfg(not(all(feature = "vision", target_os = "macos")))]
pub fn ocr_pdf_via_vision(_path: &std::path::Path) -> Result<String, Box<dyn std::error::Error>> {
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

    /// Test the scanned-PDF → Vision fallback (spec § 5.3.1.1 b).
    ///
    /// Uses `tests/fixtures/scanned_invoice.pdf` — a PDF where the invoice text
    /// has been rasterized to an image (no text layer).  Vision should recognize
    /// the rasterized Chinese text and return a non-empty string.
    ///
    /// How to regenerate scanned_invoice.pdf: see tests/fixtures/README.md.
    #[cfg(target_os = "macos")]
    #[test]
    fn ocr_pdf_via_vision_with_scanned_pdf() {
        let path = fixtures_dir().join("scanned_invoice.pdf");
        if !path.exists() {
            eprintln!("SKIP: scanned_invoice.pdf fixture not found; regenerate per tests/fixtures/README.md");
            return;
        }
        let result = ocr_pdf_via_vision(&path);
        assert!(
            result.is_ok(),
            "ocr_pdf_via_vision should succeed on scanned_invoice.pdf: {:?}",
            result
        );
        let text = result.unwrap();
        assert!(
            !text.is_empty(),
            "Vision should recognize rasterized text in scanned_invoice.pdf"
        );
        // The fixture contains key Chinese invoice strings.
        assert!(
            text.contains("增值税") || text.contains("发票") || text.contains("合计"),
            "expected Chinese invoice keywords in OCR output, got: {:?}",
            text
        );
    }
}
