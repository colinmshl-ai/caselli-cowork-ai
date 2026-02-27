

## Problem Analysis

The social post drafting is broken due to multiple issues:

1. **`draft_social_post` tool schema missing `deal_id`** — The tool handler at line 427 checks `if (toolInput.deal_id)` to fetch deal data, but `deal_id` is not in the tool's `input_schema` properties (lines 112-119). The AI model can't pass what's not in the schema, so no deal data is ever fetched, and the tool returns `{ success: true, post_type: "...", ... }` with zero property details.

2. **No deal lookup fallback** — Even if `deal_id` is missing, the tool has `property_address` but doesn't use it to look up the deal.

3. **Empty `fullText` fallback** — Line 1177: `fullText || "I wasn't able to generate a response."` — if the AI's text streaming fails or returns empty after tool calls, the user gets a useless message with `content_type: "social_post"`, causing ContentCardRenderer to render an empty SocialPostCard.

4. **No empty state guard in ContentCardRenderer** — Empty/whitespace content still gets rendered as a card.

## Plan

### 1. Add `deal_id` to `draft_social_post` schema (and `draft_email`, `draft_listing_description`)

In `supabase/functions/chat/index.ts`, add `deal_id: { type: "string" }` to each draft tool's `input_schema.properties`. This lets the AI pass a deal ID it found from `get_active_deals`.

### 2. Add address-based deal fallback in tool handler

In the `draft_social_post` / `draft_email` / `draft_listing_description` case block (lines 423-452), if `deal_id` is not provided but `property_address` is, do an `ilike` query on the `deals` table to find the matching deal. Log the lookup result.

```typescript
case "draft_social_post":
case "draft_listing_description":
case "draft_email": {
  let context: Record<string, unknown> = { success: true, ...toolInput };
  
  // Try deal_id first, then fall back to address search
  if (toolInput.deal_id) {
    const { data: deal } = await adminClient
      .from("deals").select("*")
      .eq("id", toolInput.deal_id as string)
      .eq("user_id", userId).single();
    if (deal) {
      context.deal = deal;
      console.log(`[${toolName}] Found deal by ID: ${deal.property_address}`);
    } else {
      console.warn(`[${toolName}] deal_id ${toolInput.deal_id} not found`);
    }
  } else if (toolInput.property_address) {
    const { data: deals } = await adminClient
      .from("deals").select("*")
      .eq("user_id", userId)
      .ilike("property_address", `%${toolInput.property_address}%`)
      .limit(1);
    if (deals && deals.length > 0) {
      context.deal = deals[0];
      console.log(`[${toolName}] Found deal by address: ${deals[0].property_address}`);
    } else {
      console.warn(`[${toolName}] No deal found for address: ${toolInput.property_address}`);
    }
  }
  
  if (!context.deal) {
    console.warn(`[${toolName}] No deal data available. Input:`, JSON.stringify(toolInput));
    context.no_deal_found = true;
    context.message = "No matching deal found. Draft using available context from the conversation.";
  }
  // ... rest of existing return
```

### 3. Improve empty response fallback

At line 1177, change the fallback to include tool context so the AI's failure message is useful:

```typescript
const assistantContent = fullText || (toolCallLog.length > 0
  ? "I ran into an issue generating content. Could you try again or provide more details?"
  : "I wasn't able to generate a response. Please try again.");
```

### 4. Add empty state guard in ContentCardRenderer.tsx

In `renderCardOnly()` for the `social_post` case, after parsing, check if `postContent` is empty/whitespace. If so, skip the card and render as plain markdown. Same for `EmailCard` (empty body) and `ListingCard` (empty description).

```typescript
// In renderCardOnly, social_post case:
if (contentTypeHint === "social_post") {
  const { intro, platform, postContent } = parseSocial(section);
  if (!postContent.trim()) {
    // No actual post content — render as plain text instead of empty card
    return (
      <div className={PROSE_CLASSES}>
        <ReactMarkdown remarkPlugins={[remarkBreaks]}>{section}</ReactMarkdown>
      </div>
    );
  }
  // ... existing card render
}
```

Apply the same pattern to `email` (check `body`) and `listing_description` (check `description`).

### 5. Add error logging to draft tool handler

Add `console.log` at entry and exit of the draft case block to trace inputs and output shape.

### Files Modified
- `supabase/functions/chat/index.ts` — schema fix, address fallback, error logging, better empty fallback
- `src/components/chat/ContentCardRenderer.tsx` — empty state guards in `renderCardOnly()` and fallback detection paths

