

## Fix Social Posts Rendering as EmailCards

### Problem
In the regex fallback path (old messages without `contentTypeHint`), `detectEmail()` runs before `detectSocial()`. When the AI formats a social post with "To: Your Instagram Business Account", `detectEmail()` matches first and renders an EmailCard.

Note: New messages already have `contentTypeHint` from the backend, so this only affects old messages or edge cases where the hint is missing.

### Changes

**1. `src/components/chat/ContentCardRenderer.tsx` — Reorder detection + add negative check**

- In the fallback regex section (lines 313-353), move `detectSocial()` check BEFORE `detectEmail()`
- In `detectEmail()`, add a negative guard: if `detectSocial()` also matches, return `false`

**2. `supabase/functions/chat/index.ts` — Update system prompt**

- Add a formatting instruction to the system prompt (around line 595) telling the AI to never use email-like headers (`To:`, `Subject:`) when drafting social posts. Social posts should use the format: `**Instagram Post:**` followed by the content and hashtags.

### Files Modified
- `src/components/chat/ContentCardRenderer.tsx`
- `supabase/functions/chat/index.ts`

