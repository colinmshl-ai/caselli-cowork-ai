import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow, startOfWeek, endOfWeek, format } from "date-fns";

const QUICK_ACTIONS = [
  { label: "Draft social posts", message: "Help me draft social media posts for my current listings." },
  { label: "Review deadlines", message: "Review my upcoming deal deadlines and flag anything urgent." },
  { label: "Check inbox", message: "Summarize any client communications I need to respond to." },
  { label: "Prep for meeting", message: "Help me prepare talking points for my next client meeting." },
];

interface ActivityPanelProps {
  onQuickAction: (message: string) => void;
}

const ActivityPanel = ({ onQuickAction }: ActivityPanelProps) => {
  const { user } = useAuth();
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const displayName = user?.user_metadata?.full_name?.split(" ")[0] || "there";
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

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

  return (
    <>
      <div className="border-b border-border px-5 py-4">
        <h1 className="text-sm font-semibold text-foreground">Activity</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-8">
        {/* Greeting */}
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {greeting}, {displayName}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(now, "EEEE, MMMM d")}
          </p>
        </div>

        {/* Stats */}
        <div className="space-y-3">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <span className="text-sm font-semibold text-foreground">{s.value}</span>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Quick Actions
          </h3>
          <div className="space-y-1">
            {QUICK_ACTIONS.map((a) => (
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

        {/* Recent Activity */}
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
