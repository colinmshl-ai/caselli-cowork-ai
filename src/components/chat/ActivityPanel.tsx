import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow, format } from "date-fns";
import { Home, FileText, UserPlus, RefreshCw, Clock, Activity, Search, Mail, ChevronRight } from "lucide-react";
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

const TASK_TYPE_ICONS: Record<string, React.ElementType> = {
  deal_create: Home,
  deal_update: RefreshCw,
  content_drafted: FileText,
  contact_updated: UserPlus,
  contact_added: UserPlus,
  deadline_check: Clock,
  search: Search,
  email_drafted: Mail,
};

interface ActivityPanelProps {
  onQuickAction: (message: string) => void;
  conversationContext: ConversationContext;
  isFloating?: boolean;
}

const ActivityPanel = ({ onQuickAction, conversationContext, isFloating }: ActivityPanelProps) => {
  const { user } = useAuth();
  const now = new Date();
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
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
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
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const { data: recentLeadContacts = [] } = useQuery({
    queryKey: ["activity-lead-contacts"],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("contacts")
        .select("id")
        .eq("user_id", user.id)
        .eq("contact_type", "lead")
        .gte("created_at", sevenDaysAgo);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 60000,
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

  const activeDealsList = deals.filter((d) => !["closed", "fell_through"].includes(d.stage));
  const activeDeals = activeDealsList.length;
  const upcomingDeadlines = deals.flatMap((d) => {
    return [
      { label: "Inspection", date: d.inspection_deadline, address: d.property_address },
      { label: "Financing", date: d.financing_deadline, address: d.property_address },
      { label: "Appraisal", date: d.appraisal_deadline, address: d.property_address },
      { label: "Closing", date: d.closing_date, address: d.property_address },
    ].filter((dl) => {
      if (!dl.date) return false;
      const date = new Date(dl.date);
      return date >= now && date <= sevenDaysOut;
    });
  });
  const deadlinesThisWeek = upcomingDeadlines.length;

  const threeDaysOut = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const urgentDeadlines = upcomingDeadlines.filter((dl) => new Date(dl.date!) <= threeDaysOut).length;
  const dealsNeedingFollowUp = activeDealsList.filter((d) => {
    const updated = new Date(d.updated_at);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return updated < sevenDaysAgo;
  }).length;
  const actionItems = urgentDeadlines + dealsNeedingFollowUp;
  const newLeads = recentLeadContacts.length;

  const stats = [
    { label: "Active Deals", value: activeDeals },
    { label: "Deadlines", value: deadlinesThisWeek },
    { label: "Action Items", value: actionItems },
    { label: "New Leads", value: newLeads },
  ];

  const generateBriefingSummary = () => {
    if (activeDeals === 0) return null;
    const parts: string[] = [];
    const topDeal = activeDealsList[0];
    if (topDeal) {
      const price = topDeal.contract_price || topDeal.list_price;
      const priceStr = price ? ` at $${(price / 1000).toFixed(0)}k` : "";
      const stageStr = topDeal.stage.replace("_", " ");
      parts.push(`Your ${topDeal.property_address.split(",")[0]} deal is ${stageStr}${priceStr}.`);
    }
    if (deadlinesThisWeek === 0) {
      parts.push("No deadlines this week.");
    } else {
      const next = upcomingDeadlines.sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())[0];
      parts.push(`Next deadline: ${next.label} for ${next.address.split(",")[0]} on ${format(new Date(next.date!), "MMM d")}.`);
    }
    if (dealsNeedingFollowUp > 0) {
      parts.push(`${dealsNeedingFollowUp} deal${dealsNeedingFollowUp > 1 ? "s" : ""} need${dealsNeedingFollowUp === 1 ? "s" : ""} follow-up.`);
    }
    return parts.join(" ");
  };

  const briefingSummary = generateBriefingSummary();
  const hasNoData = activeDeals === 0 && newLeads === 0;

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
    <div className="px-4 py-4 space-y-4">
      {/* Greeting */}
      <div>
        <h2 className="text-base font-semibold text-foreground">
          {greeting}, {displayName}
        </h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {format(now, "EEEE, MMMM d")}
        </p>
      </div>

      <div key={topic} className="transition-opacity duration-200 animate-in fade-in space-y-4">
        {topic === "general" && (
          hasNoData ? (
            <div className="rounded-xl border border-border bg-card p-4 text-center space-y-2">
              <Home size={24} className="mx-auto text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Welcome to Caselli!</p>
              <p className="text-[11px] text-muted-foreground">Get started by adding your first deal or contact.</p>
              <div className="space-y-0.5 pt-1">
                {[
                  { label: "Add your first deal", message: "Help me add a new deal to my pipeline." },
                  { label: "Import contacts", message: "Help me add my key contacts." },
                ].map((a) => (
                  <button
                    key={a.label}
                    onClick={() => onQuickAction(a.message)}
                    className="flex w-full items-center justify-between text-left text-sm text-foreground bg-transparent hover:bg-secondary/50 rounded-lg min-h-[40px] px-3 py-2 transition-all duration-200"
                  >
                    <span>{a.label}</span>
                    <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2">
                {stats.map((s) => (
                  <div key={s.label} className="rounded-xl border border-border bg-card p-3">
                    <span className="text-lg font-semibold text-foreground">{s.value}</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              {briefingSummary && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {briefingSummary}
                </p>
              )}
            </>
          )
        )}

        {topic === "deals" && focusedDeal && (
          <div className="rounded-xl border border-border bg-card p-3.5 space-y-1.5">
            <p className="text-sm font-medium text-foreground">{focusedDeal.property_address}</p>
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${STAGE_COLORS[focusedDeal.stage] || "bg-muted-foreground"}`} />
              <span className="text-[11px] text-muted-foreground capitalize">{focusedDeal.stage.replace("_", " ")}</span>
            </div>
            {(() => {
              const next = getNextDeadline(focusedDeal);
              return next ? (
                <p className="text-[11px] text-muted-foreground">
                  Next: {next.label} — {format(new Date(next.date!), "MMM d")}
                </p>
              ) : null;
            })()}
            {focusedDeal.client_name && (
              <p className="text-[11px] text-muted-foreground">Client: {focusedDeal.client_name}</p>
            )}
          </div>
        )}

        {topic === "contacts" && focusedContact && (
          <div className="rounded-xl border border-border bg-card p-3.5 space-y-1.5">
            <p className="text-sm font-medium text-foreground">{focusedContact.full_name}</p>
            <p className="text-[11px] text-muted-foreground capitalize">{focusedContact.contact_type}</p>
            {focusedContact.last_contacted && (
              <p className="text-[11px] text-muted-foreground">
                Last contacted: {formatDistanceToNow(new Date(focusedContact.last_contacted), { addSuffix: true })}
              </p>
            )}
          </div>
        )}

        {/* Quick actions */}
        <div>
          <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
            {sectionTitle}
          </h3>
          <div className="space-y-0.5">
            {quickActions.map((a) => (
              <button
                key={a.label}
                onClick={() => onQuickAction(a.message)}
                className="flex w-full items-center justify-between text-left text-sm text-foreground bg-transparent hover:bg-secondary/50 rounded-lg min-h-[40px] px-3 py-2 transition-all duration-200"
              >
                <span>{a.label}</span>
                <ChevronRight size={14} className="text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Recent Activity
        </h3>
        {taskHistory.length === 0 ? (
          <div className="flex flex-col items-center py-6">
            <Activity size={20} className="text-muted-foreground mb-1.5" />
            <p className="text-[11px] text-muted-foreground">No activity yet</p>
          </div>
        ) : (
          <div className="relative ml-[3px]">
            <div className="absolute left-0 top-1 bottom-1 w-px bg-border" />
            <div className="space-y-0">
              {taskHistory.map((t) => (
                <div key={t.id} className="flex items-start gap-3 py-1.5 relative">
                  <div className="relative z-10 mt-1.5 h-1.5 w-1.5 rounded-full bg-border shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground leading-snug truncate">{t.description || t.task_type}</p>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityPanel;
