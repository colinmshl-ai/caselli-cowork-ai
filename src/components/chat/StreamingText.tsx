import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

const PROSE_CLASSES =
  "prose prose-sm max-w-none prose-p:my-2 prose-p:leading-relaxed [&>p]:mb-3 prose-ul:my-2 prose-li:my-1 prose-li:leading-relaxed prose-ul:pl-4 prose-headings:my-2 prose-strong:text-foreground prose-a:text-primary text-foreground";

interface StreamingTextProps {
  content: string;
}

const StreamingText = React.memo(({ content }: StreamingTextProps) => {
  const isEmpty = !content.trim();
  const lastNewline = content.lastIndexOf('\n');
  const stablePrefix = lastNewline > 0 ? content.slice(0, lastNewline) : '';
  const tailLine = lastNewline > 0 ? content.slice(lastNewline + 1) : content;

  const renderedPrefix = useMemo(
    () =>
      stablePrefix ? (
        <ReactMarkdown remarkPlugins={[remarkBreaks]}>{stablePrefix}</ReactMarkdown>
      ) : null,
    [stablePrefix]
  );

  if (isEmpty) {
    return (
      <div className={PROSE_CLASSES}>
        <span className="text-muted-foreground italic">Generating response...</span>
        <span className="inline-block w-0.5 h-3.5 bg-primary/50 animate-pulse ml-0.5 align-text-bottom rounded-full" />
      </div>
    );
  }

  return (
    <div className={PROSE_CLASSES}>
      {renderedPrefix}
      <span style={{ whiteSpace: 'pre-wrap' }}>{tailLine}</span>
      <span className="inline-block w-0.5 h-3.5 bg-primary/50 animate-pulse ml-0.5 align-text-bottom rounded-full" />
    </div>
  );
});

StreamingText.displayName = "StreamingText";

export default StreamingText;
