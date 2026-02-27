

## Fix ContentCardRenderer False Positives

### Problem
Regex detection (`detectEmail`, `detectSocial`, `detectListing`) fires on conversational responses containing keywords, showing interactive card UI (Regenerate/Adjust tone) on non-draft content.

### Approach
Two-layer fix: (1) backend sends `content_type` metadata on messages, (2) frontend checks metadata first, falls back to tightened regex with a conversational guard.

### Changes

**1. Backend: Tag messages with `content_type` in `supabase/functions/chat/index.ts`**

- After the tool loop completes, derive `content_type` from `toolCallLog`:
  - If any tool is `draft_social_post` → `"social_post"`
  - If any tool is `draft_email` → `"email"`  
  - If any tool is `draft_listing_description` → `"listing_description"`
  - Otherwise → `"conversational"`
- Include `content_type` in the message metadata saved to the DB (alongside existing `tools` field)
- Include `content_type` in the `done` SSE event payload

**2. Frontend: Pass `content_type` through `ChatPanel.tsx`**

- Capture `content_type` from the `done` SSE event
- Store it on the message object (similar to how `toolsUsed` is attached)
- Pass it to `ContentCardRenderer` as a new `contentTypeHint` prop
- When loading messages from DB, read `metadata.content_type` and pass it through

**3. Frontend: Update `ContentCardRenderer.tsx` detection logic**

- Add `contentTypeHint` prop to the component
- If `contentTypeHint` is set and not `"conversational"`, use it directly to pick the card type — skip regex entirely
- If `contentTypeHint` is `"conversational"` or missing (old messages), apply tightened regex:

**Tightened regex rules:**
- `detectConversational()` — new function, checked first. Returns true if content starts with question words (`What`, `How`, `Would`, `Do you`, `I'd`, `Here's`, `Let me`), or contains `"here's what"`, `"I'd recommend"`, `"let me know"`, `"want me to"`, or has numbered next-steps (`\n1. `). If true, skip all card detection.
- `detectEmail()` — require BOTH `Subject:` AND `To:` lines (change `||` to `&&`)
- `detectSocial()` — require platform name at the start of the content in a header pattern like `**Instagram Post:**` or `Instagram Post:` (anchor to first 2 lines, require `Post:` or `Caption:` after platform name)
- `detectListing()` — require property address pattern (digit + street) on its own line AND bed/bath on a separate line (not inline mentions)

**4. No database migration needed**
The `metadata` column is `jsonb` — adding `content_type` to the JSON object requires no schema change.

### Files Modified
- `supabase/functions/chat/index.ts` — add `content_type` to metadata and done event
- `src/components/chat/ChatPanel.tsx` — capture and pass `content_type`
- `src/components/chat/ContentCardRenderer.tsx` — add `contentTypeHint` prop, `detectConversational()`, tighten all detect functions

