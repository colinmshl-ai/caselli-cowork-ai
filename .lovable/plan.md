

## Analysis: Conversation Persistence Already Exists

The requested feature is **already implemented**. Here's what's in place:

| Feature | Status | Location |
|---------|--------|----------|
| `conversations` table with RLS | Done | DB schema |
| `messages` table with RLS | Done | DB schema |
| Save user messages to DB | Done | ChatPanel.tsx:312 |
| Save assistant messages to DB | Done | Backend edge function |
| Load messages on mount | Done | ChatPanel.tsx:169-197 |
| Create conversation on first message | Done | ChatPanel.tsx:297-308 |
| Conversation history sidebar | Done | ChatPanel.tsx:637-684 |
| New conversation button | Done | ChatPanel.tsx:603-609 |
| Store metadata in JSONB column | Done | messages table has `metadata` column |

### Only Gap: URL-based conversation ID

Currently the conversation ID is only in React state. Adding it to the URL (`/chat?c=uuid`) would allow:
- Sharing a link to a specific conversation
- Browser back/forward between conversations

### Proposed Change (if desired)

**`src/pages/Chat.tsx`**: Read `c` param from URL, pass to ChatPanel as `initialConversationId`

**`src/components/chat/ChatPanel.tsx`**:
- On `setActiveConvoId`, also update URL via `searchParams.set("c", id)`
- On mount, if `c` param exists, use it instead of loading most recent conversation
- On `startNewChat`, clear the `c` param

This is ~15 lines of change across 2 files. No database migration needed.

