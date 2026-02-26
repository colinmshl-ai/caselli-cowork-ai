

# Fix: AI Chat "AI service error" — model string + error handling

## Changes — `supabase/functions/chat/index.ts`

### 1. Fix memory extraction model string (line 702)
Change `"claude-sonnet-4-5-20250929"` → `"claude-sonnet-4-5-20250514"` to match main chat model.

### 2. Surface real errors instead of generic messages

**Line 582** — Anthropic API error during main chat:
```typescript
sendSSE(controller, "error", { message: `Chat error: ${errText.slice(0, 200)}` });
```

**Line 746** — Streaming error catch:
```typescript
sendSSE(controller, "error", { message: `Chat error: ${err?.message || 'Unknown error'}` });
```

**Line 763** — Outer catch:
```typescript
return new Response(JSON.stringify({ error: `Chat error: ${err?.message || 'Unknown error'}` }), {
```

### Note
Memory extraction already has a try/catch (lines 692-739) — no change needed there.

### Files modified: 1
- `supabase/functions/chat/index.ts`

