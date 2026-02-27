import { useState } from "react";
import { ExternalLink, ChevronDown } from "lucide-react";

export interface Source {
  title: string;
  url: string;
  domain: string;
}

interface SourcesCardProps {
  sources: Source[];
}

const SourcesCard = ({ sources }: SourcesCardProps) => {
  const [expanded, setExpanded] = useState(false);

  if (!sources || sources.length === 0) return null;

  const visible = expanded ? sources : sources.slice(0, 5);
  const hasMore = sources.length > 5 && !expanded;

  return (
    <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3 space-y-1.5 animate-fade-in">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
        Sources
      </p>
      {visible.map((source, i) => (
        <a
          key={`${source.url}-${i}`}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 hover:bg-secondary/50 transition-colors group"
        >
          <img
            src={`https://www.google.com/s2/favicons?domain=${source.domain}&sz=16`}
            alt=""
            width={14}
            height={14}
            className="shrink-0 rounded-sm"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground truncate group-hover:text-primary transition-colors leading-snug">
              {source.title}
            </p>
            <p className="text-[11px] text-muted-foreground truncate leading-snug">
              {source.domain}
            </p>
          </div>
          <ExternalLink size={12} className="shrink-0 text-muted-foreground/50 group-hover:text-primary transition-colors" />
        </a>
      ))}
      {hasMore && (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown size={12} />
          Show {sources.length - 5} more
        </button>
      )}
    </div>
  );
};

export default SourcesCard;
