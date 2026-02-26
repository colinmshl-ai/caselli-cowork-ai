

# Improve Content Cards with Actions and Metadata

## Changes

### 1. New file: `src/components/chat/CardActions.tsx`
Shared action bar component used by all content cards with:
- **Regenerate** button (sends "Regenerate this [type]" to chat)
- **Adjust tone** dropdown using brand tones from business profile (professional, casual, luxury, friendly)
- Both trigger chat messages via an `onAction` callback prop

### 2. Update `src/components/chat/SocialPostCard.tsx`
- Add platform icon in header (Camera for Instagram, MessageCircle for Twitter/X, Users for Facebook, Linkedin for LinkedIn, Video for TikTok)
- Add character limit bar: show warning text + color when near/over limit (Instagram 2200, Twitter 280, Facebook suggests 500)
- Add "Edit" button → calls `onAction("Edit this post: make changes as needed")` to populate chat
- Add "Create for another platform" button → opens small dropdown of other platforms, sends "Adapt this post for [Platform]" to chat
- Add word count alongside character count
- Include `CardActions` at bottom

### 3. Update `src/components/chat/EmailCard.tsx`
- Show word count + character count in footer
- Add "Send" button → shows toast "Coming soon — connect Gmail in Settings"
- Add "Save as draft" button → inserts into a new `email_drafts` table (or just shows toast "Draft saved" with local state for now — no new table needed, store in `task_history` with type `email_draft`)
- Include `CardActions` at bottom

### 4. Update `src/components/chat/ContentCardRenderer.tsx`
- Pass an `onAction` callback through to all card components
- Cards call `onAction(message)` which bubbles up to ChatPanel's `sendMessage`

### 5. Update `src/components/chat/ChatPanel.tsx`
- Pass `sendMessage` as `onAction` prop to `ContentCardRenderer`
- ContentCardRenderer passes it down to each card

### 6. Update `src/components/chat/ListingCard.tsx`
- Add `CardActions` at bottom for consistency

## Props flow
```text
ChatPanel (sendMessage)
  → ContentCardRenderer (onAction)
    → SocialPostCard / EmailCard / ListingCard (onAction)
      → CardActions (onAction)
```

## Files modified: 6
- `src/components/chat/CardActions.tsx` (new)
- `src/components/chat/SocialPostCard.tsx`
- `src/components/chat/EmailCard.tsx`
- `src/components/chat/ListingCard.tsx`
- `src/components/chat/ContentCardRenderer.tsx`
- `src/components/chat/ChatPanel.tsx`

No database changes needed.

