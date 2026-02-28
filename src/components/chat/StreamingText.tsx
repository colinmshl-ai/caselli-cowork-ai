import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

const PROSE_CLASSES =
  "prose prose-sm max-w-none prose-p:my-2 prose-p:leading-relaxed [&>p]:mb-3 prose-ul:my-2 prose-li:my-1 prose-li:leading-relaxed prose-ul:pl-4 prose-headings:my-2 prose-strong:text-foreground prose-a:text-primary text-foreground";

interface StreamingTextProps {
  content: string;
}

const StreamingText = React.memo(({ content }: StreamingTextProps) => {
  const isEmpty = !content.trim();

  const [debouncedContent, setDebouncedContent] = useState(content);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedContent(content), 100);
    return () => clearTimeout(timer);
  }, [content]);

  if (isEmpty) {
    return (
      <div className={PROSE_CLASSES}>
        <span className="text-muted-foreground italic">Thinking...</span>
        <span className="inline-block w-0.5 h-3.5 bg-primary/50 animate-pulse ml-0.5 align-text-bottom rounded-full" />
      </div>
    );
  }

  return (
    <div className={PROSE_CLASSES}>
      <ReactMarkdown remarkPlugins={[remarkBreaks]}>{debouncedContent}</ReactMarkdown>
      <span className="inline-block w-0.5 h-3.5 bg-primary/50 animate-pulse ml-0.5 align-text-bottom rounded-full" />
    </div>
  );
});

StreamingText.displayName = "StreamingText";

export default StreamingText;
