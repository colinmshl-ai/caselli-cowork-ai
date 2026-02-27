

## Problem

The screenshot shows AI responses rendering as a wall of text with no spacing between bold items. The root cause: **ReactMarkdown follows standard CommonMark spec where single `\n` is treated as whitespace, not a line break.** AI models (Claude included) output single newlines between items, expecting them to render as separate lines. Without double newlines or list markers, everything collapses into one paragraph.

Apps like ChatGPT, Vercel's AI SDK chat, and Claude.ai all solve this the same way — they either use `breaks: true` on their markdown renderer (which converts `\n` → `<br/>`) or use Vercel's `streamdown` library (purpose-built for AI streaming markdown).

## Fix

### 1. Enable `breaks` on all ReactMarkdown instances

Add the `remarkBreaks` plugin (from `remark-breaks`) to convert single newlines into `<br/>` elements. This is the standard approach used by ChatGPT-like interfaces. Apply to:

- **`ContentCardRenderer.tsx`** — the plain markdown fallback
- **`StreamingText.tsx`** — the streaming renderer  
- **`ConversationalRenderer.tsx`** — the markdown segments

### 2. Install `remark-breaks`

Add the `remark-breaks` package which provides a remark plugin for `react-markdown`.

### 3. Improve prose spacing CSS

Update the `PROSE_CLASSES` across all three files to add better paragraph and line spacing:
- Add `prose-p:leading-relaxed` for better line height
- Add `[&>p]:mb-3` for explicit paragraph bottom margin
- Add `prose-li:leading-relaxed` for list item readability

### Files to modify

- **`src/components/chat/ContentCardRenderer.tsx`** — Add `remarkBreaks` to the plain markdown `<ReactMarkdown>` calls, update prose classes
- **`src/components/chat/StreamingText.tsx`** — Add `remarkBreaks`, update prose classes
- **`src/components/chat/ConversationalRenderer.tsx`** — Add `remarkBreaks` to markdown segments, update prose classes
- **`package.json`** — Add `remark-breaks` dependency

