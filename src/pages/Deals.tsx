import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import DealSlideOver from "@/components/deals/DealSlideOver";
import DealBoardView from "@/components/deals/DealBoardView";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutList, Columns3, Inbox } from "lucide-react";

const STAGES = [
  { value: "all", label: "All" },
  { value: "lead", label: "Lead" },
  { value: "active_client", label: "Active" },
  { value: "under_contract", label: "Under Contract" },
  { value: "due_diligence", label: "Due Diligence" },
  { value: "clear_to_close", label: "Clear to Close" },
  { value: "closed", label: "Closed" },
];

const STAGE_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
  lead: { dot: "bg-blue-500", bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-300" },
  active_client: { dot: "bg-green-500", bg: "bg-green-500/10", text: "text-green-700 dark:text-green-300" },
  under_contract: { dot: "bg-amber-500", bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-300" },
  due_diligence: { dot: "bg-orange-500", bg: "bg-orange-500/10", text: "text-orange-700 dark:text-orange-300" },
  clear_to_close: { dot: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300" },
  closed: { dot: "bg-muted-foreground", bg: "bg-muted/50", text: "text-muted-foreground" },
  fell_through: { dot: "bg-destructive", bg: "bg-destructive/10", text: "text-destructive" },
};

const STAGE_LABELS: Record<string, string> = {
  lead: "Lead",
  active_client: "Active",
  under_contract: "Under Contract",
  due_diligence: "Due Diligence",
  clear_to_close: "Clear to Close",
  closed: "Closed",
  fell_through: "Fell Through",
};

function formatPrice(val: number | null) {
  if (!val) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);
}

function isDeadlineSoon(deal: any): boolean {
  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dates = [deal.closing_date, deal.inspection_deadline, deal.financing_deadline, deal.appraisal_deadline].filter(Boolean);
  return dates.some((d) => {
    const date = new Date(d);
    return date >= now && date <= sevenDays;
  });
}

const Deals = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "board">("list");
  const [slideOpen, setSlideOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<any>(null);

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["deals", filter],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      let query = supabase
        .from("deals")
        .select("*")
        .eq("user_id", user.id)
        .order("closing_date", { ascending: true, nullsFirst: false });
      if (filter !== "all") query = query.eq("stage", filter);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Deal deleted");
      setSlideOpen(false);
      setEditingDeal(null);
    },
    onError: () => toast.error("Failed to delete deal"),
  });

  const openNew = () => { setEditingDeal(null); setSlideOpen(true); };
  const openEdit = (deal: any) => { setEditingDeal(deal); setSlideOpen(true); };
  const handleSaved = () => { queryClient.invalidateQueries({ queryKey: ["deals"] }); setSlideOpen(false); setEditingDeal(null); };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold text-foreground">Deals</h1>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center justify-center h-9 w-9 transition-all duration-200 ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                aria-label="List view"
              >
                <LayoutList size={16} />
              </button>
              <button
                onClick={() => setViewMode("board")}
                className={`flex items-center justify-center h-9 w-9 transition-all duration-200 ${viewMode === "board" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                aria-label="Board view"
              >
                <Columns3 size={16} />
              </button>
            </div>
            <button
              onClick={openNew}
              className="rounded-lg bg-primary px-4 min-h-[44px] py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Add Deal
            </button>
          </div>
        </div>

        {/* Filters — only in list view */}
        {viewMode === "list" && (
          <div className="mt-3 flex gap-1 overflow-x-auto">
            {STAGES.map((s) => (
              <button
                key={s.value}
                onClick={() => setFilter(s.value)}
                className={`whitespace-nowrap rounded-lg px-3 min-h-[44px] text-xs font-medium transition-colors ${
                  filter === s.value ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="px-5 py-5 space-y-1">

          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-border">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      ) : viewMode === "board" ? (
        <DealBoardView deals={deals} onEditDeal={openEdit} />
      ) : deals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Inbox size={48} className="text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No deals yet</p>
          <button onClick={openNew} className="text-sm font-medium text-primary hover:opacity-70 transition-opacity">
            Add your first deal
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {deals.map((deal) => {
            const colors = STAGE_COLORS[deal.stage] || STAGE_COLORS.closed;
            const price = formatPrice(deal.contract_price || deal.list_price);

            return (
              <button
                key={deal.id}
                onClick={() => openEdit(deal)}
                className="w-full border-b border-border px-5 py-3 text-left transition-all duration-200 hover:bg-secondary/50 min-h-[44px]"
              >
                {/* Mobile */}
                <div className="md:hidden">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{deal.property_address}</span>
                    <span className={`shrink-0 rounded-lg px-2.5 py-0.5 text-[11px] font-medium ${colors.bg} ${colors.text}`}>
                      {STAGE_LABELS[deal.stage] || deal.stage}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {deal.client_name && <span className="text-xs text-muted-foreground truncate">{deal.client_name}</span>}
                    {deal.deal_type && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground capitalize">{deal.deal_type}</span>
                    )}
                    {price && <span className="text-xs text-muted-foreground">{price}</span>}
                    {isDeadlineSoon(deal) && (
                      <span className="whitespace-nowrap rounded-lg bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                        Deadline soon
                      </span>
                    )}
                  </div>
                </div>

                {/* Desktop */}
                <div className="hidden md:flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-foreground truncate">{deal.property_address}</span>
                      {deal.client_name && <span className="text-sm text-muted-foreground truncate">{deal.client_name}</span>}
                    </div>
                  </div>
                  {deal.deal_type && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground capitalize shrink-0">{deal.deal_type}</span>
                  )}
                  {price && <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{price}</span>}
                  {isDeadlineSoon(deal) && (
                    <span className="whitespace-nowrap rounded-lg bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 shrink-0">
                      Deadline soon
                    </span>
                  )}
                  <span className={`shrink-0 rounded-lg px-2.5 py-0.5 text-[11px] font-medium ${colors.bg} ${colors.text}`}>
                    {STAGE_LABELS[deal.stage] || deal.stage}
                  </span>
                  {deal.closing_date && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(deal.closing_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <DealSlideOver
        open={slideOpen}
        deal={editingDeal}
        onClose={() => { setSlideOpen(false); setEditingDeal(null); }}
        onSaved={handleSaved}
        onDelete={(id) => deleteMutation.mutate(id)}
      />
    </div>
  );
};

export default Deals;
