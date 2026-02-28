

## Plan: SSE Connection Resilience — Watchdog + AbortController + Client Disconnect Detection

### 1. `ChatPanel.tsx` — AbortController + Watchdog Timer

**Lines 316-470** (the `sendMessage` try block with SSE streaming):

- Create an `AbortController` before the fetch call (line 320) and pass `signal: controller.signal` to fetch options
- Store the controller in a ref (`abortControllerRef`) so the Stop button and unmount can access it
- Add a `lastEventTime` variable initialized to `Date.now()` before the read loop (line 351)
- Update `lastEventTime = Date.now()` inside the `for (const evt of events)` loop (line 359) on every parsed event
- Add a `watchdog` interval (every 5s) that checks `Date.now() - lastEventTime > 45000`. If triggered:
  - Call `controller.abort()`
  - Set `errorSeen = true`
  - Set the streaming content to the timeout error message
  - `break` out of the read loop
- Clear the watchdog interval after the read loop exits (after line 470)
- In the catch block (line 536), handle `AbortError` gracefully (don't show generic error if it was a user-initiated abort)

**New ref + cleanup** (around lines 125-132):
- Add `const abortControllerRef = useRef<AbortController | null>(null)`
- Add `const lastEventTimeRef = useRef<number>(0)` for Stop button freshness check
- Add a cleanup effect that aborts on unmount

**Lines 847-854** (Send button area): No existing Stop button — we need to add one. When `typingStatus` is truthy (streaming), show a "Stop" button instead of the Send button. Only show it if `lastEventTimeRef.current` is within 10 seconds.

### 2. `supabase/functions/chat/index.ts` — Client Disconnect Detection

**Line 1260** (inside `start(controller)`): Add abort listener:
```typescript
let clientDisconnected = false;
req.signal.addEventListener("abort", () => { clientDisconnected = true; });
```

**Line 1272** (top of `while` loop): Add check:
```typescript
if (clientDisconnected) break;
```

**Line 1440** (after `Promise.all(toolPromises)` completes, before continuing loop): Add check:
```typescript
if (clientDisconnected) break;
```

### Files Modified
- `src/components/chat/ChatPanel.tsx` — AbortController, watchdog timer, Stop button, unmount cleanup
- `supabase/functions/chat/index.ts` — `req.signal` abort listener + disconnect checks in agentic loop

