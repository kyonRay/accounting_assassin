//! JSON output schema and regex-based field extraction for invoice OCR.
//!
//! Implements the authoritative schema from spec § 5.3.1.1.
//! All four fields (date, amount, vendor, tax_id) are always present in the
//! output JSON, even when the value could not be extracted.

use regex::Regex;
use serde::Serialize;
use std::sync::OnceLock;

// ---------------------------------------------------------------------------
// Output schema (spec § 5.3.1.1)
// ---------------------------------------------------------------------------

/// A single extracted field with a confidence score.
#[derive(Debug, Serialize)]
pub struct Field<V: Serialize> {
    /// The extracted value, or `null` when not recognized.
    pub value: Option<V>,
    /// Confidence in [0.0, 1.0].  0.0 when value is null.
    pub confidence: f64,
    /// Only set when `value` is null — a short Chinese explanation.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
    /// Present only on `amount` field.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub currency: Option<String>,
}

impl<V: Serialize> Field<V> {
    pub fn found(value: V, confidence: f64) -> Self {
        Self {
            value: Some(value),
            confidence,
            reason: None,
            currency: None,
        }
    }

    pub fn found_with_currency(value: V, confidence: f64, currency: impl Into<String>) -> Self {
        Self {
            value: Some(value),
            confidence,
            reason: None,
            currency: Some(currency.into()),
        }
    }

    pub fn missing(reason: impl Into<String>) -> Self {
        Self {
            value: None,
            confidence: 0.0,
            reason: Some(reason.into()),
            currency: None,
        }
    }
}

/// The top-level invoice fields block.
#[derive(Debug, Serialize)]
pub struct InvoiceFields {
    pub date: Field<String>,
    pub amount: Field<f64>,
    pub vendor: Field<String>,
    pub tax_id: Field<String>,
}

/// The complete JSON output document (spec § 5.3.1.1).
#[derive(Debug, Serialize)]
pub struct OcrOutput {
    pub source_file: String,
    pub fields: InvoiceFields,
    pub raw_text: String,
}

// ---------------------------------------------------------------------------
// Exit codes (spec § 5.3.1.1)
// ---------------------------------------------------------------------------

/// Compute the exit code from the extracted fields.
///
/// - 0: all 4 fields have values
/// - 3: no text at all (raw_text is empty)
/// - 4: 1+ but not all 4 fields extracted
/// - 2: file not found (handled in main.rs before reaching here)
pub fn exit_code(fields: &InvoiceFields, raw_text: &str) -> i32 {
    if raw_text.is_empty() {
        return 3;
    }
    let present = [
        fields.date.value.is_some(),
        fields.amount.value.is_some(),
        fields.vendor.value.is_some(),
        fields.tax_id.value.is_some(),
    ]
    .iter()
    .filter(|&&v| v)
    .count();

    if present == 4 {
        0
    } else {
        4
    }
}

// ---------------------------------------------------------------------------
// Regex patterns (compiled once)
// ---------------------------------------------------------------------------

fn date_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        // Matches dates in common Chinese invoice formats:
        //   2026年04月15日  |  2026-04-15  |  2026/04/15
        Regex::new(
            r"(?x)
            (?:
                (\d{4})[年\-/](\d{1,2})[月\-/](\d{1,2})[日]?
            )
            ",
        )
        .expect("date regex is valid")
    })
}

fn amount_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        // Matches grand-total amounts in Chinese invoices.
        // Priority order (left-to-right in alternation):
        //   价税合计 — "price + tax total" (most specific, preferred)
        //   合计金额 — "total amount"
        //   合计     — "total"
        //   金额     — "amount"
        //   小计     — "subtotal"
        // NOTE: 税额 ("tax amount") is intentionally excluded — it is the VAT
        // component, not the grand total, and matching it first caused wrong results.
        // The leading ¥/￥ is optional; commas within the integer part are stripped.
        Regex::new(
            r"(?:价税合计|合计金额|合计|金额|小计)[^\d¥￥]*[¥￥]?\s*([\d,]+(?:\.\d{1,2})?)",
        )
        .expect("amount regex is valid")
    })
}

fn vendor_re_seller_explicit() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        // Tier-1: explicit seller label — "销售方名称：" or "销售方 名称："
        // Confidence 0.85 when matched.
        Regex::new(r"销售方\s*名称[：:]\s*([^\n\r]+)").expect("vendor seller-explicit regex is valid")
    })
}

fn vendor_re_name_after_seller_context() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        // Tier-2: bare "名称：" that follows "销售方" within ~30 chars (same block).
        // Uses a look-behind-style approach: capture a line that starts with 名称 when
        // the text preceding it (up to ~30 chars) contains 销售方.
        // We do this with a single regex that matches "销售方" ... "名称：<value>"
        // where "..." is up to 40 chars (no newline).
        Regex::new(r"销售方[^\n\r]{0,40}?\n[^\n\r]{0,10}名称[：:]\s*([^\n\r]+)")
            .expect("vendor seller-context regex is valid")
    })
}

