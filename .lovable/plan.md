

# Fix Chat Model ID + Wire Up Activity Panel Context IDs

## 1. Update Anthropic Model to Latest (`supabase/functions/chat/index.ts`)

Replace `claude-sonnet-4-5-20241022` with `claude-sonnet-4-5-20250929` at lines 552 and 666.

## 2. Pass Deal/Contact IDs Through SSE (`supabase/functions/chat/index.ts`)

Currently `toolsUsed` entries are `{ tool, description }`. Extend to include optional `deal_id` and `contact_id` extracted from tool inputs:

- When pushing to `toolsUsed` (line 606), also capture `tool.input.deal_id` and `tool.input.contact_id` if present
- For `search_contacts`/`add_contact` results, capture the returned contact ID from the tool result
- The `done` SSE event already sends `tools_used`, so no change needed there

New shape: `{ tool: string; description: string; deal_id?: string; contact_id?: string }`

## 3. Extract IDs in `parseConversationContext` (`src/components/chat/ChatPanel.tsx`)

Update the function to scan `toolsUsed` for the last `deal_id` and `contact_id`:

```typescript
function parseConversationContext(toolsUsed: { tool: string; description: string; deal_id?: string; contact_id?: string }[]): ConversationContext {
  // ... existing topic detection ...
  
  let lastDealId: string | undefined;
  let lastContactId: string | undefined;
  
  for (const t of toolsUsed) {
    if (t.deal_id) lastDealId = t.deal_id;
    if (t.contact_id) lastContactId = t.contact_id;
  }
  
  return { topic, lastToolUsed, lastDealId, lastContactId };
}
```

## 4. Stripe Price IDs (Flagged — Not Actionable Yet)

`src/pages/Billing.tsx` contains placeholder Stripe price IDs (`price_1T4t1q...`, etc.). These need real IDs from your Stripe account. This is a configuration task — let me know when you have the real price IDs and I'll swap them in.

## Files Modified: 2
- `supabase/functions/chat/index.ts` — model ID + entity ID capture
- `src/components/chat/ChatPanel.tsx` — parse deal/contact IDs from tools_used

