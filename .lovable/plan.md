

# Enable Multi-Action Tool Chaining

## Changes

### 1. `supabase/functions/chat/index.ts`

**A. Add entity ID tracking variables** (after line 541, before `while` loop):
- `let lastCreatedDealId: string | null = null;`
- `let lastCreatedContactId: string | null = null;`

**B. Capture entity IDs from tool results** (after `executeTool` returns, ~line 622):
- If `tool.name === "create_deal"` and result has `id`, set `lastCreatedDealId`
- If `tool.name === "add_contact"` and result has `id`, set `lastCreatedContactId`
- If `tool.name === "get_deal_details"` and result has `id`, set `lastCreatedDealId`
- If `tool.name === "search_contacts"` and result is array with items, set `lastCreatedContactId = result[0].id`

**C. Include entity IDs in done event** (line 648):
- Add `last_deal_id: lastCreatedDealId` and `last_contact_id: lastCreatedContactId` to the done payload

**D. Add MULTI-ACTION BEHAVIOR section to system prompt** (after line 519, before the closing backtick):
- Instructions for chaining actions, with example flow and reminder about 5 tool call limit

### 2. `src/components/chat/ChatPanel.tsx`

**Update "done" event handler** (lines 270-273):
- Parse `last_deal_id` and `last_contact_id` from the done event
- Build context with `parseConversationContext` and set entity IDs
- Call `onConversationContext` with the enriched context

## Files Modified: 2
- `supabase/functions/chat/index.ts`
- `src/components/chat/ChatPanel.tsx`

