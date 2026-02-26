

# Fix Onboarding Navigation Race Condition

## Root Cause

When `handleFinish` calls `navigate("/chat")`, the `/chat` route is wrapped in `ProtectedRoute`. ProtectedRoute's React Query cache still has `onboarding_completed: false` (stale data), so it immediately redirects back to `/onboarding`. This remounts the Onboarding component, resetting all state to Step 1.

The `savingRef` guard only protects the useEffect inside Onboarding itself — it does nothing about the ProtectedRoute redirect.

## Fix — `src/pages/Onboarding.tsx`

**1. Import `useQueryClient`** from `@tanstack/react-query`.

**2. In `handleFinish`, after the profile update succeeds and before navigating, set the cached profile data directly:**

```typescript
queryClient.setQueryData(["profile-sub", user.id], (old: any) => ({
  ...old,
  onboarding_completed: true,
  trial_ends_at: trialEnd.toISOString(),
}));
```

This ensures ProtectedRoute reads `onboarding_completed: true` from cache when evaluating the `/chat` route, preventing the redirect loop.

**3. Remove the 100ms setTimeout** (line 125) — it's no longer needed since the cache update is synchronous.

## Files Modified: 1
- `src/pages/Onboarding.tsx`

