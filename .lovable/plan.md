

## Plan: Fix DealSummaryCard Parsing + Fallback

### 1. `parseDealSummary()` in `ContentCardRenderer.tsx` — More resilient parser

**Lines 300-362**: Improve deal row extraction:
- Relax the deal detection: currently requires `hasAddress || (stageMatch && priceMatch)`. Change to accept lines matching ANY TWO of: address, stage, price. Also accept lines with just a price + any descriptive text (treat the text as the address/label).
- Add a broader address pattern: also match lines like `"- Property Name | $450,000 | Active"` or markdown bold addresses like `**123 Main St**`.
- Return the raw content alongside parsed data: add `rawContent: string` to the return type so the card can fall back.

### 2. `DealSummaryCard.tsx` — Fallback when parsing fails

**Lines 50-128**: Add a `rawContent?: string` prop. When `deals.length === 0 && deadlines.length === 0 && rawContent`:
- Render the raw content as formatted markdown inside the card frame (keeps the Deal Summary header + blue accent) instead of showing "0 active deals"
- Only show the "N active deals" footer when `deals.length > 0`

### 3. `renderCardOnly()` + `renderSection()` — Add `deal_summary` hint support

**Line 14**: Add `"deal_summary"` to `ContentTypeHint` union.

**Lines 500-505** (end of `renderCardOnly`): Add a `deal_summary` branch before the default return — parse with `parseDealSummary`, pass `rawContent` to `DealSummaryCard` as fallback.

**Line 516**: Add `"deal_summary"` to the hint check so it gets the `splitCardFromConversation` treatment like other card types.

### Files Modified
- `src/components/chat/ContentCardRenderer.tsx` — parser improvements, hint support, rawContent passthrough
- `src/components/chat/DealSummaryCard.tsx` — rawContent fallback rendering, conditional footer

