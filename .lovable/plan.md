

## Problem

Looking at the screenshot, the AI's conversational responses render as a dense wall of text with no visual hierarchy. The ✅ confirmation, the "Here's what I'd suggest next" list, and the closing question all blend together, making it hard to scan.

## Root Cause

`ContentCardRenderer` renders all conversational text through a single `ReactMarkdown` block with very tight spacing (`prose-p:my-1 prose-ul:my-1 prose-li:my-0.5`). There's no visual distinction between confirmation lines, suggestion lists, and follow-up questions.

## Plan

### 1. Improve prose spacing and typography for AI responses

In `ContentCardRenderer.tsx`, update the prose class string used for conversational/markdown rendering:
- Increase paragraph spacing: `prose-p:my-2` instead of `my-1`
- Increase list spacing: `prose-ul:my-2 prose-li:my-1`
- Add `prose-ul:pl-4` for better list indentation
- Add link styling: `prose-a:text-primary`

### 2. Style ✅ confirmation lines as inline badges

Add post-processing in `ContentCardRenderer` that detects lines starting with `✅` and wraps them in a styled confirmation banner — a subtle green-tinted pill/bar with the confirmation text, visually separated from the rest.

This will be a new small component `ConfirmationBanner` rendered before the remaining markdown content.

### 3. Style "next steps" lists as action cards

When the AI response contains a line like "Here's what I'd suggest next:" followed by plain-text bullet-like lines, render each suggestion as a tappable mini-card (border, slight padding, hover state) that sends the suggestion text as the next message — similar to how suggestion chips work but inline.

### 4. Separate the closing question visually

Detect trailing question lines (ending with `?` after a list or confirmation block) and render them with slightly different styling — a top margin separator and muted italic treatment to differentiate from the main content.

### Files to modify

- `src/components/chat/ContentCardRenderer.tsx` — Add pre-processing to split conversational responses into segments (confirmation, suggestions, closing question) and render each with appropriate styling
- `src/index.css` — No changes needed; styling via Tailwind utility classes

### Technical approach

Add a `renderConversational(section)` function in `ContentCardRenderer` that:
1. Extracts `✅` lines → renders as styled confirmation banners
2. Extracts suggestion lists (lines after "suggest" / "recommend" patterns) → renders as clickable mini-cards
3. Renders remaining text as markdown with improved spacing
4. All within the existing conversational rendering path (no changes to card detection logic)

