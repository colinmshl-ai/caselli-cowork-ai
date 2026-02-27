

## Fix: History Button Not Working

**Root cause:** In `ChatPanel.tsx` (line 555-565), `SheetTrigger asChild` wraps a `Tooltip` component. With `asChild`, `SheetTrigger` passes its click handler to its direct child — but `Tooltip` is a compound component that doesn't forward click events to the DOM. The button never receives the sheet's open trigger.

**Fix in `src/components/chat/ChatPanel.tsx` (lines 555-565):**

Flip the nesting so `Tooltip` wraps `SheetTrigger`, and `SheetTrigger asChild` wraps the actual `<button>`:

```tsx
// BEFORE (broken)
<SheetTrigger asChild>
  <Tooltip>
    <TooltipTrigger asChild>
      <button>...</button>
    </TooltipTrigger>
    <TooltipContent>History</TooltipContent>
  </Tooltip>
</SheetTrigger>

// AFTER (fixed)
<Tooltip>
  <TooltipTrigger asChild>
    <SheetTrigger asChild>
      <button>...</button>
    </SheetTrigger>
  </TooltipTrigger>
  <TooltipContent>History</TooltipContent>
</Tooltip>
```

Single file, single change — just swap the nesting order.

