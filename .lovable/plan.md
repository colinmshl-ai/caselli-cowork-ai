

## Plan: Fix update_deal persistence in chat edge function

### Changes to `supabase/functions/chat/index.ts` (lines 181-200)

Replace the `update_deal` case with:

1. After building `cleanUpdates`, add numeric coercion for `contract_price` and `list_price`
2. Add stage validation against `VALID_STAGES` array, returning error if invalid
3. After the Supabase update call, add `console.error` logging when `error` is truthy
4. Add a check for `!data && !error` (no row matched) returning an error response

No other files or tools changed.

