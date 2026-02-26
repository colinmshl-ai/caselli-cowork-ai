

# Streaming Chat Responses via SSE

## Overview
Replace the current request-response pattern with Server-Sent Events (SSE) streaming. The edge function will stream text deltas and tool status events. The frontend will progressively render the assistant's response.

## 1. Edge Function (`supabase/functions/chat/index.ts`)

**Keep unchanged:** Auth, context fetching (lines 1-431), `executeTool`, `TOOLS`, `TOOL_DESCRIPTIONS`, system prompt construction, message history building.

**Replace the Anthropic call + tool loop + response (lines 441-625) with streaming logic:**

- Create a `ReadableStream` and return it immediately with `Content-Type: text/event-stream` + CORS headers
- Inside the stream's `start(controller)` callback, run the async logic:

### SSE helper
```typescript
function sendSSE(controller, event: string, data: object) {
  controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
}
```

### Streaming Anthropic call
- Add `stream: true` to the Anthropic request body
- Read the response as a stream line-by-line (SSE from Anthropic)
- Parse Anthropic SSE events:
  - `content_block_delta` with `delta.type === "text_delta"` → forward as `event: text_delta` with `data: {"text": delta.text}` and accumulate into `fullText`
  - `content_block_start` with `content_block.type === "tool_use"` → start tracking current tool call (name, id, accumulate input JSON)
  - `content_block_delta` with `delta.type === "input_json_delta"` → accumulate JSON string for the tool input
  - `content_block_stop` → if tracking a tool_use block, finalize the tool input
  - `message_delta` with `stop_reason === "tool_use"` → execute accumulated tools, send `tool_status` events, then make another streaming Anthropic call with tool results and continue parsing
  - `message_delta` with `stop_reason === "end_turn"` → done

### Tool use during streaming
When `stop_reason === "tool_use"`:
1. Send `event: tool_status` for each tool being called
2. Execute all tools via `executeTool()` + log to `task_history`
3. Build `currentMessages` with assistant content + tool results
4. Make another streaming Anthropic call with `stream: true`
5. Continue parsing the new stream (loop up to 5 iterations)

### After streaming completes
- Send `event: done` with `data: {"tools_used": [...]}`
- Save complete assistant message to DB
- Fire memory extraction (non-blocking, same as current)
- Close the stream

### Error handling
- Wrap in try/catch; on error send `event: error` then close stream

## 2. Frontend (`src/components/chat/ChatPanel.tsx`)

**Replace `supabase.functions.invoke("chat", ...)` in `sendMessage` with:**

```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const session = (await supabase.auth.getSession()).data.session;
const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session?.access_token}`,
    "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  },
  body: JSON.stringify({ conversation_id: convoId, message: text.trim() }),
});
```

**Stream reading:**
- Check `response.headers.get("content-type")` — if `text/event-stream`, use streaming; otherwise fall back to current JSON behavior
- Use `response.body.getReader()` + `TextDecoder` to read chunks
- Parse SSE events from the text buffer (split on `\n\n`, extract `event:` and `data:` lines)
- Before streaming starts, add a placeholder assistant message to `messages` state with empty content
- On `text_delta`: update the last message's content by appending the delta text
- On `tool_status`: update `typingStatus` with the tool's status message
- On `done`: parse `tools_used`, call `onConversationContext`, fetch the saved message from DB to get the real ID, replace the placeholder
- On `error`: show error in the message

**Key state management:**
- Use a ref (`streamingContentRef`) to accumulate text without causing re-renders on every character
- Batch UI updates using `requestAnimationFrame` or a 50ms throttle to avoid excessive re-renders
- Clear `typingStatus` when text starts streaming (switch from "Thinking..." to showing the actual text)

## 3. Fallback
- If `response.headers` doesn't indicate SSE, parse as JSON and use the existing `fnData.response` / `fnData.tools_used` flow (unchanged from current code)

## Files modified: 2
- `supabase/functions/chat/index.ts` (streaming response)
- `src/components/chat/ChatPanel.tsx` (stream reader)

