

# Improve Tool Status Display During Streaming

## Changes — `src/components/chat/ChatPanel.tsx` only

### 1. Replace TypingIndicator component (lines 22-31)
Replace with a multi-status version that shows completed tools with green dots and the current status with an animated pulse dot.

### 2. Add `completedTools` state (after line 91)
Add `const [completedTools, setCompletedTools] = useState<string[]>([]);` alongside existing state variables.

### 3. Update `tool_status` handler (lines 265-268)
Before setting the new status, move the previous non-"Thinking..." status to the `completedTools` list with "done" suffix.

### 4. Clear `completedTools` in finally block (line 349)
Add `setCompletedTools([]);` next to `setTypingStatus("")`.

### 5. Update TypingIndicator usage in JSX (line 487)
Pass `completedTools` prop: `<TypingIndicator status={typingStatus} completedTools={completedTools} />`

### 6. Update render condition (line 482)
Change to `{(typingStatus || completedTools.length > 0) && (` so completed tools remain visible until cleared.

## Files Modified: 1
- `src/components/chat/ChatPanel.tsx`

