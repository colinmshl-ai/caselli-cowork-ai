

# Improve Multi-Tool Response Display in Chat

## Changes

### 1. `src/components/chat/ChatPanel.tsx` — Improve tool status pills + clickable entity links

**Tool status pills (lines 22-37):** Redesign `TypingIndicator` to show pill/chip badges instead of plain text:
- Completed tools: green-tinted pill with `✓` prefix, e.g. `✓ Deal created`
- Active tool: pulsing primary-tinted pill with spinner dots, e.g. `Creating deal...`
- Style: `inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs bg-green-50 text-green-700` for completed, `bg-primary/10 text-primary` for active

**Clickable entity references in assistant messages (lines 541-547):**
- After `ContentCardRenderer`, post-process the rendered content to find deal/contact names and wrap them with `<Link>` to `/deals` or `/contacts`
- Simpler approach: add a new `EntityLinker` wrapper component that uses regex to detect patterns like deal addresses or contact names from the conversation context, and replaces them with clickable links
- Since deals/contacts pages use slide-overs (no individual routes), link to `/deals?highlight=<id>` and `/contacts?highlight=<id>` using IDs from the `done` SSE event

**Store entity IDs on messages (line 362-378):**
- After streaming completes, attach `lastDealId` and `lastContactId` from the `done` event payload to the message state so `EntityLinker` can use them

### 2. `src/components/chat/ContentCardRenderer.tsx` — Split multi-content blocks with dividers

Update the renderer to detect when content contains **multiple** content types (e.g., intro text + social post + email) and split them with `<Separator />` dividers:
- Split content on `---` or double newlines between distinct content sections
- Detect each section independently and render the appropriate card
- Add `<Separator className="my-3" />` between sections
- Wrap each card section in a div with `animate-fade-in-up` and staggered `animation-delay`

### 3. `src/components/chat/SocialPostCard.tsx`, `EmailCard.tsx`, `ListingCard.tsx` — Add entrance animation

Wrap each card's root div with the `animate-fade-in-up` class (already defined in tailwind config).

### 4. New: `src/components/chat/EntityLinker.tsx` — Clickable entity names

Small component that:
- Receives `content` (ReactNode), `dealId`, `contactId`
- Wraps the rendered output and adds click handlers on elements matching deal/contact patterns
- Simpler implementation: just add small clickable badges below the message like `🏠 View deal` / `👤 View contact` when IDs are present, linking to `/deals?highlight=<id>` and `/contacts?highlight=<id>`

## Files modified: 5
- `src/components/chat/ChatPanel.tsx` — pill-styled tool indicators, entity ID tracking on messages, entity link badges
- `src/components/chat/ContentCardRenderer.tsx` — multi-section splitting with dividers
- `src/components/chat/SocialPostCard.tsx` — fade-in animation class
- `src/components/chat/EmailCard.tsx` — fade-in animation class
- `src/components/chat/ListingCard.tsx` — fade-in animation class

No database or edge function changes needed.

