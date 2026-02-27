import CopyButton from "./CopyButton";
import CardActions from "./CardActions";

interface ListingCardProps {
  address: string;
  stats: string;
  description: string;
  onAction?: (message: string) => void;
  contentType?: "drafted" | "informational";
}

const ListingCard = ({ address, stats, description, onAction, contentType }: ListingCardProps) => {
  const wordCount = description.trim().split(/\s+/).filter(Boolean).length;
  const charCount = description.length;

  return (
    <div className="border border-border border-l-4 border-l-emerald-400 rounded-xl overflow-hidden bg-card mt-3 animate-fade-in-up">
      <div className="px-4 py-3 border-b border-border">
        <div className="text-sm font-medium text-foreground">{address}</div>
        {stats && (
          <div className="text-xs text-muted-foreground mt-1">{stats}</div>
        )}
      </div>
      <div className="px-4 py-3">
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{description}</p>
      </div>
      {contentType === "drafted" && (
        <div className="px-4 py-2 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            {charCount} chars · {wordCount} words
          </span>
          <div className="flex items-center gap-1">
            {onAction && <CardActions contentType="listing" onAction={onAction} />}
            <CopyButton text={description} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ListingCard;