fn vendor_re_fallback() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        // Tier-3 fallback: bare "名称" / "单位名称" label with no buyer-context check.
        // Used only when no buyer-side marker (购买方/购方) is present.
        Regex::new(r"(?:名称|单位名称)[：:]\s*([^\n\r]+)").expect("vendor fallback regex is valid")
    })
}

fn tax_id_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        // Chinese unified social credit code (统一社会信用代码): 18 alphanumeric chars.
        // Also matches older 15-digit tax registration numbers.
        // Label: 纳税人识别号 / 统一社会信用代码
        Regex::new(
            r"(?:纳税人识别号|统一社会信用代码)[：:\s]*([A-Z0-9]{15,20})",
        )
        .expect("tax_id regex is valid")
    })
}

// ---------------------------------------------------------------------------
// Field extraction
// ---------------------------------------------------------------------------

/// Extract all four invoice fields from `raw_text`.
pub fn extract_fields(raw_text: &str) -> InvoiceFields {
    InvoiceFields {
        date: extract_date(raw_text),
        amount: extract_amount(raw_text),
        vendor: extract_vendor(raw_text),
        tax_id: extract_tax_id(raw_text),
    }
}

fn extract_date(text: &str) -> Field<String> {
    let re = date_re();
    if let Some(caps) = re.captures(text) {
        let year = caps.get(1).map_or("", |m| m.as_str());
        let month = caps.get(2).map_or("", |m| m.as_str());
        let day = caps.get(3).map_or("", |m| m.as_str());
        // Normalize to ISO 8601: YYYY-MM-DD
        let iso = format!("{}-{:0>2}-{:0>2}", year, month, day);
        Field::found(iso, 0.92)
    } else {
        Field::missing("未识别")
    }
}

fn extract_amount(text: &str) -> Field<f64> {
    let re = amount_re();
    // Collect ALL matches; prefer the largest value (heuristic: grand total is largest).
    let mut best: Option<f64> = None;
    for caps in re.captures_iter(text) {
        let raw = caps.get(1).map_or("", |m| m.as_str());
        let normalized = raw.replace(',', "");
        if let Ok(val) = normalized.parse::<f64>() {
            best = Some(match best {
                Some(prev) if prev >= val => prev,
                _ => val,
            });
        }
    }
    if let Some(val) = best {
        Field::found_with_currency(val, 0.88, "CNY")
    } else {
        Field::<f64>::missing("未识别")
    }
}

fn extract_vendor(text: &str) -> Field<String> {
    // Tier-1: explicit "销售方名称：" label — confidence 0.85
    if let Some(caps) = vendor_re_seller_explicit().captures(text) {
        let name = caps.get(1).map_or("", |m| m.as_str()).trim().to_string();
        if !name.is_empty() {
            return Field::found(name, 0.85);
        }
    }

    // Tier-2: bare "名称：" following a "销售方" line — confidence 0.65
    if let Some(caps) = vendor_re_name_after_seller_context().captures(text) {
        let name = caps.get(1).map_or("", |m| m.as_str()).trim().to_string();
        if !name.is_empty() {
            return Field::found(name, 0.65);
        }
    }

    // Tier-3 fallback: bare "名称"/"单位名称" label, but ONLY when the document
    // contains no buyer-side marker (购买方/购方) — avoids picking the buyer name
    // on two-party VAT invoices that list buyer before seller.
    let has_buyer_marker = text.contains("购买方") || text.contains("购方");
    if !has_buyer_marker {
        if let Some(caps) = vendor_re_fallback().captures(text) {
            let name = caps.get(1).map_or("", |m| m.as_str()).trim().to_string();
            if !name.is_empty() {
                return Field::found(name, 0.55);
            }
        }
    }

    Field::missing("未识别")
}

