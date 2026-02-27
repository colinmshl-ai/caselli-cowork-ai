interface SuggestionChipsProps {
  lastToolUsed?: string;
  topic?: string;
  onSend: (msg: string) => void;
}

const SUGGESTION_MAP: Record<string, string[]> = {
  create_deal: [
    "Draft listing description",
    "Create social media campaign",
    "Set up deadline alerts",
  ],
  draft_social_post: [
    "Adapt for Facebook",
    "Write a matching email blast",
    "Create a LinkedIn version",
  ],
  draft_email: [
    "Draft a follow-up for next week",
    "Create a phone script version",
    "Add recipient to contacts",
  ],
  draft_listing_description: [
    "Draft a social post for this listing",
    "Write an email blast for this property",
    "Share on LinkedIn",
  ],
  add_contact: [
    "Draft intro email",
    "Create a deal for this contact",
  ],
  update_deal: [
    "Draft a status update email",
    "Check upcoming deadlines",
    "Create a social post",
  ],
  search_contacts: [
    "Draft an email to this contact",
    "Create a deal for this contact",
  ],
  get_active_deals: [
    "Update deal stages",
    "Draft status emails to all clients",
    "Review this week's deadlines",
  ],
  get_deal_details: [
    "Update this deal",
    "Draft a listing description",
    "Email the client a status update",
  ],
  check_upcoming_deadlines: [
    "Draft reminder emails for upcoming deadlines",
    "Update deal stages",
    "Show my active deals",
  ],
};

const TOPIC_FALLBACK: Record<string, string[]> = {
  deals: [
    "Update deal stages",
    "Draft status emails to all clients",
    "Review this week's deadlines",
  ],
  content: [
    "Adapt for another platform",
    "Draft a matching email",
    "Show my active deals",
  ],
  contacts: [
    "Draft intro email",
    "Show my active deals",
    "Check this week's deadlines",
  ],
};

const DEFAULT_SUGGESTIONS = [
  "Show my active deals",
  "Draft a social post",
  "Check this week's deadlines",
];

const SuggestionChips = ({ lastToolUsed, topic, onSend }: SuggestionChipsProps) => {
  const allSuggestions =
    (lastToolUsed && SUGGESTION_MAP[lastToolUsed]) ||
    (topic && TOPIC_FALLBACK[topic]) ||
    DEFAULT_SUGGESTIONS;

  const suggestions = allSuggestions.slice(0, 3);

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
