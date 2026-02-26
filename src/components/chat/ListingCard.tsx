import CopyButton from "./CopyButton";

interface ListingCardProps {
  address: string;
  stats: string;
  description: string;
}

const ListingCard = ({ address, stats, description }: ListingCardProps) => (
  <div className="border border-border rounded-md overflow-hidden bg-background mt-3">
    <div className="px-4 py-3 border-b border-border">
      <div className="text-sm font-medium text-foreground">{address}</div>
      {stats && (
        <div className="text-xs text-muted-foreground mt-1">{stats}</div>
      )}
    </div>
    <div className="px-4 py-3">
      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{description}</p>
    </div>
    <div className="px-4 py-2.5 border-t border-border flex items-center justify-end">
      <CopyButton text={description} />
    </div>
  </div>
);

export default ListingCard;
