# সাওম ফার্মেসি ইনভয়েস অ্যাপ

## Current State
- Saum Pharmacy invoice generator with wholesaler (left) and pharmacy (right) header cards
- Medicine table with autocomplete, quantity, unit price, total columns
- PDF download using jsPDF + autoTable (English-only font, Bangla breaks)
- Print via browser which supports Bangla via CSS font (Hind Siliguri)
- Wholesaler and pharmacy input fields use standard Input components
- Invoice design is functional but basic

## Requested Changes (Diff)

### Add
- Horizontal scroll (`overflow-x: auto; white-space: nowrap`) on wholesaler info input fields (name, address, mobile) so long text can be scrolled left-right
- Horizontal scroll on pharmacy info display fields similarly
- Bangla Unicode font embedded directly in jsPDF PDF download (using a subset of Noto Sans Bengali or SutonnyMJ base64 font)
- Premium, colorful, corporate-level invoice design: gradient header, colored section dividers, styled table with alternating row colors, bold totals section, decorative accents

### Modify
- `handlePdfDownload`: Replace English-only jsPDF text rendering with Bangla-capable font. Strategy: use `html2canvas` + `jsPDF` to capture the rendered HTML invoice (which already uses Hind Siliguri Bengali font via print CSS), then embed as image in PDF — this guarantees identical Bangla rendering to the print version
- Invoice card UI: upgrade to premium corporate look with richer colors, better typography, gradient headers, professional table styling
- Wholesaler and pharmacy info sections: add `overflow-x: auto` containers so long field values scroll horizontally

### Remove
- Nothing removed

## Implementation Plan
1. Install `html2canvas` if not present (check package.json)
2. Modify `handlePdfDownload` to: show loading, use html2canvas to capture `#invoice-content` div, create jsPDF with A4 dimensions, add captured image, save PDF
3. Add `overflow-x: auto; whitespace-nowrap` to wholesaler input wrappers and pharmacy info value cells
4. Redesign invoice UI: premium gradient header bar, teal/blue/indigo color palette, decorative top border, professional card shadows, refined table with colored header, alternating rows, bold total section with background highlight
5. Validate and deploy
