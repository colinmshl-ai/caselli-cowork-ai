import CopyButton from "./CopyButton";

interface SocialPostCardProps {
  platform: string;
  content: string;
}

const SocialPostCard = ({ platform, content }: SocialPostCardProps) => (
  <div className="border border-border rounded-md overflow-hidden bg-background mt-3">
    <div className="px-4 py-2.5 border-b border-border">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {platform}
      </span>
    </div>
    <div className="px-4 py-3">
      <p className="text-sm text-foreground whitespace-pre-wrap">{content}</p>
    </div>
    <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{content.length} characters</span>
      <CopyButton text={content} />
    </div>
  </div>
);

export default SocialPostCard;
