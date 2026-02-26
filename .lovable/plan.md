

# Chat Experience Improvements

## 1. Install `react-markdown` and render assistant messages with markdown

**File: `src/components/chat/ChatPanel.tsx`**
- Import `ReactMarkdown` from `react-markdown`
- For assistant messages, replace `<p className="whitespace-pre-wrap">{m.content}</p>` with `<ReactMarkdown>` wrapped in a `prose prose-sm` container
- User messages stay as plain `<p>` text

## 2. Welcome message for first-time users

**File: `src/components/chat/ChatPanel.tsx`**
- After conversations query loads: if `conversations.length === 0` and not yet initialized, auto-create a conversation titled "Welcome", insert an assistant message with the personalized welcome text, and display it
- Fetch user's `full_name` from profiles table, extract first name
- Welcome content uses the exact copy provided, with `[first name]` replaced
- Store as a real `messages` row with `role: "assistant"` so it persists

## 3. Typing indicator shows "Caselli is thinking..."

**File: `src/components/chat/ChatPanel.tsx`**
- Replace the `TypingIndicator` bouncing dots with a text-based indicator: `"Caselli is thinking..."` with a subtle pulse animation
- Keep the "C" avatar next to it

## 4. Remove `await memoryExtractionPromise` in edge function

**File: `supabase/functions/chat/index.ts`**
- Delete lines 601-602 (`await memoryExtractionPromise;` and the comment)
- The promise will fire-and-forget; Deno's runtime will still complete it before isolate shutdown
- Move `return new Response(...)` up immediately after the promise is created

