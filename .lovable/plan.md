

# Full App Audit: Issues Found and Improvement Plan

After reviewing every page, component, edge function, database schema, and testing on both desktop and mobile viewports, here are all findings organized by severity.

---

## Critical Issues

### 1. No Stripe Webhook Handler
The billing system creates checkout sessions but there is **no webhook edge function** to handle Stripe events (`checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`). This means after a user completes Stripe checkout, their profile `subscription_status` and `plan_tier` are never updated. The subscription flow is broken end-to-end.

**Fix:** Create `supabase/functions/stripe-webhook/index.ts` that verifies the Stripe signature and updates the `profiles` table based on event type. Add `STRIPE_WEBHOOK_SECRET` to secrets.

### 2. Memory Extraction Promise Not Awaited
In `supabase/functions/chat/index.ts` line 603, the background memory extraction promise is referenced but never awaited or attached to any lifecycle. The line `memoryExtractionPromise;` is a no-op statement. Deno edge functions may terminate the isolate before this completes.

**Fix:** Use `EdgeRuntime.waitUntil(memoryExtractionPromise)` if available, or `await` it before returning the response (slightly slower but reliable).

### 3. ProtectedRoute Doesn't Check Onboarding
When a user logs in, `ProtectedRoute` checks subscription status but never checks `onboarding_completed`. A user who hasn't finished onboarding can navigate directly to `/chat`, `/deals`, etc. and encounter a broken experience (no business profile exists).

**Fix:** Add onboarding check to ProtectedRoute -- if `onboarding_completed === false`, redirect to `/onboarding`.

### 4. Onboarding Doesn't Handle Existing Business Profiles
If a user completes onboarding and then somehow revisits it, or if the edge function `add_contact` creates a business profile, the onboarding `INSERT` will fail with a unique constraint violation.

**Fix:** Use `upsert` instead of `insert` for business_profiles in the onboarding flow.

---

## High Priority Issues

### 5. Chat Edge Function Uses `getClaims()` (Deprecated/Non-Standard)
Line 339 of `chat/index.ts` uses `supabaseClient.auth.getClaims(token)` which is not a standard Supabase JS method. This may fail or return unexpected results.

**Fix:** Replace with `supabaseClient.auth.getUser(token)` which is the standard approach, consistent with the other edge functions.

### 6. Landing Page Footer Links Are Non-Functional
The footer has About, Privacy, Terms, Contact as `<span>` elements with cursor-pointer but no actual links or routes. These are dead clicks.

**Fix:** Either create placeholder pages for these or link to external URLs. At minimum, remove the clickable styling if there's no destination.

### 7. No Error Boundary
If any component throws during render, the entire app crashes with a white screen. There is no React error boundary.

**Fix:** Add a root-level `ErrorBoundary` component that catches render errors and shows a fallback UI.

### 8. Billing Page Missing "Back" Navigation
The billing page (`/billing`) has no way to go back to the app or log out. If a user with an active subscription lands here, they're stuck.

**Fix:** Add a "Back to app" link or proper navigation.

### 9. NotFound Page Uses Wrong Background
`NotFound.tsx` uses `bg-muted` instead of `bg-background`, making it visually inconsistent with the rest of the app.

**Fix:** Change to `bg-background`.

---

## Medium Priority Issues

### 10. No Loading State for Settings Data
Settings page loads profile and business data with `useEffect` + `.then()` but shows no loading indicator. The form renders with empty fields briefly before data loads, which can cause the user to think fields are empty.

**Fix:** Add a loading state that shows a spinner until both profile and business data are loaded.

### 11. Deals Query Doesn't Filter by User
In `Deals.tsx`, the query does `supabase.from("deals").select("*")` without `.eq("user_id", user.id)`. It relies entirely on RLS. While RLS protects the data, explicitly filtering is better practice and avoids confusion.

**Fix:** Add `.eq("user_id", user.id)` to the deals query (same pattern for contacts and activity panel).

