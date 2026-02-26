

# Context-Aware Activity Panel

## Overview

Make the ActivityPanel react to conversation context by tracking which tools the AI used and dynamically swapping the middle section (stats/quick actions) based on the topic.

## Changes

### 1. `src/pages/Chat.tsx`
- Add `ConversationContext` interface: `{ lastToolUsed?: string; lastDealId?: string; lastContactId?: string; topic?: 'deals' | 'content' | 'contacts' | 'general' }`
- Add `conversationContext` state, default `{ topic: 'general' }`
- Add `onConversationContext` callback prop to `ChatPanel` so it can report context after each response
- Pass `conversationContext` to `ActivityPanel`

### 2. `src/components/chat/ChatPanel.tsx`
- Add `onConversationContext` optional prop
- After receiving response and flashing tool descriptions, parse `tools_used` to determine topic:
  - Deal tools (`get_active_deals`, `get_deal_details`, `update_deal`, `check_upcoming_deadlines`, `create_deal`) → topic `'deals'`
  - Content tools (`draft_social_post`, `draft_listing_description`, `draft_email`) → topic `'content'`
  - Contact tools (`search_contacts`, `add_contact`, `update_contact`) → topic `'contacts'`
  - Otherwise → `'general'`
- Extract `lastDealId`/`lastContactId` from `fnData.tool_results` if available (check for `deal_id` or `contact_id` keys in the metadata)
- Call `onConversationContext({ topic, lastToolUsed, lastDealId, lastContactId })`

### 3. `src/components/chat/ActivityPanel.tsx`
- Add `conversationContext` prop with the `ConversationContext` interface
- Keep greeting + date always visible at top
- Keep Recent Activity always visible at bottom
- Middle section wrapped in a `div` with `transition-opacity duration-200`; use a key based on `topic` to trigger re-render/fade

**Topic-specific middle sections:**

**`deals`:**
- If `lastDealId` provided, fetch deal from supabase and show mini card: property address (text-sm font-medium), stage dot + label, next deadline, client name
- Quick actions: "Check deadlines for this deal", "Draft update email to client", "Update deal stage"

**`content`:**
- Quick actions: "Draft another post", "Try a different tone", "Draft for a different platform", "Write a follow-up email"

**`contacts`:**
- If `lastContactId` provided, fetch contact and show: name, type badge, last contacted date
- Quick actions: "Draft follow-up email", "Check related deals", "Update contact info"

**`general` (default):**
- Current stats + current quick actions (unchanged)

### 4. Mini deal card styling
- `border border-border rounded-md px-4 py-3 space-y-1.5`
- Address: `text-sm font-medium text-foreground`
- Stage: small colored dot (green for active, yellow for under_contract, etc.) + `text-xs text-muted-foreground`
- Next deadline: `text-xs text-muted-foreground`
- Client: `text-xs text-muted-foreground`

### 5. Mini contact card styling
- Same container as deal card
- Name: `text-sm font-medium text-foreground`
- Type + last contacted: `text-xs text-muted-foreground`

**3 files modified. No database changes.**

