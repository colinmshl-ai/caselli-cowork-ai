

# Bug Fix: Onboarding Step 5 "Start Working" resets to Step 1

## Root Cause
The `useEffect` (lines 55-68) re-queries the profile on every render. When `handleFinish` calls `setSaving(true)`, it triggers a re-render, the useEffect fires again, and the async profile check can interfere with the save flow — potentially resetting component state before `navigate("/chat")` executes.

## Changes — `src/pages/Onboarding.tsx` only

1. **Add `useRef` import** and create `savingRef` to guard the useEffect during save
2. **Guard the useEffect**: add `if (savingRef.current) return;` at the top of the effect body
3. **Set `savingRef.current = true`** at the start of `handleFinish` (before `setSaving(true)`)
4. **Wrap calls in try/catch** for safer error handling with specific error messages
5. **Add small delay before navigate** to ensure the profile update has committed before navigation fires

No styling, layout, or other file changes.

