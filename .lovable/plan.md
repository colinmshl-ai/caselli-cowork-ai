

## Mobile Experience Improvements

### 1. Floating glass input bar — `ChatPanel.tsx`
**Lines 937-970**: Change the input container from `sticky bottom-0` to use responsive positioning:
- On mobile (`md:` breakpoint): `fixed bottom-0 left-0 right-0 backdrop-blur-xl bg-background/80`
- On desktop: keep current `sticky bottom-0 bg-background`
- Add `pb-safe` for iOS safe area on mobile
- The messages area (line 795) needs extra bottom padding on mobile to account for the fixed input bar (~80px + safe area)

### 2. Activity panel — reduce to 60vh + drag handle — `Chat.tsx`
**Line 110**: Change `max-h-[75vh]` to `max-h-[60vh]`
**Lines 117-128**: Add a drag handle div at the top of the panel (before the header):
```tsx
<div className="flex justify-center pt-2 pb-1">
  <div className="w-8 h-1 rounded-full bg-muted-foreground/30" />
</div>
```
Also add `slide-in-from-bottom-5` to the mobile animation classes (replacing `slide-in-from-right-3` on mobile).

### 3. Tool progress cards — immediate collapse on mobile — `ToolProgressCard.tsx`
Import `useIsMobile` hook. In the component, if `isMobile` is true, start with `collapsed = true` (skip the 3s delay entirely) and always render the inline badge form. The expanded card only shows on desktop or on hover.

### 4. Card action buttons vertical stacking on mobile — `SocialPostCard.tsx`, `EmailCard.tsx`, `CardActions.tsx`
- `SocialPostCard.tsx` footer (line ~92): Change the actions container from `flex items-center` to `flex flex-col sm:flex-row items-stretch sm:items-center` on the button row
- `CardActions.tsx`: Wrap the buttons in `flex flex-col sm:flex-row` 
- `EmailCard.tsx`: Same pattern for the action button row
- `ListingCard.tsx`: Same pattern for footer actions

### 5. Filled icon variants for active mobile nav — `AppLayout.tsx`
Lucide doesn't have filled variants, so use a visual workaround:
- Active icon gets a subtle filled background circle: wrap the icon in a `<span>` with `bg-primary/10 rounded-lg p-1` when active
- Combined with the existing color change and top bar indicator, this creates a clear filled-state visual

### 6. Pull-to-refresh on chat — `ChatPanel.tsx`
Add a touch-based pull-to-refresh at the top of the messages scroll area:
- Track `touchstart`/`touchmove`/`touchend` on the scroll container
- When scrolled to top and pulling down > 60px threshold, show a small refresh indicator
- On release past threshold, call `startNewChat()` or reload current conversation if `activeConvoId` exists
- Use a state variable `pullDistance` to animate a small spinner/arrow at the top

### Files modified:
- `src/components/chat/ChatPanel.tsx` — floating input, pull-to-refresh
- `src/pages/Chat.tsx` — activity panel 60vh + drag handle
- `src/components/chat/ToolProgressCard.tsx` — instant collapse on mobile
- `src/components/chat/SocialPostCard.tsx` — vertical action stacking
- `src/components/chat/CardActions.tsx` — vertical action stacking
- `src/components/chat/EmailCard.tsx` — vertical action stacking
- `src/components/AppLayout.tsx` — filled active icon state

