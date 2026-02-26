

# Add Copy Buttons with Lucide Icons

## 1. Update `src/components/chat/CopyButton.tsx`
- Add lucide-react imports: `Copy`, `Check`
- Replace text-only button with icon + text: `<Copy size={14} />` + "Copy" in default state, `<Check size={14} />` + "Copied" in copied state
- Styling: `flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors`
- Copied state icon uses `text-primary`

## 2. Content cards already use `<CopyButton>` — no changes needed
`SocialPostCard`, `EmailCard`, `ListingCard` already import and render `CopyButton` in their bottom bars with appropriate text props.

## 3. Add hover copy button to assistant messages in `src/components/chat/ChatPanel.tsx`
- Import `CopyButton`
- On the assistant message wrapper div (line 289-293), add `group relative` classes
- Inside that div, after `<ContentCardRenderer>`, add a positioned CopyButton:
  ```
  <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
    <CopyButton text={m.content} />
  </div>
  ```

**3 files total: 1 updated component, 1 modified integration point. Cards already wired.**

