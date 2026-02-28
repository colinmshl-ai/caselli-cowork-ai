import { useState, useEffect } from "react";
import { Home, Pencil, Smartphone, Mail, ClipboardList, User, Check, Loader2, Globe, Search } from "lucide-react";

export interface ToolCard {
  id: string;
  tool: string;
  inputSummary: string;
  status: "running" | "done";
  resultSummary?: string;
  success?: boolean;
}

const TOOL_ICONS: Record<string, typeof Home> = {
  get_active_deals: Home,
  get_deal_details: Home,
  check_upcoming_deadlines: Home,
  create_deal: Pencil,
  update_deal: Pencil,
  draft_social_post: Smartphone,
  draft_email: Mail,
  draft_listing_description: ClipboardList,
  search_contacts: User,
  add_contact: User,
  update_contact: User,
  web_search: Globe,
  enrich_property: Search,
};

const ToolProgressCard = ({ card }: { card: ToolCard }) => {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (card.status === "done") {
      const t = setTimeout(() => setCollapsed(true), 800);
      return () => clearTimeout(t);
    }
  }, [card.status]);

  const Icon = TOOL_ICONS[card.tool] || Home;
  const isDone = card.status === "done";

  if (collapsed) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium bg-secondary/50 text-muted-foreground">
        <Check size={10} className="text-primary" />
        {card.resultSummary || card.inputSummary}
      </span>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm px-4 py-3 space-y-1.5 animate-fade-in transition-all duration-300">
      <div className="flex items-center gap-2">
        <Icon size={14} className={isDone ? "text-primary" : "text-muted-foreground"} />
        <span className="text-sm font-medium text-foreground">{card.inputSummary}</span>
      </div>
      {!isDone ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-primary/60 rounded-full animate-pulse" style={{ width: "60%" }} />
          </div>
          <Loader2 size={10} className="text-muted-foreground animate-spin" />
          <span className="text-[11px] text-muted-foreground">Working...</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-primary">
          <Check size={12} />
          <span>{card.resultSummary || "Done"}</span>
        </div>
      )}
    </div>
  );
};

export default ToolProgressCard;
