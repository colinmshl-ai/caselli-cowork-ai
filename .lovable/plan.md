

# Mobile Responsiveness Improvements

## 1. `index.html` — Add viewport-fit for safe areas
- Add `viewport-fit=cover` to the existing viewport meta tag to enable `env(safe-area-inset-bottom)`

## 2. `src/index.css` — Add safe-area utility
- Add a `pb-safe` utility class: `padding-bottom: env(safe-area-inset-bottom)`

## 3. `src/components/chat/ChatPanel.tsx` — Keyboard handling
- Add a `useEffect` that listens to `window.visualViewport` `resize` event
- Track `keyboardHeight` state = `window.innerHeight - visualViewport.height`
- Apply `keyboardHeight` as extra bottom padding on the messages scroll container (line 315) via inline style
- Change input container (line 363) from `sticky bottom-0` to include `pb-safe` class for home indicator spacing

## 4. `src/pages/Contacts.tsx` — Mobile card refinement
- Already has separate mobile/desktop layouts with `md:hidden` / `hidden md:flex`
- Refine mobile card: ensure first line has name + type badge, second line has email · phone with middle dot separator
- Current implementation already does this — minor cleanup to add `·` separator between email/phone

## 5. `src/components/deals/DealSlideOver.tsx` — Mobile drag handle
- After the panel `<div>` opens (line 187), before the header, add a `md:hidden` drag handle bar:
  ```
  <div className="flex justify-center pt-2 md:hidden">
    <div className="h-1 w-8 rounded-full bg-muted-foreground/30" />
  </div>
  ```

## 6. `src/components/contacts/ContactSlideOver.tsx` — Same drag handle
- Same drag handle addition after the panel div opens

## 7. `src/components/AppLayout.tsx` — Bottom nav safe area
- Add `pb-safe` to the mobile bottom nav bar (currently `h-14`)
- Update main content `pb-14` to account for safe area

## Files changed: 7
- `index.html` (viewport-fit)
- `src/index.css` (pb-safe utility)
- `src/components/chat/ChatPanel.tsx` (keyboard handling + safe area)
- `src/pages/Contacts.tsx` (minor mobile card refinement)
- `src/components/deals/DealSlideOver.tsx` (drag handle)
- `src/components/contacts/ContactSlideOver.tsx` (drag handle)
- `src/components/AppLayout.tsx` (safe area on bottom nav)

