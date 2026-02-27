import React from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { CheckCircle } from "lucide-react";

const PROSE_CLASSES =
  "prose prose-sm max-w-none prose-p:my-2 prose-p:leading-relaxed [&>p]:mb-3 prose-ul:my-2 prose-li:my-1 prose-li:leading-relaxed prose-ul:pl-4 prose-headings:my-2 prose-strong:text-foreground prose-a:text-primary text-foreground";

interface ConversationalRendererProps {
  content: string;
  onAction?: (message: string) => void;
}

interface Segment {
  type: "confirmation" | "markdown" | "suggestions" | "closing_question";
  content: string;
  items?: string[];
}

function parseConversational(content: string): Segment[] {
  const lines = content.split("\n");
  const segments: Segment[] = [];
  const confirmations: string[] = [];
  const markdownLines: string[] = [];
  let suggestionsHeader = "";
  const suggestionItems: string[] = [];
  let inSuggestions = false;
  let closingQuestion = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect ✅ confirmation lines
    if (trimmed.startsWith("✅")) {
      confirmations.push(trimmed);
      continue;
    }

    // Detect suggestion header — only match lines clearly offering next-step suggestions
    if (
      !inSuggestions &&
      /(?:next\s+steps|suggestion|would you like me to|want me to|I can also)\s*.*:/i.test(trimmed)
    ) {
      // Flush markdown before suggestions
      if (markdownLines.length > 0) {
        const text = markdownLines.join("\n").trim();
        if (text) segments.push({ type: "markdown", content: text });
        markdownLines.length = 0;
      }
      suggestionsHeader = trimmed;
      inSuggestions = true;
      continue;
    }

    // Collect suggestion items (numbered or bulleted lines after a suggestion header)
    if (inSuggestions) {
      if (/^(\d+[\.\)]\s*|[-•*]\s+)/.test(trimmed)) {
        const itemText = trimmed.replace(/^(\d+[\.\)]\s*|[-•*]\s+)/, "").replace(/\*\*/g, "").trim();
        if (itemText) suggestionItems.push(itemText);
        continue;
      }
      // Empty line continues suggestions section
      if (trimmed === "") continue;
      // Non-list line ends suggestion collection
      inSuggestions = false;
    }

    markdownLines.push(line);
  }

  // Detect closing question: last non-empty markdown line ending with ?
  const finalMarkdown = markdownLines.join("\n").trim();
  if (finalMarkdown) {
    const mdLines = finalMarkdown.split("\n");
    const lastNonEmpty = [...mdLines].reverse().find((l) => l.trim().length > 0);
    if (lastNonEmpty && lastNonEmpty.trim().endsWith("?")) {
      closingQuestion = lastNonEmpty.trim();
      // Remove from markdown
      const idx = mdLines.lastIndexOf(lastNonEmpty);
      mdLines.splice(idx, 1);
      const remaining = mdLines.join("\n").trim();
      if (remaining) segments.unshift({ type: "markdown", content: remaining });
    } else {
      segments.unshift({ type: "markdown", content: finalMarkdown });
    }
  }

  // Build final segment list in order
  const result: Segment[] = [];

  // 1. Confirmations first
  for (const c of confirmations) {
    result.push({ type: "confirmation", content: c });
  }

  // 2. Markdown segments (in original order from segments array)
  for (const s of segments) {
    if (s.type === "markdown") result.push(s);
  }

  // 3. Suggestions
  if (suggestionItems.length > 0) {
    result.push({
      type: "suggestions",
      content: suggestionsHeader,
      items: suggestionItems,
    });
  }

  // 4. Closing question
  if (closingQuestion) {
    result.push({ type: "closing_question", content: closingQuestion });
  }

  return result;
}

function ConfirmationBanner({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2 text-sm font-medium text-green-700 dark:text-green-400 animate-fade-in">
      <CheckCircle className="h-4 w-4 shrink-0" />
      <span>{text.replace(/^✅\s*/, "")}</span>
    </div>
  );
}

function SuggestionCard({
  text,
  index,
  onAction,
}: {
  text: string;
  index: number;
  onAction?: (msg: string) => void;
}) {
  return (
    <button
      onClick={() => onAction?.(text)}
      className="w-full text-left rounded-lg border border-border/60 bg-secondary/30 px-3 py-2 text-sm text-foreground hover:bg-secondary/60 hover:border-border transition-all duration-150 animate-fade-in"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
    >
      {text}
    </button>
  );
}

const ConversationalRenderer = React.forwardRef<HTMLDivElement, ConversationalRendererProps>(({ content, onAction }, ref) => {
  const segments = parseConversational(content);

  if (segments.length === 0) {
    return (
      <div className={PROSE_CLASSES}>
        <ReactMarkdown remarkPlugins={[remarkBreaks]}>{content}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {segments.map((seg, i) => {
        switch (seg.type) {
          case "confirmation":
            return <ConfirmationBanner key={i} text={seg.content} />;
          case "markdown":
            return (
              <div key={i} className={PROSE_CLASSES}>
                <ReactMarkdown remarkPlugins={[remarkBreaks]}>{seg.content}</ReactMarkdown>
              </div>
            );
          case "suggestions":
            return (
              <div key={i} className="space-y-2">
                {seg.content && (
                  <p className="text-sm text-muted-foreground font-medium">
                    {seg.content.replace(/:$/, "")}:
                  </p>
                )}
                <div className="flex flex-col gap-1.5">
                  {seg.items?.map((item, j) => (
                    <SuggestionCard key={j} text={item} index={j} onAction={onAction} />
                  ))}
                </div>
              </div>
            );
          case "closing_question":
            return (
              <p
                key={i}
                className="mt-2 text-sm italic text-muted-foreground border-t border-border/40 pt-2"
              >
                {seg.content}
              </p>
            );
          default:
            return null;
        }
      })}
    </div>
  );
});

ConversationalRenderer.displayName = "ConversationalRenderer";

export default ConversationalRenderer;
