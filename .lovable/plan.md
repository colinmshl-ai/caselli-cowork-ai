

# E2E Test Results & Fix Plan

## Issues Found

### 1. CRITICAL: Onboarding page is blank (infinite redirect loop)
`ProtectedRoute` redirects to `/onboarding` when `onboarding_completed === false`. But `/onboarding` is wrapped in `<ProtectedRoute>` in App.tsx, causing an infinite redirect loop → blank page.

**Fix:** In `ProtectedRoute.tsx`, add a `useLocation()` check — skip the onboarding redirect when the current path is already `/onboarding`.

### 2. Billing page "Back to app" link broken for new users
`/billing` has `<a href="/chat">← Back to app</a>`. For new users who haven't completed onboarding yet, clicking this sends them into the broken onboarding loop. This link should conditionally show based on whether the user has an active subscription.

**Fix:** Only show "Back to app" if the user has completed onboarding (query profile). Otherwise just show "Sign out".

### 3. Console error: "Function components cannot be given refs" on App
The `ErrorBoundary` wraps `App` but React tries to pass a ref to the arrow function component. This is a warning, not breaking.

**Fix:** No action needed — this is a React development-mode warning from the router, not from ErrorBoundary itself.

### 4. Footer links non-functional (cosmetic)
Landing page footer has About/Privacy/Terms/Contact as plain `<span>` elements with no links. Already identified in previous audit — the clickable cursor styling was removed but they're still non-functional text.

**Fix:** Already addressed (cursor styling removed). No further action needed.

---

## Implementation Steps

### File: `src/components/ProtectedRoute.tsx`
- Import `useLocation` from react-router-dom
- Before the onboarding redirect check, get current pathname
- Skip the onboarding redirect if `location.pathname === "/onboarding"`

### File: `src/pages/Billing.tsx`
- Query profile to check `onboarding_completed` 
- Only show "Back to app" link if `onboarding_completed === true`

**2 files modified. No database changes.**

