

## Plan: Fix Content Card False Positives

### Problem
1. `detectSocial()` is too loose — triggers on conversational text mentioning platform names
2. Card actions (Regenerate, char counts) appear on all detected cards, even informational ones

### Changes

#### 1. Fix `detectSocial()` in `ContentCardRenderer.tsx` (line 19-24)
Replace with stricter detection requiring: platform name in first 3 lines + hashtags + not conversational text.

#### 2. Add `contentType` prop to `ContentCardRenderer` (line 7-10, 141, 192-213)
- Add `contentType?: "drafted" | "informational"` prop
- Thread it through `renderSection()` to `SocialPostCard`, `EmailCard`, `ListingCard`

#### 3. Update `SocialPostCard.tsx`
- Add `contentType?: "drafted" | "informational"` prop
- Only render footer stats row and card actions when `contentType === "drafted"`

#### 4. Update `EmailCard.tsx`
- Add `contentType?: "drafted" | "informational"` prop
- Only render footer stats/actions when `contentType === "drafted"`

#### 5. Update `ListingCard.tsx`
- Add `contentType?: "drafted" | "informational"` prop
- Only render footer stats/actions when `contentType === "drafted"`

#### 6. Update `ChatPanel.tsx` (line 641-645)
- When rendering assistant messages, check if message was produced by a draft tool (from `toolsUsed` in the SSE `done` event)
- Store `toolsUsed` on the message object alongside content
- Pass `contentType="drafted"` or `contentType="informational"` to `ContentCardRenderer`

Specifically: in the SSE streaming path, attach `toolsUsed` to the message. In the render, check if any tool in the message's `toolsUsed` array is in `CONTENT_TOOLS` (`draft_social_post`, `draft_email`, `draft_listing_description`). If yes, pass `"drafted"`, otherwise `"informational"`.

### Files Modified
- `src/components/chat/ContentCardRenderer.tsx`
- `src/components/chat/SocialPostCard.tsx`
- `src/components/chat/EmailCard.tsx`
- `src/components/chat/ListingCard.tsx`
- `src/components/chat/ChatPanel.tsx`

