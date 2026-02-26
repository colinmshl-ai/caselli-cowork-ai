

# Upgrade System Prompt for Proactive Agentic Behavior

## Changes — `supabase/functions/chat/index.ts` only

### 1. Replace YOUR PERSONALITY section (lines 492-498)
Expand to "YOUR PERSONALITY AND BEHAVIOR" with proactive coworker directives: suggest next steps after every task, offer follow-up actions when creating deals or drafting content, flag deadlines within 48 hours, mention stale deal stages.

### 2. Replace YOUR CAPABILITIES section (lines 499-508)
Expand to "YOUR CAPABILITIES AND HOW TO USE THEM" with proactive tool usage instructions: auto-search contacts when names are mentioned, check for existing deals when addresses are mentioned, chain related actions together (create deal + add contact + offer social post), auto-populate email recipients from contacts.

### 3. Replace RULES section (lines 509-514)
Expand with additional directives: use tools proactively without waiting to be asked, think "what would a great assistant do next?" after every response, never give minimal answers.

### 4. Update model identifier (line 552)
Change `claude-sonnet-4-5-20250929` → `claude-sonnet-4-5-20250514`

### 5. Increase max_tokens (line 556)
Change `2048` → `4096`

## Files Modified: 1
- `supabase/functions/chat/index.ts`

