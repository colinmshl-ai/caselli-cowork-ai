

# Fix Chat Edge Function: Invalid Anthropic Model Name

## Problem
The chat edge function fails with `not_found_error` because the model name `claude-sonnet-4-5-20250514` is invalid. Sonnet 4.5 uses date `20241022`, not `20250514`.

## Fix

Update **`supabase/functions/chat/index.ts`** — replace all 2 occurrences of `claude-sonnet-4-5-20250514` with `claude-sonnet-4-5-20241022`:

1. **Line 552** (main chat call): `"claude-sonnet-4-5-20250514"` → `"claude-sonnet-4-5-20241022"`
2. **Line 666** (memory extraction call): `"claude-sonnet-4-5-20250514"` → `"claude-sonnet-4-5-20241022"`

## Files Modified: 1
- `supabase/functions/chat/index.ts`

