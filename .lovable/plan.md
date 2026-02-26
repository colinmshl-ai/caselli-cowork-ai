

# Rich Draft Content Cards in Chat

## New Files

### 1. `src/components/chat/SocialPostCard.tsx`
- Props: `platform: string`, `content: string`
- Top bar with platform name (uppercase, tracking-wider, text-xs font-medium text-muted-foreground)
- Body with post content (text-sm, whitespace-pre-wrap)
- Bottom bar with character count (left) and Copy button (right)
- Copy button: text-xs text-muted-foreground hover:text-foreground, uses clipboard API, toggles to "Copied!" for 2s

### 2. `src/components/chat/EmailCard.tsx`
- Props: `to: string`, `subject: string`, `body: string`
- Header section with To and Subject fields
- Body section with email content (leading-relaxed)
- Bottom bar with Copy button

### 3. `src/components/chat/ListingCard.tsx`
- Props: `address: string`, `stats: string` (beds/baths/sqft line), `description: string`
- Header with address and stats row (separated by middle dots)
- Body with listing description
- Bottom bar with Copy button

### 4. `src/components/chat/ContentCardRenderer.tsx`
- Takes full message `content: string`
- Detection logic via regex:
  - **Email**: contains `Subject:` AND (`To:` or `Dear ` or `Hi `)
  - **Social**: contains `Instagram`/`Facebook`/`LinkedIn` AND a draft block
  - **Listing**: contains `bed` AND `bath` AND address-like pattern
- Splits content into "intro text" (before the draft) and "draft content"
- Renders intro via `<ReactMarkdown>`, then the appropriate card component
- Falls back to full `<ReactMarkdown>` if no pattern matches

## Modified File

### `src/components/chat/ChatPanel.tsx`
- Import `ContentCardRenderer`
- Replace lines 296-299 (the `<ReactMarkdown>` block for assistant messages) with `<ContentCardRenderer content={m.content} />`
- All other code untouched

## Shared Card Styling
- Container: `border border-border rounded-md overflow-hidden bg-background mt-3`
- Sections separated by `border-b border-border` / `border-t border-border`
- Padding: `px-4 py-2.5` for bars, `px-4 py-3` for body
- No shadows, gradients, or decorative elements
- Copy button reused across all three cards as a small inline component

