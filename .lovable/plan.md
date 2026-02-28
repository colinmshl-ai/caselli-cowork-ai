

## Plan: Make AI Proactively Chain Follow-Up Actions

### Problem
The system prompt has scattered, weak chaining instructions. The AI sometimes suggests next steps but inconsistently, and doesn't reference specific enriched property data in its suggestions.

### What Already Works
- `ConversationalRenderer.parseConversational()` already detects `"Next steps:"` headers via regex and renders numbered items as clickable `SuggestionCard` buttons. No frontend changes needed.

### Changes: `supabase/functions/chat/index.ts` — System Prompt Only

**a. Replace the existing chaining instructions** (lines 953-976 in `YOUR PERSONALITY AND BEHAVIOR` and `WRITING STYLE RULES`) with a dedicated `PROACTIVE WORKFLOW CHAINING` section. Consolidate and strengthen:

- After ANY completed task, ALWAYS include a "Next steps:" section with exactly 2-3 numbered options
- Options must be specific — reference the actual property address, contact name, or content just created
- Use numbered list format so user can reply "1" or "2"
- If the original request implied multiple steps, execute all of them first, THEN offer the next logical actions
- Never use generic closers like "Is there anything else I can help with?"

**b. Add enrichment-aware chaining** to the `PROPERTY ENRICHMENT` section (after line 1052):

- When `create_deal` + enrichment succeeds, the AI should reference specific property features in its suggestions (e.g., "Draft a post highlighting the open floor plan and 3-car garage" instead of just "Draft a social post")
- Pull from enrichment data: sqft, beds/baths, property type, year built to make suggestions feel informed

**c. Add concrete examples** to the system prompt showing the exact format:

```
After creating a listing:
✅ Created listing: 123 Main St - $450,000
✅ Property details: 3 bed / 2 bath / 1,800 sqft

Next steps:
1. Draft an Instagram post featuring this property
2. Write a listing description for MLS
3. Email your buyer list about this new listing

After drafting content:
Next steps:
1. Adapt this for Facebook and LinkedIn
2. Draft a matching email to your client list
3. Create a different angle focusing on the neighborhood

After adding a contact:
Next steps:
1. Draft a welcome email introduction
2. Create a deal for this contact
3. Set a follow-up reminder for next week
```

### Files Modified
- `supabase/functions/chat/index.ts` — system prompt text only (no logic changes)

### Why No Frontend Changes
The `ConversationalRenderer` already handles "Next steps:" + numbered lists → clickable suggestion cards. The `SuggestionChips` component also provides contextual chips based on `lastToolUsed`. Both systems will work with the improved AI output without code changes.

