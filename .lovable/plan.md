

## Plan: Add Property Data Enrichment via RentCast API — ✅ IMPLEMENTED

### What was done

1. **Database Migration** — Added 10 enrichment columns to `deals` table: `bedrooms`, `bathrooms`, `square_footage`, `lot_size`, `year_built`, `property_type`, `last_sale_price`, `last_sale_date`, `property_photos` (text[]), `enrichment_data` (jsonb).

2. **RENTCAST_API_KEY secret** — Added and configured.

3. **Edge Function (`supabase/functions/chat/index.ts`)**:
   - Added `enrich_property` tool definition with address/city/state/deal_id schema
   - Added tool handler that calls RentCast API, extracts property data, updates deal record
   - Added `enrich_property` entries in `summarizeToolInput`, `summarizeToolResult`, `TOOL_DESCRIPTIONS`
   - Updated `create_deal` handler to auto-enrich by parsing city/state from the address
   - Updated system prompt with PROPERTY ENRICHMENT instructions

### Next Steps (Prompt 3)
- Add `PropertyCard` component to render enrichment data with photos in the chat UI
