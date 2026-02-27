

## Plan: Add Property Data Enrichment via RentCast API

### Overview
Add an `enrich_property` tool that automatically looks up property details (beds, baths, sqft, year built, etc.) via the RentCast API when a realtor adds a new listing. Store enrichment data in the `deals` table.

### 1. Database Migration — Add enrichment columns to `deals` table

Add these nullable columns:
- `bedrooms` (integer)
- `bathrooms` (numeric)
- `square_footage` (integer)
- `lot_size` (numeric)
- `year_built` (integer)
- `property_type` (text)
- `last_sale_price` (numeric)
- `last_sale_date` (date)
- `property_photos` (text[])
- `enrichment_data` (jsonb)

### 2. Request RENTCAST_API_KEY secret

Use the `add_secret` tool to prompt the user to enter their RentCast API key.

### 3. Edge Function Changes (`supabase/functions/chat/index.ts`)

**a. Add `enrich_property` tool definition** (after `create_file` tool, around line 230):
- Schema with `address`, `city`, `state`, `deal_id` properties
- `required: ["address", "city", "state"]`

**b. Add `enrich_property` to helper maps**:
- `summarizeToolInput`: return `"Looking up property: {address}"`
- `summarizeToolResult`: return property summary string
- `TOOL_DESCRIPTIONS`: `"Looking up property details..."`

**c. Add tool handler case** (before `create_file` case, around line 550):
```
case "enrich_property": {
  const address = toolInput.address as string;
  const city = toolInput.city as string;
  const state = toolInput.state as string;
  const dealId = toolInput.deal_id as string | undefined;
  
  const RENTCAST_API_KEY = Deno.env.get("RENTCAST_API_KEY");
  if (!RENTCAST_API_KEY) {
    return { result: { error: "RENTCAST_API_KEY not configured" }, ... };
  }
  
  // Call RentCast API
  const url = `https://api.rentcast.io/v1/properties?address=${encodeURIComponent(address)}&city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`;
  const resp = await fetch(url, { headers: { "X-Api-Key": RENTCAST_API_KEY } });
  const apiData = await resp.json();
  
  // Extract first result, map fields
  // If deal_id provided, update the deal with enrichment columns
  // Return structured result
}
```

**d. Update `create_deal` handler**: After successful deal creation, if address contains parseable city/state, auto-trigger `enrich_property` internally (call the handler directly, not as a separate AI iteration). Update the deal record with returned data.

**e. Update system prompt**: Add instruction in STATIC_SYSTEM_PROMPT:
> "When a user adds a new listing, use the enrich_property tool to pull property details if enrichment wasn't done automatically. Present enriched data in the ✅ confirmation format."

### 4. Files Modified
- `supabase/functions/chat/index.ts` — new tool definition, handler, auto-enrichment in create_deal, system prompt update
- Database migration — new columns on `deals` table

### Technical Details

The RentCast API returns an array of property matches. We take the first result and extract:
- `bedrooms`, `bathrooms`, `squareFootage`, `lotSize`, `yearBuilt`, `propertyType`
- `lastSalePrice`, `lastSaleDate`
- `photos` array (URLs)

The full API response is stored in `enrichment_data` (jsonb) for future use. Individual fields are stored in dedicated columns for easy querying and display.

The auto-enrichment in `create_deal` is a direct function call within the same handler (not a separate AI iteration), keeping the flow to 1 tool call from the AI's perspective. If the API key is missing or the call fails, the deal is still created successfully — enrichment failure is non-blocking.

