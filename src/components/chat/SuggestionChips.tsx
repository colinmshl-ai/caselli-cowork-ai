export interface ChipContext {
  activeDealsCount?: number;
  upcomingDeadlines?: number;
  lastDealStage?: string;
  lastContactType?: string;
}

interface SuggestionChipsProps {
  lastToolUsed?: string;
  topic?: string;
  contextData?: ChipContext;
  onSend: (msg: string) => void;
}

function getContextualSuggestions(
  lastToolUsed: string | undefined,
  topic: string | undefined,
  ctx: ChipContext
): string[] {
  if (lastToolUsed === "create_deal") {
    const chips = ["Draft marketing materials", "Set up deadlines"];
    if ((ctx.activeDealsCount ?? 0) > 1) chips.push("Check my full pipeline");
    else chips.push("Draft a social post for this listing");
    return chips;
  }

  if (lastToolUsed === "update_deal") {
    const stage = (ctx.lastDealStage || "").toLowerCase().replace(/_/g, " ");
    if (stage === "under contract" || stage === "under_contract") {
      return ["Set inspection deadline", "Draft congrats email to seller", "Add buyer to contacts"];
    }
    if (stage === "closed") {
      return ["Draft 'just sold' post", "Send closing thank-you email", "Check my full pipeline"];
    }
    if (stage === "fell through" || stage === "fell_through") {
      return ["Draft follow-up email to client", "Archive and move on", "Show my active deals"];
    }
    return ["Draft a status update email", "Check upcoming deadlines", "Create a social post"];
  }

  if (lastToolUsed === "draft_social_post") {
    return ["Adapt for Facebook", "Write a matching email blast", "Create a LinkedIn version"];
  }

  if (lastToolUsed === "draft_email") {
    return ["Draft a follow-up for next week", "Create a phone script version", "Add recipient to contacts"];
  }

  if (lastToolUsed === "draft_listing_description") {
    return ["Draft a social post for this listing", "Write an email blast for this property", "Share on LinkedIn"];
  }

  if (lastToolUsed === "add_contact") {
    const type = ctx.lastContactType?.toLowerCase();
    if (type === "lead") return ["Draft intro email", "Create a deal for this lead", "Schedule a follow-up"];
    if (type === "vendor") return ["Draft intro email", "Add vendor notes", "Show my contacts"];
    return ["Draft intro email", "Create a deal for this contact", "Check my pipeline"];
  }

  if (lastToolUsed === "search_contacts") {
    return ["Draft an email to this contact", "Create a deal for this contact", "Update contact info"];
  }

  if (lastToolUsed === "get_active_deals") {
    const chips = ["Update deal stages", "Draft status emails to all clients"];
    if ((ctx.upcomingDeadlines ?? 0) > 0) {
      chips.push(`Review ${ctx.upcomingDeadlines} upcoming deadline${ctx.upcomingDeadlines !== 1 ? "s" : ""}`);
    } else {
      chips.push("Review this week's deadlines");
    }
    return chips;
  }

  if (lastToolUsed === "get_deal_details") {
    return ["Update this deal", "Draft a listing description", "Email the client a status update"];
  }

  if (lastToolUsed === "check_upcoming_deadlines") {
    return ["Draft reminder emails for upcoming deadlines", "Update deal stages", "Show my active deals"];
  }

  // Topic fallbacks
  if (topic === "deals") {
    return ["Update deal stages", "Draft status emails to all clients", "Review this week's deadlines"];
  }
  if (topic === "content") {
    return ["Adapt for another platform", "Draft a matching email", "Show my active deals"];
  }
  if (topic === "contacts") {
    return ["Draft intro email", "Show my active deals", "Check this week's deadlines"];
  }

  return ["Show my active deals", "Draft a social post", "Check this week's deadlines"];
}

const SuggestionChips = ({ lastToolUsed, topic, contextData, onSend }: SuggestionChipsProps) => {
  const suggestions = getContextualSuggestions(lastToolUsed, topic, contextData || {}).slice(0, 3);

  return (
    <div className="flex flex-wrap gap-2 px-4 py-2">
      {suggestions.map((text, i) => (
        <button
          key={text}
          onClick={() => onSend(text)}
          className="rounded-lg bg-secondary/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary hover:scale-[1.02] transition-all duration-150 animate-fade-in"
          style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
        >
          {text}
        </button>
      ))}
    </div>
  );
};

export default SuggestionChips;
