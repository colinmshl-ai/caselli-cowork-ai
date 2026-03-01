

## Fix Content Card Type Detection in ContentCardRenderer

### File: `src/components/chat/ContentCardRenderer.tsx`

### 1. Replace boolean detectors with confidence-score functions

Replace `detectSocial`, `detectEmail`, `detectDealSummary`, `detectListing`, `detectPropertyEnriched`, and `detectConversational` with versions returning a number 0–1.

**`detectSocialConfidence(content)`** — returns 0–1:
- Platform keyword must be in first 3 non-empty lines (+0.4)
- Has hashtags (+0.2)
- Has "drafted" characteristics: emoji density >1% (+0.1), quotes present (+0.1)
- Has "Post" or "Caption" header format (+0.2)
- If platform keyword only appears in conversational phrasing like "I can adapt this for Instagram", return 0

**`detectEmailConfidence(content)`** — returns 0–1:
- "Subject:" in first 5 non-empty lines (+0.4)
- "To:" present (+0.15)
- Has body (≥2 lines after subject) (+0.35)
- Deduct if also looks social (return 0 if social confidence > 0.5)

**`detectDealSummaryConfidence`**, **`detectPropertyEnrichedConfidence`**, **`detectListingConfidence`**, **`detectConversationalConfidence`** — similar refactors, keeping existing logic but returning weighted scores.

### 2. Restructure `renderSection()` — hint-first, confidence fallback

```
function renderSection(section, onAction, contentType, contentTypeHint) {
  // 1. Backend hint takes absolute priority
  if (contentTypeHint && contentTypeHint !== "conversational") {
    const card = renderCardOnly(section, onAction, contentType, contentTypeHint);
    if (card) return card; // hint succeeded
  }
  if (contentTypeHint === "conversational") {
    return <ConversationalRenderer ... />;
  }

  // 2. Confidence-based fallback (only for old messages without hints)
  const scores = {
    conversational: detectConversationalConfidence(section),
    property_enriched: detectPropertyEnrichedConfidence(section),
    social_post: detectSocialConfidence(section),
    email: detectEmailConfidence(section),
    deal_summary: detectDealSummaryConfidence(section),
    listing: detectListingConfidence(section),
  };
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];

  // Only render as card if confidence > 0.7
  if (best[1] > 0.7) {
    // render using existing card+tail splitting logic for best[0] type
  }

  // 3. Default: conversational markdown
  return <ConversationalRenderer content={section} onAction={onAction} />;
}
```

### 3. Update `renderCardOnly` signature

Add the hint as the 4th parameter (already exists), but also accept the section for card+tail splitting inside `renderSection`. The existing `renderCardOnly` already handles all hint types — no signature change needed, just ensure it's called with `splitCardFromConversation` result.

### 4. Fallback always renders conversational markdown

Change the final fallback (line 710-714) from plain `ReactMarkdown` to `<ConversationalRenderer>` so ambiguous content never gets forced into a card.

### Files modified:
- `src/components/chat/ContentCardRenderer.tsx`

