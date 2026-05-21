# Test Fixtures

## Provenance

All fixtures are **generated programmatically** — no real invoice data, no PII.
Generation script: `python3` with PyMuPDF (`fitz`) on macOS.

### text_layer.pdf

Minimal PDF with embedded text layer, created via PyMuPDF.  
Contains ASCII-only placeholder invoice data for `pdf::tests::extracts_text_from_text_layer`.  
Expected text: contains "TEST INVOICE".

### scanned.pdf

Minimal PDF with only a white-rectangle drawing and **no text layer**, created via PyMuPDF.  
Simulates a scanned / image-only invoice (blank page — no visible content).  
Expected: `pdf_extract::extract_text` returns `Ok(None)`; Vision OCR also returns empty text → exit 3.

### scanned_invoice.pdf

PDF where a realistic Chinese invoice (with 4 extractable fields) has been **rasterized to a PNG image** and embedded into a PDF page — no text layer.  
Simulates a real scanned invoice.  
Expected: `pdf_extract::extract_text` returns `Ok(None)`; Vision OCR fallback (`vision::ocr_pdf_via_vision`) recognizes the rasterized text → exit 0 (all 4 fields) or exit 4 (partial).

### chinese_invoice.png

Synthetic Chinese VAT invoice (增值税专用发票) rendered to PNG at 2× scale, created via PyMuPDF
with the system font `STHeiti Medium`.  
Contains four fields recognized by the regex extractor:
- 销售方名称 (vendor)
- 纳税人识别号 (tax_id): `91310000MA1GH5XF2B`
- 开票日期 (date): `2026年04月15日`
- 合计 (amount): `¥1,234.50`

Used by `vision::tests::recognizes_chinese_invoice_image` (macOS only).

## Regenerating

```sh
# From repo root — requires Python 3 + PyMuPDF:
# pip install PyMuPDF
python3 - <<'EOF'
import fitz, os

# text_layer.pdf
doc = fitz.open()
page = doc.new_page(width=612, height=792)
page.insert_text((50,700), 'TEST INVOICE', fontsize=14)
page.insert_text((50,680), 'Date: 2026-04-15', fontsize=12)
page.insert_text((50,660), 'Amount: 1234.50', fontsize=12)
page.insert_text((50,640), 'Vendor: Test Company Ltd', fontsize=12)
page.insert_text((50,620), 'Tax ID: 91310000MA1GH5XF2B', fontsize=12)
doc.save('aa-ocr/tests/fixtures/text_layer.pdf')

# scanned.pdf (no text layer)
doc = fitz.open()
page = doc.new_page(width=612, height=792)
page.draw_rect(fitz.Rect(0,0,612,792), color=(1,1,1), fill=(1,1,1))
doc.save('aa-ocr/tests/fixtures/scanned.pdf')

# chinese_invoice.png
font_path = '/System/Library/Fonts/STHeiti Medium.ttc'
doc = fitz.open()
page = doc.new_page(width=600, height=800)
lines = [
    (50,750,'增值税专用发票',18),(50,710,'销售方名称：上海某某商贸有限公司',13),
    (50,685,'纳税人识别号：91310000MA1GH5XF2B',13),(50,660,'开票日期：2026年04月15日',13),
    (50,635,'合计：¥1,234.50',13),(50,610,'税率：13%',13),
]
for x,y,text,size in lines:
    if os.path.exists(font_path):
        page.insert_text((x,y), text, fontsize=size, fontfile=font_path, fontname='CJK')
    else:
        page.insert_text((x,y), text, fontsize=size)
pix = page.get_pixmap(matrix=fitz.Matrix(2,2))
pix.save('aa-ocr/tests/fixtures/chinese_invoice.png')
print('Done')
EOF
```

To regenerate only `scanned_invoice.pdf` (rasterized invoice with no text layer):

```sh
# From repo root — requires Python 3 + PyMuPDF:
# pip install PyMuPDF
python3 - <<'EOF'
import fitz, os

font_path = '/System/Library/Fonts/STHeiti Medium.ttc'

# Step 1: render invoice text to a pixmap (acts as the "scanner camera")
doc_src = fitz.open()
page_src = doc_src.new_page(width=600, height=800)
lines = [
    (50, 750, '增值税专用发票', 18),
    (50, 710, '销售方名称：上海某某商贸有限公司', 13),
    (50, 685, '纳税人识别号：91310000MA1GH5XF2B', 13),
    (50, 660, '开票日期：2026年04月15日', 13),
    (50, 635, '合计：¥1,234.50', 13),
    (50, 610, '税率：13%', 13),
]
for x, y, text, size in lines:
    if os.path.exists(font_path):
        page_src.insert_text((x, y), text, fontsize=size, fontfile=font_path, fontname='CJK')
    else:
        page_src.insert_text((x, y), text, fontsize=size)
pix = page_src.get_pixmap(matrix=fitz.Matrix(2, 2))

# Step 2: embed pixmap as an image in a new PDF (no text layer)
doc_out = fitz.open()
page_out = doc_out.new_page(width=600, height=800)
page_out.insert_image(fitz.Rect(0, 0, 600, 800), stream=pix.tobytes("png"))
assert page_out.get_text().strip() == '', "unexpected text layer"
doc_out.save('aa-ocr/tests/fixtures/scanned_invoice.pdf')
print('scanned_invoice.pdf created')
EOF
```
