

# Contextual Typing Indicator

## Changes

### 1. Edge function: Add `tools_used` to response (`supabase/functions/chat/index.ts`)

- Create a `toolsUsed` array at the start of the tool loop
- Define a description map: `get_active_deals` → "Looking up your deals...", etc.
- Each time a tool_use block is processed, push `{ tool, description }` to the array
- Include `tools_used` in the final JSON response alongside `response`

### 2. ChatPanel: Dynamic typing status (`src/components/chat/ChatPanel.tsx`)

- Replace `const [typing, setTyping] = useState(false)` with `const [typingStatus, setTypingStatus] = useState("")`
- Update `TypingIndicator` to accept a `status: string` prop and render it
- In `sendMessage`:
  - Set `typingStatus("Thinking...")` before the edge function call
  - After response arrives, if `tools_used` array is non-empty, sequentially flash each tool description for 600ms using a small async loop with `setTimeout`
  - After all tool descriptions shown (or if none), clear `typingStatus("")` and display the response
- Update render: show indicator when `typingStatus !== ""` instead of `typing`
- Update auto-scroll dependency from `typing` to `typingStatus`

### Tool description map (edge function)

```
get_active_deals       → "Looking up your deals..."
get_deal_details       → "Pulling deal details..."
update_deal            → "Updating your deal..."
check_upcoming_deadlines → "Checking your deadlines..."
create_deal            → "Creating a new deal..."
draft_social_post      → "Drafting a social post..."
draft_listing_description → "Writing a listing description..."
draft_email            → "Drafting an email..."
search_contacts        → "Searching your contacts..."
add_contact            → "Adding a new contact..."
update_contact         → "Updating contact info..."
```

**2 files modified. No database changes.**

