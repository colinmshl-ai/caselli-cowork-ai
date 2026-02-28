

## Plan: PropertyListingCard Component + Integration

### 1. Create `src/components/chat/PropertyListingCard.tsx`

New component with:
- **Hero image**: First photo from `property_photos` array with `+N photos` badge overlay; gradient placeholder with `Home` icon if no photos
- **Address title** + prominent price display
- **Stats row**: `BedDouble` + beds, `Bath` + baths, `Ruler` + sqft, `Calendar` + year built (all from lucide-react)
- **Property type badge**: `px-2.5 py-0.5 text-[11px]` per design system
- **Attribution**: "Enriched via RentCast" in `text-[10px] text-muted-foreground`
- **Action buttons**: "Draft Post" / "Email Blast" / "Listing Description" calling `onAction` with contextual messages
- **Style**: `border-l-4 border-l-blue-500 rounded-xl bg-card border-border animate-fade-in-up` (blue-500 to distinguish from email's blue-400 and social's violet)

Props interface:
```typescript
interface PropertyListingCardProps {
  address: string;
  price?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  yearBuilt?: number;
  propertyType?: string;
  photos?: string[];
  onAction?: (message: string) => void;
}
```

### 2. Update `ContentCardRenderer.tsx`

- Import `PropertyListingCard`
- Add `"property_enriched"` to the `ContentTypeHint` type
- Add `detectPropertyEnriched()` function: detects ✅ lines with bed/bath/sqft patterns
- Add `parsePropertyEnriched()`: extracts address, price, beds, baths, sqft, year built, photos from the structured ✅ confirmation text
- In `renderCardOnly()`: add case for `contentTypeHint === "property_enriched"` that parses and renders `PropertyListingCard`
- In `renderSection()`: add `"property_enriched"` to the hint check alongside email/social/listing

### 3. Update `ToolProgressCard.tsx`

- Add import: `Search` from lucide-react
- Add to `TOOL_ICONS`: `enrich_property: Search`

### 4. Update `supabase/functions/chat/index.ts`

- Add `enrich_property: "property_enriched"` to `DRAFT_CONTENT_TYPE_MAP` (line ~1384)
- Also map `create_deal` to `"property_enriched"` when `enrich_property` was also used in the same turn (check toolCallLog for both)

### Files Modified
- `src/components/chat/PropertyListingCard.tsx` (new)
- `src/components/chat/ContentCardRenderer.tsx`
- `src/components/chat/ToolProgressCard.tsx`
- `supabase/functions/chat/index.ts`

