import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow, startOfWeek, endOfWeek, format } from "date-fns";
import type { ConversationContext } from "@/pages/Chat";

const DEFAULT_ACTIONS = [
  { label: "Draft social posts", message: "Help me draft social media posts for my current listings." },
  { label: "Review deadlines", message: "Review my upcoming deal deadlines and flag anything urgent." },
  { label: "Check inbox", message: "Summarize any client communications I need to respond to." },
  { label: "Prep for meeting", message: "Help me prepare talking points for my next client meeting." },
];

const DEAL_ACTIONS = [
  { label: "Check deadlines for this deal", message: "Check the upcoming deadlines for this deal and flag anything urgent." },
  { label: "Draft update email to client", message: "Draft an update email to the client on this deal." },
  { label: "Update deal stage", message: "Help me update the stage for this deal." },
];

const CONTENT_ACTIONS = [
  { label: "Draft another post", message: "Draft another social media post." },
  { label: "Try a different tone", message: "Rewrite the last draft with a different tone." },
  { label: "Draft for a different platform", message: "Adapt the last draft for a different platform." },
  { label: "Write a follow-up email", message: "Write a follow-up email related to this content." },
];

const CONTACT_ACTIONS = [
  { label: "Draft follow-up email", message: "Draft a follow-up email to this contact." },
  { label: "Check related deals", message: "Show me any deals related to this contact." },
  { label: "Update contact info", message: "Help me update this contact's information." },
];

const STAGE_COLORS: Record<string, string> = {
  lead: "bg-blue-500",
  active: "bg-green-500",
  under_contract: "bg-yellow-500",
  pending: "bg-orange-500",
  closed: "bg-muted-foreground",
  fell_through: "bg-destructive",
};

interface ActivityPanelProps {
  onQuickAction: (message: string) => void;
  conversationContext: ConversationContext;
}

const ActivityPanel = ({ onQuickAction, conversationContext }: ActivityPanelProps) => {
  const { user } = useAuth();
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const displayName = user?.user_metadata?.full_name?.split(" ")[0] || "there";
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const topic = conversationContext.topic || "general";

  const { data: deals = [] } = useQuery({
    queryKey: ["activity-deals"],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("deals").select("*").eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: taskHistory = [] } = useQuery({
    queryKey: ["activity-tasks"],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("task_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: focusedDeal } = useQuery({
    queryKey: ["focused-deal", conversationContext.lastDealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .eq("id", conversationContext.lastDealId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!conversationContext.lastDealId && topic === "deals",
  });

  const { data: focusedContact } = useQuery({
    queryKey: ["focused-contact", conversationContext.lastContactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", conversationContext.lastContactId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!conversationContext.lastContactId && topic === "contacts",
  });

  const activeDeals = deals.filter((d) => !["closed", "fell_through"].includes(d.stage)).length;
  const deadlinesThisWeek = deals.filter((d) => {
    const dates = [d.closing_date, d.inspection_deadline, d.financing_deadline, d.appraisal_deadline].filter(Boolean);
    return dates.some((dt) => {
      const date = new Date(dt);
      return date >= now && date <= sevenDaysOut;
    });
  }).length;
  const tasksThisWeek = taskHistory.filter((t) => {
    const created = new Date(t.created_at);
    return created >= weekStart && created <= weekEnd;
  }).length;
  const newLeads = deals.filter((d) => d.stage === "lead").length;

  const stats = [
    { label: "Active Deals", value: activeDeals },
    { label: "Deadlines This Week", value: deadlinesThisWeek },
    { label: "Tasks Completed", value: tasksThisWeek },
    { label: "New Leads", value: newLeads },
  ];

  const getNextDeadline = (deal: typeof focusedDeal) => {
    if (!deal) return null;
    const deadlines = [
      { label: "Inspection", date: deal.inspection_deadline },
      { label: "Financing", date: deal.financing_deadline },
      { label: "Appraisal", date: deal.appraisal_deadline },
      { label: "Closing", date: deal.closing_date },
    ].filter((d) => d.date && new Date(d.date) >= now);
    deadlines.sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
    return deadlines[0] || null;
  };

  const quickActions = topic === "deals" ? DEAL_ACTIONS : topic === "content" ? CONTENT_ACTIONS : topic === "contacts" ? CONTACT_ACTIONS : DEFAULT_ACTIONS;
  const sectionTitle = topic === "deals" ? "Deal Focus" : topic === "content" ? "Content Toolkit" : topic === "contacts" ? "Contact Focus" : "Quick Actions";

  return (
    <>
      <div className="border-b border-border px-5 py-4">
        <h1 className="text-sm font-semibold text-foreground">Activity</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-8">
        {/* Greeting – always visible */}
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {greeting}, {displayName}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(now, "EEEE, MMMM d")}
          </p>
        </div>

        {/* Context-aware middle section */}
        <div key={topic} className="space-y-8 transition-opacity duration-200 animate-in fade-in">
          {/* Stats – only in general mode */}
          {topic === "general" && (
            <div className="space-y-3">
              {stats.map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{s.label}</span>
                  <span className="text-sm font-semibold text-foreground">{s.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Deal mini card */}
          {topic === "deals" && focusedDeal && (
            <div className="border border-border rounded-md px-4 py-3 space-y-1.5">
              <p className="text-sm font-medium text-foreground">{focusedDeal.property_address}</p>
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${STAGE_COLORS[focusedDeal.stage] || "bg-muted-foreground"}`} />
                <span className="text-xs text-muted-foreground capitalize">{focusedDeal.stage.replace("_", " ")}</span>
              </div>
              {(() => {
                const next = getNextDeadline(focusedDeal);
                return next ? (
                  <p className="text-xs text-muted-foreground">
                    Next: {next.label} — {format(new Date(next.date!), "MMM d")}
                  </p>
                ) : null;
              })()}
              {focusedDeal.client_name && (
                <p className="text-xs text-muted-foreground">Client: {focusedDeal.client_name}</p>
              )}
            </div>
          )}

          {/* Contact mini card */}
          {topic === "contacts" && focusedContact && (
            <div className="border border-border rounded-md px-4 py-3 space-y-1.5">
              <p className="text-sm font-medium text-foreground">{focusedContact.full_name}</p>
              <p className="text-xs text-muted-foreground capitalize">{focusedContact.contact_type}</p>
              {focusedContact.last_contacted && (
                <p className="text-xs text-muted-foreground">
                  Last contacted: {formatDistanceToNow(new Date(focusedContact.last_contacted), { addSuffix: true })}
                </p>
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {sectionTitle}
            </h3>
            <div className="space-y-1">
              {quickActions.map((a) => (
                <button
                  key={a.label}
                  onClick={() => onQuickAction(a.message)}
                  className="block w-full text-left text-sm text-primary hover:opacity-70 transition-opacity min-h-[44px] py-2.5"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity – always visible */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Recent Activity
          </h3>
          {taskHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet</p>
          ) : (
            <div className="space-y-3">
              {taskHistory.map((t) => (
                <div key={t.id} className="flex items-start justify-between gap-2">
                  <p className="text-sm text-foreground leading-snug">{t.description || t.task_type}</p>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                    {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ActivityPanel;
