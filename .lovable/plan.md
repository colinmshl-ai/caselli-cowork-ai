

# Add Follow-Up Suggestion Chips Below AI Responses

## Changes

### 1. New file: `src/components/chat/SuggestionChips.tsx`
Component that maps a conversation context (last tool used, topic) to 2-3 contextual suggestion chips:

- **Deal created** (`create_deal`): "Draft listing description", "Create social media campaign", "Set up deadline alerts"
- **Social post drafted** (`draft_social_post`): "Adapt for Facebook", "Write a matching email blast", "Create a LinkedIn version"
- **Email drafted** (`draft_email`): "Draft a follow-up for next week", "Create a phone script version", "Add recipient to contacts"
- **Pipeline/overview** (`get_deals`, topic=deals): "Update deal stages", "Draft status emails to all clients", "Review this week's deadlines"
- **Contact added** (`add_contact`): "Draft intro email", "Create a deal for this contact"
- **General fallback**: "Show my active deals", "Draft a social post", "Check this week's deadlines"

Style: `border border-border rounded-full px-3 py-1.5 text-xs hover:bg-secondary transition-colors` — outlined pill buttons in a flex-wrap row.

Props: `lastToolUsed?: string`, `topic?: string`, `onSend: (msg: string) => void`

### 2. Update `src/components/chat/ChatPanel.tsx`
- Import `SuggestionChips`
- Track `lastToolUsed` in component state, set it after streaming completes from `toolsUsed` or conversation context
- Render `<SuggestionChips>` between the messages scroll area and the input box (inside the sticky input container, above the textarea), only when not currently streaming and messages exist
- When a chip is clicked, call `sendMessage(chipText)` and clear the chips

## Files modified: 2
- `src/components/chat/SuggestionChips.tsx` (new)
- `src/components/chat/ChatPanel.tsx`

