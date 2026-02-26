

# Replace Static Welcome with Dynamic Morning Briefing

## Changes — `src/components/chat/ChatPanel.tsx` only

### 1. Delete `WELCOME_TEMPLATE` constant (lines 39-40)
Remove the static template string entirely.

### 2. Replace `sendWelcomeMessage` function (lines 142-171)
Replace with a dynamic version that:
- Fetches user's active deals (excluding closed/fell_through) and recent task history in parallel
- Builds a time-of-day greeting (morning/afternoon/evening)
- For new users (no deals/tasks): shows the original capability list
- For returning users: shows pipeline count, flags urgent deadlines within 3 days (closing, inspection, financing, appraisal), and prompts for focus
- Creates conversation titled with the greeting + "briefing"

## Files Modified: 1
- `src/components/chat/ChatPanel.tsx`

