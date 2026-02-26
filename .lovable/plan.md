

# Fix Activity Panel Real-Time Recent Activity

## Changes

### 1. `src/components/chat/ActivityPanel.tsx`

**A. Add refresh options to deals query (lines 60-69):** Add `refetchOnWindowFocus: true` to the deals useQuery options.

**B. Add refresh options to taskHistory query (lines 71-85):** Add `refetchInterval: 10000` and `refetchOnWindowFocus: true` to the taskHistory useQuery options.

**C. Replace task history rendering (lines 244-252):** Replace the horizontal layout with a vertical layout using a primary-colored dot indicator and stacked description + timestamp.

### 2. `src/components/chat/ChatPanel.tsx`

**Invalidate activity queries after streaming completes (after line 323):** Add two `queryClient.invalidateQueries` calls for `["activity-deals"]` and `["activity-tasks"]` so the activity panel refreshes immediately after chat actions complete.

## Files Modified: 2
- `src/components/chat/ActivityPanel.tsx`
- `src/components/chat/ChatPanel.tsx`

