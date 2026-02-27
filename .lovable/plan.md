

## Problem

During SSE streaming, every text delta triggers a `setMessages` update via `requestAnimationFrame`. Each update causes `ContentCardRenderer` to re-parse the entire content string — running regex detection (social, email, listing, deal summary, conversational) and re-rendering `ReactMarkdown` from scratch. This creates visible jank: layout shifts, flickering card detection mid-stream, and unnecessary component remounts.

Additionally, the console shows ref warnings because `ContentCardRenderer` passes a ref to `ConversationalRenderer` which is a plain function component.

## Plan

### 1. Show plain streaming text during stream, render rich cards only on completion

In `ChatPanel.tsx`, track an `isStreaming` boolean on the placeholder message. While streaming, render the content as simple markdown only (skip `ContentCardRenderer` entirely). On stream completion (after the `done` event / reader finishes), flip `isStreaming` to false — triggering a single rich render with card detection.

This eliminates hundreds of wasted regex + ReactMarkdown re-renders during streaming.

**Changes in `ChatPanel.tsx`:**
- Add `isStreaming: true` to the placeholder message object
- In the message render loop, check `m.isStreaming` — if true, render a lightweight `<ReactMarkdown>` directly instead of `<ContentCardRenderer>`
- On final content update (after stream ends), set `isStreaming: false`

### 2. Create a lightweight `StreamingText` component

New file `src/components/chat/StreamingText.tsx` — a minimal component that renders markdown with `React.memo` and a stable prose class. No card detection, no regex, no parsing. Just clean text rendering optimized for rapid updates.

### 3. Fix the forwardRef console warning

In `ContentCardRenderer.tsx`, the `ConversationalRenderer` is rendered as a child of `EntityLinker` which may pass refs. Wrap `ConversationalRenderer` with `React.forwardRef` or ensure `EntityLinker` doesn't pass refs to its children.

### 4. Add a smooth content transition on stream completion

When streaming ends and the rich render kicks in, add a subtle CSS `transition` (opacity) so the switch from plain text to styled cards feels deliberate rather than jarring.

### Files to modify

- **`src/components/chat/StreamingText.tsx`** (new) — lightweight memo'd markdown renderer for streaming
- **`src/components/chat/ChatPanel.tsx`** — add `isStreaming` flag to placeholder, use `StreamingText` during stream, switch to `ContentCardRenderer` on completion
- **`src/components/chat/ConversationalRenderer.tsx`** — wrap with `forwardRef` to fix console warning

