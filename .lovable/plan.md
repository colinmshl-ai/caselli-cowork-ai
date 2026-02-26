

## Mobile Responsiveness Audit & Fix Plan

### Current State Analysis

After reviewing all files, here's what already works and what needs fixing:

**Already working well:**
- Navigation: Bottom tab bar on mobile and nav rail on desktop are already implemented in `AppLayout.tsx`
- Chat: Mobile tab toggle between "Chat" and "Activity" already exists in `Chat.tsx`
- Landing page: Hero, features, and pricing already stack with responsive grid classes
- Settings: Already single-column layout
- Login/Signup: Already centered, mobile-friendly
- Onboarding: Already max-width 480px, works on mobile

**Issues to fix:**

### 1. Chat Input — Not Sticky Above Keyboard
`ChatPanel.tsx` line 217-233: The input area uses `border-t` but is not positioned sticky. On mobile, when the keyboard opens, the input scrolls out of view.

**Fix:** Add a wrapper with mobile-safe positioning. The chat panel is already inside a flex column, so making the input container `sticky bottom-0` with `bg-background` will keep it visible.

### 2. Deals — No Mobile Card Layout
`Deals.tsx` lines 158-202: Currently renders as flat row items on all screen sizes. On mobile, key info like client name and closing date are hidden via `hidden sm:inline` and `hidden md:inline`.

**Fix:** On mobile (`md:` breakpoint), render deal items as stacked cards showing property address, client name, stage, and deadline status. Keep the current row layout for desktop.

### 3. Contacts — No Mobile Card Layout  
`Contacts.tsx` lines 134-157: Same issue as Deals — company and phone are hidden on mobile.

**Fix:** Show all key info in a card-style layout on mobile.

### 4. DealSlideOver — Not Full-Screen on Mobile
`DealSlideOver.tsx` line 187: Uses `max-w-[480px]` which is fine for desktop, but on mobile the overlay still has the same sizing.

**Fix:** Already uses `w-full max-w-[480px]` — on mobile screens (<480px) it's effectively full-width. But we should remove the `max-w` on mobile explicitly and ensure proper safe-area handling. Also increase touch targets on buttons.

### 5. ContactSlideOver — Not Full-Screen on Mobile
`ContactSlideOver.tsx` line 95: Same as DealSlideOver.

**Fix:** Same approach — ensure full-screen on mobile.

### 6. Onboarding — Touch Target Sizes & Input Modes
`Onboarding.tsx`: Inputs use `py-2.5` (approx 40px total height). Specialty buttons use `py-1.5` (too small). No `inputMode` attributes for email/tel fields.

**Fix:** Increase button touch targets to min 44px, add `inputMode` attributes to appropriate fields.

### 7. Touch Targets Across App
Several interactive elements are below the 44px minimum:
- Filter buttons in Deals/Contacts: `py-1.5` with `text-xs` (about 28px)
- Quick action buttons in ActivityPanel: `py-1.5` (about 28px)
- Nav bottom tab items need at minimum 44px hit areas
- Settings checkboxes and radio buttons need larger tap areas

### 8. App.css — Contains Unused Boilerplate
`App.css` has Vite boilerplate styles that could cause visual issues. Should be cleaned.

---

### Implementation Plan

#### File: `src/components/chat/ChatPanel.tsx`
- Make the input container sticky at the bottom with `sticky bottom-0 bg-background z-10`

#### File: `src/pages/Deals.tsx`
- Restructure deal list items: on mobile, show as stacked cards with address on first line, client + stage on second line, deadline badge visible
- Show closing date and "Deadline soon" badge on mobile too
- Increase filter button touch targets to min-h-[44px]

#### File: `src/pages/Contacts.tsx`  
- Show company and phone on mobile in a stacked card layout
- Increase filter button touch targets

#### File: `src/components/deals/DealSlideOver.tsx`
- Add `md:max-w-[480px]` (remove max-w on mobile so it's truly full-screen)
- Increase save/cancel button heights to 44px minimum

#### File: `src/components/contacts/ContactSlideOver.tsx`
- Same full-screen mobile treatment
- Increase button touch targets

#### File: `src/pages/Onboarding.tsx`
- Add `inputMode="email"` to email fields, `inputMode="tel"` to phone
- Increase specialty button padding to `py-2.5` (44px)
- Increase all Next/Back buttons to `py-3` on mobile

#### File: `src/components/chat/ActivityPanel.tsx`
- Increase quick action button padding to `py-2.5` for 44px touch targets

#### File: `src/components/AppLayout.tsx`
- Ensure bottom tab bar items have min-h-[44px] touch areas

#### File: `src/pages/Settings.tsx`
- Increase checkbox/radio label areas to 44px height
- Increase save button touch targets

#### File: `src/pages/Login.tsx` & `src/pages/Signup.tsx`
- Add `inputMode="email"` to email inputs
- Inputs are bottom-border style at ~32px height — increase touch target to 44px with more padding

#### File: `src/App.css`
- Remove Vite boilerplate styles (logo spin, .card, .read-the-docs, etc.)

**Total files modified: 11**  
**No database changes needed. No new dependencies.**

