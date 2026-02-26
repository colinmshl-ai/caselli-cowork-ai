

# Fix Issues #3, #4, #5

## Issue #3: Welcome Message Duplication on Error — `src/components/chat/ChatPanel.tsx`

**Line 359** — The fallback `"I wasn't able to generate a response."` replaces empty streamed content after an error. But if the error SSE event already set `streamingContentRef.current` to the error message, this line overwrites nothing. The real problem: if the stream ends with zero content and zero error events (e.g., connection drops), the fallback fires. However, if the error event fires but `streamingContentRef.current` was set to the error message, this line keeps it.

The actual bug: when the first conversation gets an error during SSE, the `done` event may not fire, and the code falls through to line 359 which shows `"I wasn't able to generate a response."` — but in the first conversation the welcome message was already displayed as the prior assistant message, making it look duplicated.

**Fix**: On line 359, only use fallback if no error was received. Track whether an error event was seen during the stream, and if so, keep the error message as-is rather than replacing with a generic fallback.

```typescript
// Add an errorSeen flag alongside toolsUsed (around line 295)
let errorSeen = false;

// In the error case handler (line 349-352), set errorSeen = true

// Line 359 change:
const finalContent = streamingContentRef.current || (errorSeen ? "Something went wrong. Please try again." : "I wasn't able to generate a response.");
```

## Issue #4: Activity Panel Stats — `src/components/chat/ActivityPanel.tsx`

The `activity-tasks` query already has `refetchInterval: 10000`. The `activity-deals` query (line 60-70) does NOT have `refetchInterval`. 

**Fix**: Add `refetchInterval: 30000` to the `activity-deals` query so deal stats update without a page refresh.

## Issue #5: Brand Tone Labels — `src/pages/Settings.tsx`

**Lines 20-26**: Update `TONE_OPTIONS` labels to match onboarding:

```typescript
const TONE_OPTIONS = [
  { value: "professional", label: "Professional & Polished" },
  { value: "friendly", label: "Friendly & Approachable" },
  { value: "luxury", label: "Luxury & Elevated" },
  { value: "casual", label: "Casual & Personable" },
  { value: "authoritative", label: "Authoritative" },
];
```

## Files modified: 3
- `src/components/chat/ChatPanel.tsx` — error handling fix
- `src/components/chat/ActivityPanel.tsx` — add refetchInterval to deals query
- `src/pages/Settings.tsx` — update tone labels