fn extract_tax_id(text: &str) -> Field<String> {
    let re = tax_id_re();
    if let Some(caps) = re.captures(text) {
        let id = caps.get(1).map_or("", |m| m.as_str()).trim().to_string();
        if !id.is_empty() {
            return Field::found(id, 0.90);
        }
    }
    Field::missing("未识别")
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE_INVOICE: &str = r#"
增值税专用发票
销售方名称：上海某某商贸有限公司
纳税人识别号：91310000MA1GH5XF2B
开票日期：2026年04月15日
合计：¥1,234.50
"#;

    #[test]
    fn extracts_date_chinese_format() {
        let f = extract_date(SAMPLE_INVOICE);
        assert_eq!(f.value.as_deref(), Some("2026-04-15"));
        assert!(f.confidence > 0.0);
    }

    #[test]
    fn extracts_date_iso_format() {
        let text = "开票日期: 2026-04-15\n合计: ¥100.00";
        let f = extract_date(text);
        assert_eq!(f.value.as_deref(), Some("2026-04-15"));
    }

    #[test]
    fn extracts_date_slash_format() {
        let text = "日期: 2026/04/15";
        let f = extract_date(text);
        assert_eq!(f.value.as_deref(), Some("2026-04-15"));
    }

    #[test]
    fn extracts_date_missing_returns_none() {
        let f = extract_date("no date here");
        assert!(f.value.is_none());
        assert_eq!(f.confidence, 0.0);
        assert_eq!(f.reason.as_deref(), Some("未识别"));
    }

    #[test]
    fn extracts_amount_with_comma_separator() {
        let f = extract_amount(SAMPLE_INVOICE);
        assert!((f.value.unwrap() - 1234.50).abs() < 1e-9);
        assert_eq!(f.currency.as_deref(), Some("CNY"));
    }

    #[test]
    fn extracts_amount_without_comma() {
        let text = "金额：1234.50\n";
        let f = extract_amount(text);
        assert!((f.value.unwrap() - 1234.50).abs() < 1e-9);
    }

    #[test]
    fn extracts_amount_price_with_tax_label() {
        let text = "价税合计 9876.00";
        let f = extract_amount(text);
        assert!((f.value.unwrap() - 9876.00).abs() < 1e-9);
    }

    #[test]
    fn extracts_amount_missing_returns_none() {
        let f = extract_amount("no amount here");
        assert!(f.value.is_none());
        assert_eq!(f.reason.as_deref(), Some("未识别"));
    }

    #[test]
    fn amount_prefers_grand_total_over_tax() {
        // A real VAT invoice contains 金额 (pre-tax), 税额 (tax component), and
        // 价税合计 (grand total).  We must return the grand total, not 税额.
        let text = "
        金额：1073.89
        税额：160.61
        价税合计：1234.50
    ";
        let fields = extract_fields(text);
        assert!(
            fields.amount.value.unwrap_or(0.0) > 1200.0,
            "expected grand total ~1234.50, got {:?}",
            fields.amount.value
        );
    }

    #[test]
    fn extracts_vendor_from_label() {
        let f = extract_vendor(SAMPLE_INVOICE);
        assert_eq!(f.value.as_deref(), Some("上海某某商贸有限公司"));
    }

    #[test]
    fn extracts_vendor_with_colon_variant() {
        let text = "名称: 北京示例科技有限公司\n";
        let f = extract_vendor(text);
        assert_eq!(f.value.as_deref(), Some("北京示例科技有限公司"));
    }

    #[test]
    fn extracts_vendor_missing_returns_none() {
        let f = extract_vendor("no vendor here");
        assert!(f.value.is_none());
        assert_eq!(f.reason.as_deref(), Some("未识别"));
    }

    #[test]
    fn extracts_vendor_seller_not_buyer() {
        // Standard two-party VAT invoice: buyer block appears FIRST, then seller block.
        // The extractor must return the SELLER name, not the buyer name.
        let text = "
        购买方
        名称：某客户有限公司
        纳税人识别号：91310000XXXXXXXXX1

        销售方
        名称：上海某某商贸有限公司
        纳税人识别号：91310000XXXXXXXXX2
    ";
        let fields = extract_fields(text);
        assert_eq!(
            fields.vendor.value,
            Some("上海某某商贸有限公司".to_string()),
            "expected SELLER name; got {:?}",
            fields.vendor.value
        );
    }

    #[test]
    fn extracts_tax_id_18_char() {
        let f = extract_tax_id(SAMPLE_INVOICE);
        assert_eq!(f.value.as_deref(), Some("91310000MA1GH5XF2B"));
    }

    #[test]
    fn extracts_tax_id_missing_returns_none() {
        let f = extract_tax_id("no tax id here");
        assert!(f.value.is_none());
        assert_eq!(f.reason.as_deref(), Some("未识别"));
    }

    #[test]
    fn exit_code_all_fields_present() {
        let fields = extract_fields(SAMPLE_INVOICE);
        let code = exit_code(&fields, SAMPLE_INVOICE);
        assert_eq!(code, 0, "all 4 fields → exit 0");
    }

    #[test]
    fn exit_code_no_text() {
        let fields = extract_fields("");
        let code = exit_code(&fields, "");
        assert_eq!(code, 3, "empty raw_text → exit 3");
    }

    #[test]
    fn exit_code_partial() {
        // Only a date, nothing else.
        let text = "2026年01月01日";
        let fields = extract_fields(text);
        let code = exit_code(&fields, text);
        assert_eq!(code, 4, "partial fields → exit 4");
    }

    #[test]
    fn output_serializes_to_valid_json() {
        let fields = extract_fields(SAMPLE_INVOICE);
        let output = OcrOutput {
            source_file: "test.pdf".to_string(),
            fields,
            raw_text: SAMPLE_INVOICE.to_string(),
        };
        let json = serde_json::to_string_pretty(&output).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert!(parsed["fields"]["date"]["value"].is_string());
        assert!(parsed["fields"]["amount"]["currency"].is_string());
        // tax_id.reason is present because value is a string, not null — check structure
        assert!(parsed["fields"]["tax_id"]["value"].is_string());
    }

    #[test]
    fn missing_field_has_reason_key_in_json() {
        let f = Field::<String>::missing("未识别");
        let json = serde_json::to_value(&f).unwrap();
        assert!(json["value"].is_null());
        assert_eq!(json["reason"], "未识别");
        assert!(!json.as_object().unwrap().contains_key("currency"));
    }
}
