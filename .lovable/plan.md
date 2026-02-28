

## Plan: Robust Error Handling — No Empty Cards

### 1. `ContentCardRenderer.tsx` — Minimum content guards

Add minimum content length checks before rendering each card type in `renderCardOnly()`:
- **Email**: body must be ≥ 50 chars, else fall back to markdown
- **Social post**: postContent must be ≥ 20 chars, else fall back to markdown
- **Listing**: description must be ≥ 30 chars, else fall back to markdown
- **Property enriched**: address must not be "Property" (the default fallback) AND at least one stat (beds/baths/sqft) must exist, else fall back to markdown

This extends the existing empty-string checks (lines 413, 433, 453) to also reject too-short content.

### 2. `ChatPanel.tsx` — Error message styling + retry

**Lines 727-732**: When rendering an assistant message with `isError: true`, apply a red-tinted background:
- Add conditional class: `m.isError ? "bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-3" : ""`

The retry button already exists (lines 766-774) and works correctly — no change needed there.

### 3. `StreamingText.tsx` — Empty content fallback

After the stream completes, the final content update at line 473 already handles empty content with a fallback string. However, `StreamingText` itself (used during streaming) should handle empty/whitespace content gracefully:
- If `content.trim()` is empty, render a subtle "Generating response..." placeholder instead of a blank div with a cursor

### 4. `supabase/functions/chat/index.ts` — Specific error messages + contentType reset

**Lines 1296-1307** (non-retryable errors): Already has specific messages for 429 and context window errors. These are good. No change needed here.

**Lines 1647-1653** (outer catch): Currently sends raw error message. Improve to send a more user-friendly message.

**Lines 1452-1471** (content type derivation): Add a guard — if `fullText` is empty or too short (< 20 chars), force `contentType = "conversational"` regardless of tools used. This prevents empty card shells when the AI returns a short error-like response after tool use.

**Line 1575** (done event): When sending the done event after an error path, ensure contentType is "conversational".

### Files Modified
- `src/components/chat/ContentCardRenderer.tsx` — min-length guards in `renderCardOnly()`
- `src/components/chat/ChatPanel.tsx` — error message styling
- `src/components/chat/StreamingText.tsx` — empty content fallback
- `supabase/functions/chat/index.ts` — force conversational contentType on short/empty responses

