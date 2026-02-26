

# Store Structured Tool Results Alongside Message Content

## Changes

### 1. Database migration
Add `metadata jsonb` column to `messages` table:
```sql
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT null;
```

### 2. `supabase/functions/chat/index.ts` — 4 edits

**A. Track tool calls (after line 548, near `toolsUsed` declaration):**
Add `toolCallLog` array to capture tool name, input, and result for each execution.

**B. Push to log after `executeTool` returns (after line 630):**
Append `{ tool: tool.name, input: tool.input, result }` to `toolCallLog`.

**C. Save metadata with message (lines 670-678):**
Build metadata from `toolCallLog` (only tool names + inputs to keep size manageable) and include in the message insert.

**D. Include metadata in history query (line 458):**
Change select from `"role, content"` to `"role, content, metadata"`.

**E. Enrich apiMessages with tool context (lines 527-533):**
When building messages for the AI, prepend `[Used tool_name]` summaries to assistant messages that have metadata.

### Files modified: 1 file + 1 migration
- `supabase/functions/chat/index.ts`
- Database migration for `metadata` column

