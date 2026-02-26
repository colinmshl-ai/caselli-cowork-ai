import CopyButton from "./CopyButton";
import CardActions from "./CardActions";

interface ListingCardProps {
  address: string;
  stats: string;
  description: string;
  onAction?: (message: string) => void;
}

const ListingCard = ({ address, stats, description, onAction }: ListingCardProps) => (
  <div className="border border-border rounded-md overflow-hidden bg-background mt-3 animate-fade-in-up">
    <div className="px-4 py-3 border-b border-border">
      <div className="text-sm font-medium text-foreground">{address}</div>
      {stats && (
        <div className="text-xs text-muted-foreground mt-1">{stats}</div>
      )}
    </div>
    <div className="px-4 py-3">
      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{description}</p>
    </div>
    <div className="px-4 py-2.5 border-t border-border space-y-2">
      <div className="flex items-center justify-end">
        <CopyButton text={description} />
      </div>
      {onAction && (
        <div className="flex items-center justify-end border-t border-border pt-2 -mx-4 px-4">
          <CardActions contentType="listing" onAction={onAction} />
        </div>
      )}
    </div>
  </div>
);

export default ListingCard;
