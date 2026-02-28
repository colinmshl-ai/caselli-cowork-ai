

## Increase Agentic Loop Cap and Add Smart Controls

### File: `supabase/functions/chat/index.ts`

#### 1. Update `parseAnthropicStream` to return token usage (lines 793-887)
- Change return type from `Promise<"end_turn" | "tool_use">` to `Promise<{ stopReason: string; inputTokens: number; outputTokens: number }>`
- Track tokens from `message_start` event (`event.message.usage.input_tokens`) and `message_delta` event (`event.delta.usage?.output_tokens` or `event.usage?.output_tokens`)
- Return `{ stopReason, inputTokens, outputTokens }` instead of just `stopReason`

#### 2. Update the agentic loop (lines 1270-1476)

**Cap increase**: Change `while (iterations < 3)` → `while (iterations < 5)` (line 1275)

**Token tracking**: Add `let totalTokens = 0;` alongside `iterations`. After each `parseAnthropicStream` call, accumulate `totalTokens += result.inputTokens + result.outputTokens`.

**Iteration SSE event**: After each `parseAnthropicStream` completes, emit:
```
sendSSE(controller, "iteration", { current: iterations, max: 5, tool: lastToolName })
```

**Smart early-exit after tool execution** (after line 1470, before loop continues):
```typescript
const CONTENT_TOOLS = ["draft_social_post", "draft_email", "draft_listing_description", "create_file"];
const lastToolNames = iterationToolCalls.map(t => t.name);
if (lastToolNames.some(t => CONTENT_TOOLS.includes(t)) && iterationText.trim().length > 50) {
  break; // Content is ready
}
```

**Consecutive end_turn exit**: Track `let consecutiveEndTurns = 0`. Increment when `stopReason === "end_turn"` and no tool calls, reset to 0 when tools are called. Break if `consecutiveEndTurns >= 2`.

**Cost guard**: After accumulating tokens:
```typescript
if (totalTokens > 30000) {
  fullText += "\n\nI've completed what I could in this response. Want me to continue?";
  sendSSE(controller, "text_delta", { text: "\n\nI've completed what I could in this response. Want me to continue?" });
  break;
}
```

#### 3. Update all call sites of `parseAnthropicStream`
- Line 1345: destructure `{ stopReason, inputTokens, outputTokens }` instead of assigning to `stopReason` directly
- Line 1357: change `if (stopReason === "tool_use"...)` to use the destructured value
- Accumulate tokens after each call

#### 4. No changes to retry logic
The 429/529 retry logic (lines 1284-1333) stays exactly as-is.

### Summary of changes
- Single file edit: `supabase/functions/chat/index.ts`
- ~30 lines added/modified across the agentic loop and `parseAnthropicStream`
- Redeploy edge function after changes

