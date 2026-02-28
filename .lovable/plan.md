

## Fix StreamingText: Full Markdown Rendering with Debounce

### Changes to `src/components/chat/StreamingText.tsx`

1. Add `useState, useEffect` imports
2. Replace the stablePrefix/tailLine split with a single debounced `ReactMarkdown` render
3. Change empty state text to "Thinking..."
4. Remove `useMemo` import (no longer needed)

Single file change, ~30 lines. Straightforward replacement matching the user's provided code.

