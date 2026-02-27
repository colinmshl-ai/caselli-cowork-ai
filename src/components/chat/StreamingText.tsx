import React from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

const PROSE_CLASSES =
  "prose prose-sm max-w-none prose-p:my-2 prose-p:leading-relaxed [&>p]:mb-3 prose-ul:my-2 prose-li:my-1 prose-li:leading-relaxed prose-ul:pl-4 prose-headings:my-2 prose-strong:text-foreground prose-a:text-primary text-foreground";

interface StreamingTextProps {
  content: string;
}

const StreamingText = React.memo(({ content }: StreamingTextProps) => (
  <div className={PROSE_CLASSES}>
    <ReactMarkdown remarkPlugins={[remarkBreaks]}>{content}</ReactMarkdown>
    <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
  </div>
));

StreamingText.displayName = "StreamingText";

export default StreamingText;
