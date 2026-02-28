import { useState, useEffect } from "react";
import { Home, Pencil, Smartphone, Mail, ClipboardList, User, Check, Loader2, Globe, Search } from "lucide-react";

export interface ToolCard {
  id: string;
  tool: string;
  inputSummary: string;
  status: "running" | "done";
  resultSummary?: string;
  success?: boolean;
  stepCurrent?: number;
  stepTotal?: number;
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

const DEAL_TOOLS = ["get_active_deals", "get_deal_details", "check_upcoming_deadlines", "create_deal", "update_deal"];
const CONTENT_TOOLS = ["draft_social_post", "draft_email", "draft_listing_description"];
const CONTACT_TOOLS = ["search_contacts", "add_contact", "update_contact"];

function getCategoryBorder(tool: string): string {
  if (DEAL_TOOLS.includes(tool)) return "border-l-2 border-l-emerald-500";
  if (CONTENT_TOOLS.includes(tool)) return "border-l-2 border-l-violet-500";
  if (CONTACT_TOOLS.includes(tool)) return "border-l-2 border-l-blue-500";
  return "border-l-2 border-l-gray-400";
}

const ExpandedCard = ({ card }: { card: ToolCard }) => {
  const Icon = TOOL_ICONS[card.tool] || Home;
  const isDone = card.status === "done";

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
          <span className="text-[11px] text-muted-foreground">
            {card.stepCurrent && card.stepTotal
              ? `Step ${card.stepCurrent} of ${card.stepTotal} · Working...`
              : "Working..."}
          </span>
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

const ToolProgressCard = ({ card }: { card: ToolCard }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (card.status === "done") {
      const t = setTimeout(() => setCollapsed(true), 3000);
      return () => clearTimeout(t);
    }
  }, [card.status]);

  if (collapsed) {
    if (hovered) {
      return (
        <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
          <ExpandedCard card={card} />
        </div>
      );
    }

    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-secondary/50 text-muted-foreground cursor-pointer ${getCategoryBorder(card.tool)}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Check size={10} className="text-primary" />
        {card.resultSummary || card.inputSummary}
      </span>
    );
  }

  return <ExpandedCard card={card} />;
};

export default ToolProgressCard;
