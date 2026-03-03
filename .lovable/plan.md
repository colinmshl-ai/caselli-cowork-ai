

## Migrate Chat from Anthropic API to Lovable AI Gateway

The current `chat` edge function calls the Anthropic API directly using `ANTHROPIC_API_KEY` (which is currently returning authentication errors). This plan migrates it to use the Lovable AI gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`) with `LOVABLE_API_KEY`, enabling agent-like behavior through OpenAI-compatible tool calling.

### What changes

**Single file: `supabase/functions/chat/index.ts`** — major refactor of the AI provider layer while keeping all business logic (tools, SSE events, memory, etc.) intact.

### Key architectural changes

1. **API endpoint**: `api.anthropic.com/v1/messages` → `ai.gateway.lovable.dev/v1/chat/completions`
2. **Auth**: `x-api-key: ANTHROPIC_API_KEY` → `Authorization: Bearer LOVABLE_API_KEY`
3. **Model**: `claude-sonnet-4-20250514` → `google/gemini-2.5-flash` (default, fast + capable for tool calling). Title generation and memory extraction also switch to this model.
4. **Tool format**: Anthropic tools → OpenAI function-calling format (`tools: [{ type: "function", function: { name, description, parameters } }]`)
5. **System prompt**: Anthropic content blocks with `cache_control` → single `{ role: "system", content: "..." }` message (no prompt caching on gateway)
6. **Streaming parser**: Replace `parseAnthropicStream` with `parseOpenAIStream` that handles OpenAI SSE deltas (`choices[0].delta.content`, `choices[0].delta.tool_calls`)
7. **Web search tool**: Remove `web_search_20250305` (Anthropic-specific server-side search). The agent loop still works — just without proactive web search. Web search can be re-added later as a custom tool using an external API.
8. **Tool result format**: Anthropic `tool_result` messages → OpenAI `tool` role messages with `tool_call_id`

### Streaming parser replacement

The new `parseOpenAIStream` will:
- Read SSE lines from the gateway response
- Parse `data: {...}` JSON, handle `[DONE]`
- Extract `choices[0].delta.content` → call `onText(text)` + emit `text_delta` SSE
- Accumulate `choices[0].delta.tool_calls` (streamed incrementally with `index` and `function.arguments` deltas) → call `onToolUse` when complete
- Return `{ stopReason, toolCalls }` — `stopReason` is `"stop"` or `"tool_calls"`

### Agent loop adaptation

The agentic loop (up to 5 iterations) remains the same structure:
1. Call the gateway with messages + tools
2. If `finish_reason === "tool_calls"` → execute tools, append tool results as `{ role: "tool", tool_call_id, content }` messages, loop
3. If `finish_reason === "stop"` → break

### What stays the same
- All 15 custom tools and their `executeTool` logic
- SSE event protocol (`tool_start`, `tool_done`, `todo_update`, `done`, etc.)
- Memory extraction (switches to gateway call instead of Anthropic)
- Title generation (switches to gateway call)
- Conversation history loading and message saving
- Undo actions, chip context, content type detection
- All frontend code — zero client-side changes needed

### Technical details

**Tool definition conversion** (applied to all 15 tools):
```
// Anthropic format (current)
{ name, description, input_schema: { type: "object", properties, required } }

// OpenAI format (new)
{ type: "function", function: { name, description, parameters: { type: "object", properties, required } } }
```

**Message format for tool results** (in the agent loop):
```
// Anthropic (current): role: "user", content: [{ type: "tool_result", tool_use_id, content }]
// OpenAI (new): role: "tool", tool_call_id, content: "..."
```

**Non-streaming calls** for title generation and memory extraction will use the same gateway endpoint without `stream: true`, parsing `choices[0].message.content` from the JSON response.

