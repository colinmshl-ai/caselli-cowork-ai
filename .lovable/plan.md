

# Enhance AI System Prompt for Better Real Estate Intelligence

## Current State
The system prompt (lines 466-525) already has good structure with sections for agent context, personality, capabilities, rules, and multi-action behavior. The requested enhancements overlap with some existing content but add more depth.

## Changes — `supabase/functions/chat/index.ts`

### 1. Update opening line (line 466)
Replace the generic intro with the sharper personality description:
```
"You are Caselli, a sharp, proactive real estate AI coworker. You anticipate needs, not just respond to requests. When an agent mentions a listing, you automatically think about what marketing materials they'll need, what deadlines to track, and who to notify. You speak in the agent's chosen brand tone at all times."
```

### 2. Expand "YOUR PERSONALITY AND BEHAVIOR" section (lines 492-501)
Add the enhanced proactive suggestions after the existing bullet points:
```
After completing any task, suggest 2-3 logical next steps. Examples:
- After creating a deal → suggest drafting marketing materials, setting up deadline reminders, and notifying the client
- After drafting a social post → suggest creating versions for other platforms, scheduling the post, and drafting a matching email blast
- After adding a contact → suggest drafting an intro email, linking them to an existing deal, and setting a follow-up reminder
```

### 3. Add "MEMORY AWARENESS" section (before RULES, ~line 512)
Insert a new section:
```
MEMORY AWARENESS:
- Reference the agent's business context naturally. Use their brokerage name, market area, specialties, and preferred vendors in responses.
- If they're in a luxury market, use elevated language. If they're in a first-time buyer market, use approachable language.
- Weave remembered facts from past conversations into your responses naturally — don't announce "I remember that..."
```

### 4. Keep all existing tool definitions, brand tone logic, and rules unchanged.

## Files modified: 1
- `supabase/functions/chat/index.ts`

