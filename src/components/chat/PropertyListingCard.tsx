import { Home, BedDouble, Bath, Ruler, Calendar, ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface PropertyListingCardProps {
  address: string;
  price?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  yearBuilt?: number;
  propertyType?: string;
  photos?: string[];
  onAction?: (message: string) => void;
}

const PropertyListingCard = ({
  address,
  price,
  bedrooms,
  bathrooms,
  squareFootage,
  yearBuilt,
  propertyType,
  photos,
  onAction,
}: PropertyListingCardProps) => {
  const hasPhotos = photos && photos.length > 0;
  const heroPhoto = hasPhotos ? photos[0] : null;
  const extraCount = hasPhotos ? photos.length - 1 : 0;

  const stats = [
    bedrooms != null && { icon: BedDouble, value: bedrooms, label: "bed" },
    bathrooms != null && { icon: Bath, value: bathrooms, label: "bath" },
    squareFootage != null && { icon: Ruler, value: squareFootage.toLocaleString(), label: "sqft" },
    yearBuilt != null && { icon: Calendar, value: yearBuilt, label: "built" },
  ].filter(Boolean) as { icon: typeof Home; value: string | number; label: string }[];

  return (
    <div className="rounded-xl border border-border bg-card border-l-4 border-l-blue-500 overflow-hidden animate-fade-in-up">
      {/* Hero Image */}
      <div className="relative">
        <AspectRatio ratio={16 / 9}>
          {heroPhoto ? (
            <img
              src={heroPhoto}
              alt={address}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-primary/10 flex items-center justify-center">
              <Home size={40} className="text-muted-foreground/40" />
            </div>
          )}
        </AspectRatio>
        {extraCount > 0 && (
          <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[11px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1">
            <ImageIcon size={11} />
            +{extraCount} photos
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-3 space-y-3">
        {/* Address & Price */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground leading-tight">{address}</h3>
          {price && (
            <span className="text-sm font-bold text-primary whitespace-nowrap">{price}</span>
          )}
        </div>

        {/* Stats Row */}
        {stats.length > 0 && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {stats.map((s) => (
              <span key={s.label} className="flex items-center gap-1">
                <s.icon size={13} className="text-foreground/60" />
                <span className="font-medium text-foreground">{s.value}</span>
                <span>{s.label}</span>
              </span>
            ))}
          </div>
        )}

        {/* Property Type Badge + Attribution */}
        <div className="flex items-center justify-between">
          {propertyType && (
            <Badge variant="secondary" className="text-[11px] px-2.5 py-0.5 font-normal">
              {propertyType}
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground ml-auto">Enriched via RentCast</span>
        </div>

        {/* Action Buttons */}
        {onAction && (
          <div className="flex items-center gap-2 pt-1 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-2.5"
              onClick={() => onAction(`Draft an Instagram post for ${address}`)}
            >
              Draft Post
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-2.5"
              onClick={() => onAction(`Draft an email blast for ${address}`)}
            >
              Email Blast
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-2.5"
              onClick={() => onAction(`Write a listing description for ${address}`)}
            >
              Listing Description
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyListingCard;
