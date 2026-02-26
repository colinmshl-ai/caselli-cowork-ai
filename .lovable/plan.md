

# Improve AI Context Memory Within and Across Conversations

## Current State
- **Within conversation**: Message history is sent, but tool results (the actual data) are only logged, not included in the prompt. The AI sees `[Used create_deal]` but not the deal details, so it can't reference "that post" or "the same listing."
- **Across conversations**: Welcome message fetches deals and last 5 tasks but presents a generic briefing — doesn't name the last conversation's specific work.
- **Memory extraction**: Already uses `claude-sonnet-4-20250514` — no change needed.

## Changes

### 1. Edge function: Enrich within-conversation context (`supabase/functions/chat/index.ts`)

Update the message history builder (lines 536-546) to include tool call inputs AND summarized results in assistant messages, not just tool names:

```
[Used create_deal: property_address="500 Las Olas Blvd", client_name="Victoria Lane" → created deal abc123]
[Used draft_social_post: platform="instagram", property_address="500 Las Olas Blvd" → drafted post]
```

This gives the AI enough context to know "which post" and "which listing" when the user says "make it shorter."

### 2. Edge function: Add recent activity context to system prompt (`supabase/functions/chat/index.ts`)

Fetch last 5 `task_history` entries and include them in the system prompt as `RECENT ACTIVITY` section, so even in a new conversation the AI knows what was done recently.

Also fetch the title of the most recent conversation to reference it in greeting context.

### 3. Frontend: Improve welcome message to reference last session (`ChatPanel.tsx`)

Update `sendWelcomeMessage` to fetch the most recent conversation title and last task_history entries, then craft a greeting like: "Welcome back, Alex. Last time we worked on [conversation title]. Want to continue or start something new?"

### 4. Edge function: Include tool_results in metadata for richer history

When saving assistant messages, also store summarized tool results in the metadata (not just tool name + input), so reloaded conversations preserve full context.

## Files modified: 2
- `supabase/functions/chat/index.ts` — enrich message history with tool results, add recent activity to system prompt, store richer metadata
- `src/components/chat/ChatPanel.tsx` — improve welcome message to reference last session work

