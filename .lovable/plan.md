

# Fix Mobile Responsiveness

After reviewing all pages, the mobile support is already fairly solid — the app uses responsive classes, `min-h-[44px]` touch targets, `pb-safe`, and keyboard-aware viewport handling. Here are the specific fixes needed:

## Files to modify

### 1. `src/pages/Settings.tsx`
- Make Save buttons full-width on mobile: add `w-full md:w-auto` to `SaveBtn`
- Add `px-4` mobile padding and proper bottom spacing

### 2. `src/pages/Deals.tsx`
- Stage filter tabs already use `overflow-x-auto` and `whitespace-nowrap` — working correctly
- Deal cards already have separate mobile/desktop layouts — working correctly
- The slide-over is already full-width on mobile (`w-full md:max-w-[480px]`) — working correctly

### 3. `src/components/chat/ChatPanel.tsx`
- Chat input is already `sticky bottom-0` with `pb-safe` — working correctly
- Activity panel already collapses to tabs in `Chat.tsx` — working correctly
- Starter prompt grid: change `grid-cols-1 sm:grid-cols-2` to just `grid-cols-1` on both instances (at 375px, even single-column cards can feel tight with 2 cols at sm breakpoint — this is fine as-is since sm=640px)
- Content cards already use `max-w-[85%]` — working correctly

### 4. `src/pages/Contacts.tsx`
- Search is already pinned to top in the header — working correctly
- Cards are already full-width — working correctly

### 5. `src/pages/Onboarding.tsx`
- All buttons already have `min-h-[44px]` — working correctly
- Add `px-5` instead of `px-4` for slightly more breathing room on small screens
- Specialty buttons and brand tone cards are already touch-friendly

## Actual issues found

1. **Settings Save button not full-width on mobile** — `SaveBtn` uses `px-4` fixed width, should be `w-full md:w-auto`
2. **Settings "Manage Subscription" button not full-width on mobile** — same fix
3. **Settings content area missing bottom safe padding** — already has `pb-12` but should add `pb-safe` class
4. **Chat input area**: `sticky bottom-0` works but on iOS Safari with the bottom nav bar, there can be overlap. The `pb-safe` is on the input container but the `pb-[calc(3.5rem+env(safe-area-inset-bottom))]` on `<main>` in AppLayout already accounts for the nav bar height. This is correct.

## Implementation

### `src/pages/Settings.tsx`
- Update `SaveBtn` to use `w-full md:w-auto`
- Update "Manage Subscription" button to `w-full md:w-auto`

### `src/pages/Onboarding.tsx`
- Minor: no changes needed, already mobile-optimized

### Summary
Only `Settings.tsx` needs changes — the rest of the app is already well-structured for mobile. The SaveBtn and Manage Subscription button need `w-full md:w-auto` for full-width on mobile.

