

# Fix Content Card Detection and Rendering

## Changes

### 1. `src/components/chat/ContentCardRenderer.tsx`

**A. Replace `detectEmail` (lines 10-14):** Broader detection — handle markdown-wrapped headers (`**Subject:**`), match greeting+closing patterns even without Subject line.

**B. Replace `parseEmail` (lines 26-51):** Strip markdown bold from headers before matching, clean body of `**bold**` and `*italic*` artifacts, strip leading dashes/extra newlines.

**C. Replace `detectSocial` (lines 16-20):** Add Twitter/X/TikTok to platform list, detect hashtag-heavy content as social posts.

**D. Update `parseSocial` (lines 53-83):** Add markdown cleanup to `postContent` — strip wrapping quotes/backticks/asterisks and inline bold markers. Also update platform regex on line 54 to include new platforms.

### 2. `src/components/chat/EmailCard.tsx`

**Update "To" field (line 13):** If `to` is empty, show "Recipient" in muted style as placeholder.

## Files Modified: 2
- `src/components/chat/ContentCardRenderer.tsx`
- `src/components/chat/EmailCard.tsx`

