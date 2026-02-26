
# Fix: Correct Anthropic Model String

## Problem
Both model strings in `supabase/functions/chat/index.ts` use `"claude-sonnet-4-5-20250514"` which doesn't exist. Anthropic returns `not_found_error`.

## Changes — `supabase/functions/chat/index.ts`

**Line 570** — Main chat call:
`"claude-sonnet-4-5-20250514"` → `"claude-sonnet-4-20250514"`

**Line 702** — Memory extraction call:
`"claude-sonnet-4-5-20250514"` → `"claude-sonnet-4-20250514"`

## Files modified: 1
- `supabase/functions/chat/index.ts`
