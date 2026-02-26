

# Phase 2: Chat Input Polish, Message Animations, Slide-Over Transitions

## 1. Add Keyframes to Tailwind Config (`tailwind.config.ts`)

Add these keyframes and animations to the `extend` block:

- `fade-in-up`: opacity 0→1, translateY 8px→0, 300ms ease-out (for message bubbles)
- `slide-in-right`: translateX 100%→0, 250ms ease-out (for slide-over panels)
- `fade-in`: opacity 0→1, 200ms (for overlay backdrop)

## 2. Polish Chat Input Area (`src/components/chat/ChatPanel.tsx`)

- Wrap the textarea + send button in a rounded pill container with `rounded-2xl border border-border bg-card shadow-sm` styling
- Add subtle focus-within ring: `focus-within:ring-1 focus-within:ring-ring`
- Make send button circular (`rounded-full`) and slightly larger
- Add padding inside the pill container

## 3. Animate Message Bubbles (`src/components/chat/ChatPanel.tsx`)

- Add `animate-fade-in-up` class to each message wrapper div
- Use staggered animation delay via inline style for messages loaded from history vs. new messages (new messages get the animation, history loads instantly)

## 4. Animate Typing Indicator (`src/components/chat/ChatPanel.tsx`)

- Add `animate-fade-in` to the typing indicator wrapper
- Add a pulsing dot animation (three dots) alongside the status text

## 5. Slide-Over Transitions (`ContactSlideOver.tsx` + `DealSlideOver.tsx`)

Both slide-overs currently render/hide with `if (!open) return null` — no animation. Change to:

- Always render the component (remove early return)
- Use CSS transitions on the panel: `transition-transform duration-250 ease-out` with `translate-x-full` when closed, `translate-x-0` when open
- Overlay backdrop: `transition-opacity duration-200` with `opacity-0 pointer-events-none` when closed
- This gives a smooth slide-in/slide-out effect without needing a library

## Files Modified: 4
- `tailwind.config.ts` — add keyframes + animation utilities
- `src/components/chat/ChatPanel.tsx` — pill input, message fade-in, typing dots
- `src/components/contacts/ContactSlideOver.tsx` — slide transition
- `src/components/deals/DealSlideOver.tsx` — slide transition

