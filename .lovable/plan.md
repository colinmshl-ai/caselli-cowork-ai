

## Keyboard Shortcuts

### Files to modify

**1. `src/pages/Chat.tsx`** — Expand the existing keydown handler with all shortcuts

Current handler (line 34-43) only handles `⌘K`. Replace with a comprehensive handler:

- **⌘+Enter** — Call `sendMessageRef.current` with current input value. Need to expose `input` state or a `sendCurrentMessage` callback from ChatPanel.
- **Escape** — If activity panel is open, close it. Otherwise blur the textarea.
- **⌘+N / Ctrl+N** — Call a `startNewChat` callback exposed from ChatPanel.
- **⌘+. / Ctrl+.** — Call an `abortGeneration` callback exposed from ChatPanel.
- **Arrow Up in empty input** — Load last user message. Need `lastUserMessage` exposed from ChatPanel.

Since most of these need ChatPanel internals, ChatPanel needs to expose additional callbacks. Add new props to ChatPanel:
- `onNewChat`: `() => void` — calls `startNewChat`
- `onAbortGeneration`: `() => void` — calls `abortControllerRef.current?.abort()`
- `onArrowUpEmpty`: `() => string | undefined` — returns `lastUserMessage` and sets it as input

Alternative simpler approach: expose refs/callbacks from ChatPanel for `startNewChat` and `abortGeneration`, similar to existing `sendMessageRef`. Add:
- `newChatRef: MutableRefObject<(() => void) | null>`
- `abortRef: MutableRefObject<(() => void) | null>`
- `lastUserMessageRef: MutableRefObject<string>`
- `inputRef: MutableRefObject<string>` (or use `setInput` callback)

**2. `src/components/chat/ChatPanel.tsx`**

- Add new props: `newChatRef`, `abortRef`, `lastUserMessageRef`, `setInputRef`
- Wire them up in useEffect like `sendMessageRef`
- For ⌘+Enter in the textarea `handleKeyDown` (line 627): add `if ((e.metaKey || e.ctrlKey) && e.key === "Enter")` to send

**3. `src/pages/Settings.tsx`** — Add "Keyboard Shortcuts" section with a dialog

- Add a new `<Section title="Keyboard Shortcuts">` before the Sign Out section
- Include a button that opens a Dialog listing all shortcuts
- Create the shortcuts modal inline using the existing `Dialog` component

**4. New file: `src/components/KeyboardShortcutsDialog.tsx`** — Reusable dialog component

Contains a table/list of all shortcuts:
| Shortcut | Action |
|----------|--------|
| ⌘K | Focus chat input |
| ⌘Enter | Send message |
| Escape | Close panel / blur input |
| ⌘N | New conversation |
| ⌘. | Stop generation |
| ↑ | Edit last message (empty input) |

### Implementation details

**Chat.tsx keydown handler** will check:
1. `⌘K` — focus textarea (existing)
2. `⌘N` — `e.preventDefault(); newChatRef.current?.()`
3. `⌘.` — `e.preventDefault(); abortRef.current?.()`
4. `Escape` — if `showActivity` close it, else `chatTextareaRef.current?.blur()`

**ChatPanel.tsx handleKeyDown** will add:
1. `⌘Enter` — send message
2. `ArrowUp` when input is empty — set input to `lastUserMessage`

**ChatPanel.tsx** will set refs in useEffect:
```ts
newChatRef.current = startNewChat;
abortRef.current = () => abortControllerRef.current?.abort();
```

