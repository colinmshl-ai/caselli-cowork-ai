

## Fix: Poor Formatting in Conversational Responses

### Problem

Looking at the screenshot, the AI response about "6837 Rathbone Pl" renders as a flat wall of text with no bullet points, no paragraph spacing, and no visual hierarchy. Two issues cause this:

1. **`ConversationalRenderer.parseConversational()` breaks markdown** — It splits content into lines and reclassifies them, but lines that are part of markdown lists (starting with `-`, `•`, or numbers) get misidentified. The "Next steps I can help with:" line triggers the `inSuggestions` regex, and everything after it gets consumed as suggestion items — but the preceding list items ("Square footage", "Recent comparable sales", etc.) fall through to `markdownLines` without their original list markers. The result: bullet items render as plain paragraphs.

2. **`detectConversational()` is too aggressive** — It matches on "I can see" (via the `I can` pattern), routing nearly all informational responses through `ConversationalRenderer` instead of plain `ReactMarkdown`, which would render the markdown properly.

### Fix

**File: `src/components/chat/ConversationalRenderer.tsx`**

The `parseConversational` function needs to stop stripping markdown structure. Two changes:

1. **Detect all list blocks as markdown, not just suggestion items** — When we encounter bulleted/numbered lines that are NOT preceded by a suggestion header, keep them in `markdownLines` with their original formatting intact (don't strip the `- ` prefix).

2. **Only activate suggestion mode when the header specifically says "next steps" or "suggestions"** — The current regex matches "here are", "you can", "I can help" etc. which catches too many normal paragraphs. Tighten it to only match lines that are clearly offering clickable next-step suggestions (e.g., "Next steps I can help with:", "Here are some suggestions:").

3. **Preserve the original line content** — Currently `markdownLines.push(line)` is correct, but the suggestion regex eats lines that should stay as markdown. After fixing the regex, the markdown block will contain the full list and `ReactMarkdown` will render it properly with bullets.

**File: `src/components/chat/ContentCardRenderer.tsx`**

4. **Tighten `detectConversational()`** — Remove overly broad patterns like `I can`, `I'll`, `That's` from the regex. Keep only patterns that truly indicate a conversational structure (confirmations + suggestions), not just "starts with a common English phrase." This ensures informational responses with lists fall through to plain `ReactMarkdown` when there's no `contentTypeHint`.

### Result

- Responses with markdown lists render with proper bullet points via `ReactMarkdown`
- Only responses that truly have a confirmation + suggestion structure use `ConversationalRenderer`
- The "Next steps" section still renders as clickable suggestion cards when appropriate

### Files to modify

- **`src/components/chat/ConversationalRenderer.tsx`** — Tighten suggestion header regex, preserve markdown list structure
- **`src/components/chat/ContentCardRenderer.tsx`** — Narrow `detectConversational()` patterns to avoid false positives

