

# Refine Chat Interface for Better Usability

## Changes

### 1. Message spacing & dividers (`ChatPanel.tsx`)
- Change messages container from `space-y-4` to `space-y-6`
- Add `mt-2` extra top margin on assistant messages that follow user messages (visual separation between user→assistant pairs)

### 2. Pre-stream typing indicator (`ChatPanel.tsx`)
- Currently sets `typingStatus("Thinking...")` but the typing indicator only shows when `typingStatus` is set — it already works. However, there's a gap: after the SSE stream starts, the placeholder message is added and typingStatus is cleared to `""`, causing the dots to disappear before any text arrives.
- Fix: keep typingStatus as "Thinking..." until the first `text_delta` event arrives, rather than clearing it when the placeholder is created (line 321-322). Move `setTypingStatus("")` into the `text_delta` handler (first delta only).

### 3. Input area improvements (`ChatPanel.tsx`)
- Make send button slightly larger: `h-9 w-9` (from `h-8 w-8`)
- Add hint text below the input container: `<p className="text-[10px] text-muted-foreground text-center mt-1.5">Press Enter to send · Shift+Enter for new line</p>`
- Shift+Enter already works (only Enter without shift triggers send)

### 4. Copy button consistency (`CopyButton.tsx`)
- Already shows "Copied" with checkmark for 2 seconds — this works correctly
- Add consistent positioning: wrap in a `p-1.5 rounded-md bg-background/80 backdrop-blur-sm` container so it's always visible and positioned the same way
- Update the parent in `ChatPanel.tsx`: position the copy button wrapper with `absolute -top-1 -right-1` and add `z-10`

### 5. Welcome message fix & clickable capabilities (`ChatPanel.tsx`)
- Fix bullet text: already reads "Track your deals and flag upcoming deadlines" — verify rendering. The issue is likely markdown rendering stripping bold markers. Ensure the list items use full sentences.
- Make capability bullets clickable: change `sendWelcomeMessage` to use a structured format where each capability line includes the full text. Then in `ContentCardRenderer` or directly in the message rendering, detect the welcome message and render capability items as clickable buttons that send pre-filled prompts.
- Simpler approach: add a `starterPrompts` state that shows below the welcome message as clickable cards.

### 6. Empty state / starter prompts (`ChatPanel.tsx`)
- Replace the generic "Start a conversation" empty state with 4 clickable starter prompt cards:
  - "I just got a new listing at..."
  - "Draft a social post for..."
  - "Give me a pipeline overview"
  - "Help me follow up with a client"
- Also show these below the welcome message when it's the only message (no user messages yet)
- Style as bordered rounded cards with `text-sm text-foreground` and hover state

## Files modified: 2
- `src/components/chat/ChatPanel.tsx` — spacing, typing indicator fix, input hint, send button size, starter prompts, welcome capabilities
- `src/components/chat/CopyButton.tsx` — consistent positioning/container styling