### 12. Chat `auth.getClaims()` Should be `auth.getUser()`
As mentioned in issue 5, the chat function's auth approach is inconsistent with the other edge functions.

### 13. Duplicate Memory Facts
The memory extraction runs on every message and may extract the same facts repeatedly (e.g., "Agent specializes in luxury real estate" saved 50 times). There's no deduplication.

**Fix:** Before inserting, check for existing facts with similar content, or add a unique constraint, or use the AI prompt to check against existing facts.

### 14. `check-subscription` Edge Function is Never Called
The `check-subscription` function exists but is never invoked anywhere in the frontend. The ProtectedRoute checks the `profiles` table directly instead of querying Stripe.

**Fix:** Either remove the unused function or integrate it into the subscription check flow.

---

## Low Priority / Polish Issues

### 15. Missing `<title>` and Meta Tags
`index.html` likely has default Vite title. Should be "Caselli - Your AI Real Estate Coworker" for SEO and browser tab display.

### 16. No Dark Mode Toggle
The CSS has full dark mode theme variables defined but there's no toggle in the UI to switch themes.

### 17. Landing Page "Start Free Trial" Links Go to Signup
The landing page pricing links go to `/signup` instead of `/billing`. After signing up, users would need to separately navigate to billing. The flow should be: signup -> onboarding -> billing (or trial auto-starts).

### 18. Select Dropdowns Not Styled Consistently
Native `<select>` elements in onboarding and deal forms don't match the custom design system (they use browser defaults for the dropdown arrow and option list).

### 19. Security: Leaked Password Protection Disabled
The database linter flagged that leaked password protection is disabled. Should be enabled.

---

## Implementation Plan

### Phase 1: Critical Fixes (4 files)

**New file: `supabase/functions/stripe-webhook/index.ts`**
- Verify Stripe webhook signature using `STRIPE_WEBHOOK_SECRET`
- Handle `checkout.session.completed`: look up user_id from session metadata, update `profiles.subscription_status` to 'active' and `plan_tier` based on price ID
- Handle `customer.subscription.deleted`: set status to 'cancelled'
- Handle `invoice.payment_failed`: set status to 'past_due'
- Register in `supabase/config.toml` with `verify_jwt = false` (webhooks don't send JWT)

**Edit: `supabase/functions/chat/index.ts`**
- Replace `getClaims()` with `getUser()` for auth
- Properly handle memory extraction promise (await before response or use structured background execution)

**Edit: `src/components/ProtectedRoute.tsx`**
- Add `onboarding_completed` to the profile query
- If `onboarding_completed === false`, redirect to `/onboarding`

**Edit: `src/pages/Onboarding.tsx`**
- Change business_profiles `insert` to `upsert` with `onConflict: 'user_id'`

### Phase 2: High Priority (5 files)

**New file: `src/components/ErrorBoundary.tsx`**
- React error boundary with fallback UI and "Try again" button

**Edit: `src/App.tsx`**
- Wrap app content in ErrorBoundary

**Edit: `src/pages/Index.tsx`**
- Remove clickable styling from footer items or add proper links

**Edit: `src/pages/Billing.tsx`**
- Add "Back to app" link and sign out option
- Add min-h-[44px] to plan buttons

**Edit: `src/pages/NotFound.tsx`**
- Fix background color to `bg-background`

### Phase 3: Medium Priority (3 files)

**Edit: `src/pages/Settings.tsx`**
- Add loading state with spinner while data loads

**Edit: `src/pages/Deals.tsx`**
- Add explicit `.eq("user_id", user.id)` filter

**Edit: `src/pages/Contacts.tsx`**
- Add explicit `.eq("user_id", user.id)` filter (same for ActivityPanel)

### Phase 4: Polish

**Edit: `index.html`**
- Update title and meta description

**Database migration:**
- Enable leaked password protection

---

**Total files: ~12 modified/created**
**1 new edge function (stripe-webhook)**
**1 new component (ErrorBoundary)**
**1 database migration (password protection)**
**No new npm dependencies**

