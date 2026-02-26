import { Camera, MessageCircle, Users, Linkedin, Video, Pencil, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CopyButton from "./CopyButton";
import CardActions from "./CardActions";

interface SocialPostCardProps {
  platform: string;
  content: string;
  onAction?: (message: string) => void;
}

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  instagram: Camera,
  facebook: Users,
  twitter: MessageCircle,
  x: MessageCircle,
  linkedin: Linkedin,
  tiktok: Video,
};

const CHAR_LIMITS: Record<string, { limit: number; label: string }> = {
  instagram: { limit: 2200, label: "Instagram limit: 2,200" },
  twitter: { limit: 280, label: "Twitter limit: 280" },
  x: { limit: 280, label: "X limit: 280" },
  facebook: { limit: 500, label: "Facebook suggested: 500" },
};

const ALL_PLATFORMS = ["Instagram", "Facebook", "Twitter/X", "LinkedIn", "TikTok"];

const SocialPostCard = ({ platform, content, onAction }: SocialPostCardProps) => {
  const platformKey = platform.toLowerCase().replace("/x", "").replace("twitter", "x") === "x" ? "x" : platform.toLowerCase();
  const Icon = PLATFORM_ICONS[platformKey] || MessageCircle;
  const charInfo = CHAR_LIMITS[platformKey];
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const charCount = content.length;

  let limitColor = "text-muted-foreground";
  let limitWarning = "";
  if (charInfo) {
    const pct = charCount / charInfo.limit;
    if (pct > 1) {
      limitColor = "text-destructive";
      limitWarning = `Over by ${charCount - charInfo.limit}`;
    } else if (pct > 0.9) {
      limitColor = "text-yellow-600 dark:text-yellow-400";
      limitWarning = `${charInfo.limit - charCount} remaining`;
    }
  }

  const otherPlatforms = ALL_PLATFORMS.filter(
    (p) => p.toLowerCase() !== platform.toLowerCase()
  );

  return (
    <div className="border border-border rounded-md overflow-hidden bg-background mt-3 animate-fade-in-up">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Icon size={14} />
          {platform}
        </span>
        {charInfo && (
          <span className={`text-[10px] ${limitColor}`}>
            {limitWarning || charInfo.label}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <p className="text-sm text-foreground whitespace-pre-wrap">{content}</p>
      </div>

      {/* Stats + actions */}
      <div className="px-4 py-2.5 border-t border-border space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {charCount} chars · {wordCount} words
          </span>
          <div className="flex items-center gap-1">
            {onAction && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => onAction("Edit this post: make changes as needed")}
                >
                  <Pencil size={12} className="mr-1" />
                  Edit
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Share2 size={12} className="mr-1" />
                      Adapt
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    {otherPlatforms.map((p) => (
                      <DropdownMenuItem
                        key={p}
                        onClick={() => onAction?.(`Adapt this post for ${p}`)}
                        className="text-xs"
                      >
                        {p}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            <CopyButton text={content} />
          </div>
        </div>
        {onAction && (
          <div className="flex items-center justify-end border-t border-border pt-2 -mx-4 px-4">
            <CardActions contentType="post" onAction={onAction} />
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialPostCard;
