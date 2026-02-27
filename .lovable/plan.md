

# Caselli Cowork — Full App Evaluation

## What's Working Well
- Clean, minimal design with warm tones and professional typography (Playfair Display + Inter)
- Solid AI chat backend: SSE streaming, tool chaining (up to 5 iterations), memory extraction, auto-titling conversations
- Context-aware Activity Panel that shifts based on conversation topic (deals/content/contacts)
- Smart system prompt with pre-action validation, brand voice matching, and writing style rules
- Proper auth flow: login → onboarding → chat, with subscription gating and trial tracking
- Good mobile-first patterns: bottom tab bar, safe area padding, touch targets (44px min)
- Dark mode support with well-tuned color tokens

---

## Areas for Improvement

### 1. Landing Page Is Too Minimal
The Index page is text-only with no visual differentiation. No screenshots, no demo, no testimonials, no social proof. The pricing section has no feature comparison table. Footer links (About, Privacy, Terms, Contact) are non-functional spans, not links.

**Recommendation:** Add a hero screenshot/mockup of the chat interface, a feature comparison table for pricing tiers, and real footer links (or remove them).

---

### 2. No Password Reset Flow
Login page has no "Forgot password?" link. Users with email/password accounts have no way to recover access.

**Recommendation:** Add a forgot password link on Login that calls `supabase.auth.resetPasswordForEmail()`, and a password reset page to handle the recovery token.

---

### 3. Deals Page Empty State Is Inconsistent
The Deals empty state still uses the old pattern (`Inbox` icon, 48px, `text-muted-foreground/30`) while Contacts was updated to the new pattern (`UserPlus` icon, 32px, `font-medium text-foreground`). These should match.

**Recommendation:** Update the Deals empty state to match the Contacts pattern: smaller icon, bolder heading, descriptive subtext.

---

### 4. No Search on Deals Page
Contacts has a search bar, but Deals does not. As an agent accumulates deals, finding a specific property becomes harder.

**Recommendation:** Add a search input to the Deals header that filters by property address, client name, or notes.

---

### 5. Chat Panel Has No Conversation Delete
Users can create conversations and switch between them, but there's no way to delete old ones. The conversation list will grow indefinitely.

**Recommendation:** Add a swipe-to-delete or long-press delete option in the conversation history sheet.

---

### 6. `create_deal` Tool Uses Unsafe Spread
Line 261 uses `...toolInput` directly in the insert, which could allow injection of unexpected columns (e.g., `user_id` override). The `add_contact` tool was already fixed with whitelisted columns, but `create_deal` was not.

**Recommendation:** Whitelist columns in `create_deal` the same way `add_contact` does:
```typescript
const dealData = {
  user_id: userId,
  property_address: toolInput.property_address,
  client_name: toolInput.client_name || null,
  // ...etc
};
```

---

### 7. No Loading/Error State for Chat SSE
If the edge function fails or the network drops mid-stream, the user sees the typing indicator forever or a generic error. There's no retry button.

**Recommendation:** Add a timeout (e.g., 30s of no events) that shows a "Something went wrong. Try again?" message with a retry button.

---

### 8. Onboarding Step 4 (Integrations) Is Dead Weight
Every integration button shows "Coming soon." This step adds friction without value. Users may abandon onboarding here.

**Recommendation:** Either remove Step 4 entirely (reduce to 4 steps) or collapse it into a small note on the final summary screen.

---

### 9. No Keyboard Shortcut Hints
`Cmd+K` focuses the chat input but users have no way to discover this. There are no shortcut hints anywhere in the UI.

**Recommendation:** Add a subtle keyboard shortcut hint near the chat input (e.g., a small `⌘K` badge).

---

### 10. Activity Panel Polls Too Aggressively
`activity-tasks` refetches every 10 seconds and `activity-deals` every 30 seconds. For a tool that's open all day, this creates unnecessary database load.

**Recommendation:** Increase intervals to 30s and 60s respectively, or switch to Supabase Realtime for the task_history table.

---

### 11. Settings Page Has No Unsaved Changes Warning
Users can modify fields and navigate away without saving. There's no dirty-state tracking or "unsaved changes" prompt.

**Recommendation:** Track dirty state per section and show a warning before navigation if changes are unsaved.

---

### 12. Deal Stage Mismatch Between Backend and Frontend
The `update_deal` tool validates against `VALID_STAGES` which includes `"active"`, but the frontend uses `"active_client"`. This means AI-driven stage updates to "active" won't match frontend labels correctly.

**Recommendation:** Align the backend `VALID_STAGES` array with the frontend stage values. Add `"active_client"` and remove `"active"`, or normalize on one value.

---

### 13. Contact Import Is Disabled
The "Import" button on Contacts is permanently disabled with a tooltip "Coming soon." This is a critical feature for agents migrating from other CRMs.

**Recommendation:** Implement CSV import for contacts (full_name, email, phone, contact_type columns), or remove the button to avoid frustration.

---

### 14. No Data Export
There's no way for users to export their deals, contacts, or conversation history. This is a retention risk — users may feel locked in.

**Recommendation:** Add CSV export buttons to the Deals and Contacts pages.

---

### 15. Conversation History Doesn't Show Message Preview
The conversation list sheet shows only titles and timestamps. A one-line preview of the last message would help users find the right conversation faster.

**Recommendation:** Fetch the last message content (truncated) when loading the conversation list.

---

## Priority Order

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| 1 | Fix `create_deal` unsafe spread (security) | Low | High |
| 2 | Fix deal stage mismatch backend/frontend | Low | High |
| 3 | Add password reset flow | Medium | High |
| 4 | Standardize Deals empty state | Low | Low |
| 5 | Add Deals search | Medium | Medium |
| 6 | Remove/collapse dead integrations step | Low | Medium |
| 7 | Add chat SSE timeout + retry | Medium | Medium |
| 8 | Add conversation delete | Medium | Medium |
| 9 | Reduce polling intervals | Low | Low |
| 10 | Landing page improvements | High | High |
| 11 | Add data export | Medium | Medium |
| 12 | Settings unsaved changes warning | Medium | Low |
| 13 | Contact CSV import | High | High |
| 14 | Keyboard shortcut hints | Low | Low |
| 15 | Conversation message preview | Low | Low |

