

## Fix: Choppy Text Streaming

### Changes

**1. `src/components/chat/ChatPanel.tsx` (~lines 346-378)**

- Remove `updateScheduled` flag, `scheduleUpdate` function, and the `requestAnimationFrame` call
- Replace with direct state update in the `text_delta` handler:
```tsx
case "text_delta": {
  const parsed = JSON.parse(evt.data);
  if (!firstDeltaReceived) {
    firstDeltaReceived = true;
    setTypingStatus("");
  }
  streamingContentRef.current += parsed.text;
  const currentContent = streamingContentRef.current;
  setMessages((prev) =>
    prev.map((m) => (m.id === placeholderId ? { ...m, content: currentContent } : m))
  );
  break;
}
```

**2. `src/components/chat/StreamingText.tsx`**

- During streaming, render the already-parsed prefix as markdown and the trailing ~200 chars as raw text to avoid re-parsing full markdown on every delta
- Use a split approach: markdown-render everything except the last line, render the last line as plain `<span>` with `whitespace-pre-wrap`
- Place the blinking cursor inline after the last character instead of as a separate block element
- Wrap the markdown portion in `useMemo` keyed on a stable prefix (content minus last partial line)

```tsx
const StreamingText = React.memo(({ content }: StreamingTextProps) => {
  const lastNewline = content.lastIndexOf('\n');
  const stablePrefix = lastNewline > 0 ? content.slice(0, lastNewline) : '';
  const tailLine = lastNewline > 0 ? content.slice(lastNewline + 1) : content;

  const renderedPrefix = useMemo(() => (
    stablePrefix ? <ReactMarkdown remarkPlugins={[remarkBreaks]}>{stablePrefix}</ReactMarkdown> : null
  ), [stablePrefix]);

  return (
    <div className={PROSE_CLASSES}>
      {renderedPrefix}
      <span style={{ whiteSpace: 'pre-wrap' }}>{tailLine}</span>
      <span className="inline w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
    </div>
  );
});
```

### Files
- `src/components/chat/ChatPanel.tsx` — Remove RAF batching, use direct `setMessages`
- `src/components/chat/StreamingText.tsx` — Split render: markdown prefix + raw tail + inline cursor

