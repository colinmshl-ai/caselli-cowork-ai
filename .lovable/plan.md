

## Smarter Memory Extraction in Chat Edge Function

### File: `supabase/functions/chat/index.ts`

#### 1. Add cooldown map (top-level, outside handler, ~line 1)
```typescript
const lastExtractionMap = new Map<string, number>();
```

#### 2. Add helper functions (before the handler, ~line 30)

**Smart filter** replacing the simple length check:
```typescript
const shouldExtractMemory = (text: string, toolResults: Array<{tool: string}>): boolean => {
  if (text.length < 150) return false;
  const displayOnlyTools = ['get_active_deals', 'get_deal_details', 'check_upcoming_deadlines', 'search_contacts'];
  const toolsUsed = toolResults.map(t => t.tool);
  if (toolsUsed.length > 0 && toolsUsed.every(t => displayOnlyTools.includes(t))) return false;
  const specialCharRatio = (text.match(/[📍📊📅✅$|•\-\d]/g) || []).length / text.length;
  if (specialCharRatio > 0.15) return false;
  return true;
};
```

**Word-overlap similarity** for fuzzy dedup:
```typescript
const wordSimilarity = (a: string, b: string): number => {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) { if (wordsB.has(w)) overlap++; }
  return overlap / Math.max(wordsA.size, wordsB.size);
};
```

#### 3. Replace the extraction guard (line 1647)
Change:
```typescript
const shouldExtractMemory = message.length > 20 && toolCallLog.length > 0;
```
To:
```typescript
const toolResults = toolCallLog.map(t => ({ tool: t.tool || t.name }));
const doExtract = shouldExtractMemory(assistantContent, toolResults);
// Cooldown: skip if last extraction < 5 min ago
const lastExtraction = lastExtractionMap.get(userId) || 0;
const cooldownOk = Date.now() - lastExtraction > 5 * 60 * 1000;
```
Then change `if (shouldExtractMemory)` to `if (doExtract && cooldownOk)` and add `lastExtractionMap.set(userId, Date.now());` at the start of the async block.

#### 4. Replace exact-match dedup with similarity threshold (lines 1691-1696)
Change the filter from substring includes to:
```typescript
.filter((f: { fact: string }) => {
  const lower = f.fact.toLowerCase();
  return !existingTexts.some((existing: string) => wordSimilarity(existing, lower) > 0.8);
})
```
Where `existingTexts` stays as `(existingFacts || []).map(f => f.fact.toLowerCase())`.

