

## Plan: Make AI Proactively Use Web Search for Content Context

### Current State
- `web_search` icon mapping already exists in `ToolProgressCard.tsx` (line 25: `web_search: Globe`) — no frontend changes needed
- The existing `WEB SEARCH:` section (lines 1051-1056) is passive — it says "use it when the user asks" but doesn't instruct the AI to search automatically before drafting content

### Change: `supabase/functions/chat/index.ts` — System Prompt Only

Replace lines 1051-1056 (the current `WEB SEARCH:` section) with an expanded version that adds proactive search behavior:

```
WEB SEARCH FOR CONTEXT:
You have access to web_search. Use it PROACTIVELY — don't wait to be asked.

WHEN TO SEARCH AUTOMATICALLY:
- Before drafting listing content: search "[neighborhood] [city] amenities schools parks restaurants" to add local color
- Before discussing pricing or market conditions: search "[city] [state] real estate market 2026" or "[zip code] median home price"
- Before creating social posts about an area: search "upcoming events [city] [month] 2026" or "[neighborhood] things to do"
- When a user shares a property address and asks you to research it

WHEN NOT TO SEARCH:
- Basic CRUD operations (create deal, add contact, update stage)
- When you already have all the data you need from deal details and enrichment
- When the user is asking a simple question you can answer from conversation context

SEARCH RULES:
- Use 1-2 focused searches per content request, not 5+ scattered ones
- Weave search results naturally into your content — don't list raw search results
- Credit specific data points: "The median home price in Haymarket is $X (source: Realtor.com)"
- Combine web search results with deal data and enrichment for the most compelling content
- For market reports, always search for the latest data rather than relying on training data

EXAMPLE WORKFLOW for "draft an Instagram post for my listing at 123 Main St, Haymarket VA":
1. get_deal_details → get property features
2. web_search "Haymarket VA neighborhood highlights amenities 2026" → get local context
3. Draft the post weaving property features WITH neighborhood highlights
   Instead of: "Beautiful 4-bed home in a great location!"
   Write: "4 bed / 3 bath on a quiet cul-de-sac in Haymarket — 5 min from the Saturday farmers market and Old Town restaurants"
```

### Files Modified
- `supabase/functions/chat/index.ts` — system prompt text only, redeploy edge function

### What Already Works (No Changes Needed)
- `ToolProgressCard.tsx` already maps `web_search` → Globe icon
- Tool progress cards will automatically show "Searching: ..." → "Found X results" based on the existing `inputSummary`/`resultSummary` mechanism
- `SourcesCard` already renders search result citations at the bottom of messages

