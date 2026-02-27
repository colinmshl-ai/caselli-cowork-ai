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
    <div className="border border-border rounded-md overflow-hidden bg-background mt-3 animate-fade-in-up">
      <div className="px-4 py-2.5 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          📋 {address}
        </span>
        {stats && (
          <div className="text-xs text-muted-foreground mt-1">{stats}</div>
        )}
      </div>
      <div className="px-4 py-3">
        <p className="text-sm text-foreground whitespace-pre-wrap">{description}</p>
      </div>
      <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{charCount} chars · {wordCount} words</span>
        <div className="flex items-center gap-1">
          {onAction && <CardActions contentType="listing" onAction={onAction} />}
          <CopyButton text={description} />
        </div>
      </div>
    </div>
  );
};

export default ListingCard;
