# সাওম ফার্মেসি Invoice App

## Current State
- App is a full-screen invoice generator with a `max-w-5xl` container (960px max-width)
- The invoice table has `minWidth: 800px` and uses `tableLayout: fixed` with colgroup widths
- PDF download uses html2canvas + jsPDF to capture the `#invoice-content` div and fit it to A4 (210mm wide)
- There are no `@media print` CSS rules for scaling content down to A4
- Input fields are `height: 40px`, `fontSize: 14px`, bold dark text

## Requested Changes (Diff)

### Add
- `@media print` CSS block that scales `#invoice-content` (or `.invoice-content-wrapper`) to fit A4 width using CSS `transform: scale()` or `zoom`, so the full-width content shrinks to fit when printing
- Wider screen layout for the input area: increase container max-width to `max-w-7xl` or full width so inputs are spacious during data entry
- Print-specific styles: hide `.no-print` elements, remove padding/margins that waste A4 space, ensure the invoice fills A4 width

### Modify
- Main container: change `max-w-5xl` to `max-w-7xl` (or wider) for screen view so inputs are wider and easier to use
- Invoice table: increase `minWidth` and column widths proportionally so they are wider on screen (e.g. medicine name col from 220px to 300px+)
- The `handlePdfDownload` function: before capturing with html2canvas, temporarily apply a fixed A4-width wrapper style so the captured content is exactly A4-proportioned (set invoice container to 794px wide = A4 at 96dpi, capture, then restore)
- Add CSS variable or class to set invoice content width to 794px during PDF capture, then restore to full width after

### Remove
- Nothing to remove

## Implementation Plan
1. In `index.css` or inline `<style>` in `index.html`: add `@media print` CSS that:
   - Hides `.no-print` elements
   - Sets `html, body` to margin 0, padding 0
   - Sets `#invoice-content` or `.invoice-content-wrapper` to width 100%, removes overflow
   - Applies `transform-origin: top left` + `transform: scale(0.75)` or uses `zoom: 75%` to shrink content to fit A4 (adjust percentage to make the wide layout fit)
   - Uses `@page { size: A4; margin: 5mm; }` directive
2. In `App.tsx`: change outer container from `max-w-5xl` to `max-w-full` (or `max-w-screen-2xl`) with `px-8` padding, so screen view is wide
3. In the invoice table colgroup: widen columns (medicine name: 320px, others proportionally) to use the extra screen space
4. In `handlePdfDownload`: before calling html2canvas, set `#invoice-content` to `width: 794px` and `overflow: visible`, capture at scale 3, then restore original styles
5. Validate and build
