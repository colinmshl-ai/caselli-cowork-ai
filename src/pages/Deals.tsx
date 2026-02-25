import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import DealSlideOver from "@/components/deals/DealSlideOver";

const STAGES = [
  { value: "all", label: "All" },
  { value: "lead", label: "Lead" },
  { value: "active_client", label: "Active" },
  { value: "under_contract", label: "Under Contract" },
  { value: "due_diligence", label: "Due Diligence" },
  { value: "clear_to_close", label: "Clear to Close" },
  { value: "closed", label: "Closed" },
];

const STAGE_COLORS: Record<string, string> = {
  lead: "bg-blue-500",
  active_client: "bg-green-500",
  under_contract: "bg-amber-500",
  due_diligence: "bg-orange-500",
  clear_to_close: "bg-emerald-500",
  closed: "bg-gray-400",
  fell_through: "bg-red-500",
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

function isDeadlineSoon(deal: any): boolean {
  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dates = [
    deal.closing_date,
    deal.inspection_deadline,
    deal.financing_deadline,
    deal.appraisal_deadline,
  ].filter(Boolean);
  return dates.some((d) => {
    const date = new Date(d);
    return date >= now && date <= sevenDays;
  });
}

const Deals = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [slideOpen, setSlideOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<any>(null);

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["deals", filter],
    queryFn: async () => {
      let query = supabase
        .from("deals")
        .select("*")
        .order("closing_date", { ascending: true, nullsFirst: false });

      if (filter !== "all") {
        query = query.eq("stage", filter);
      }

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

  const openNew = () => {
    setEditingDeal(null);
    setSlideOpen(true);
  };

  const openEdit = (deal: any) => {
    setEditingDeal(deal);
    setSlideOpen(true);
  };

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["deals"] });
    setSlideOpen(false);
    setEditingDeal(null);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground md:text-2xl">Deals</h1>
          <button
            onClick={openNew}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Add Deal
          </button>
        </div>

        {/* Filters */}
        <div className="mt-3 flex gap-1 overflow-x-auto">
          {STAGES.map((s) => (
            <button
              key={s.value}
              onClick={() => setFilter(s.value)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === s.value
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Deal list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : deals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm text-muted-foreground">No deals yet</p>
            <button
              onClick={openNew}
              className="mt-2 text-sm font-medium text-primary hover:opacity-70 transition-opacity"
            >
              Add your first deal
            </button>
          </div>
        ) : (
          <div>
            {deals.map((deal) => (
              <button
                key={deal.id}
                onClick={() => openEdit(deal)}
                className="flex w-full items-center gap-4 border-b border-border px-5 py-3.5 text-left transition-colors hover:bg-secondary/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground truncate">
                      {deal.property_address}
                    </span>
                    {deal.client_name && (
                      <span className="text-sm text-muted-foreground truncate hidden sm:inline">
                        {deal.client_name}
                      </span>
                    )}
                  </div>
                </div>

                {isDeadlineSoon(deal) && (
                  <span className="hidden sm:inline whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                    Deadline soon
                  </span>
                )}

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`h-2 w-2 rounded-full ${STAGE_COLORS[deal.stage] || "bg-gray-400"}`} />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {STAGE_LABELS[deal.stage] || deal.stage}
                  </span>
                </div>

                {deal.closing_date && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap hidden md:inline">
                    {new Date(deal.closing_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Slide-over */}
      <DealSlideOver
        open={slideOpen}
        deal={editingDeal}
        onClose={() => {
          setSlideOpen(false);
          setEditingDeal(null);
        }}
        onSaved={handleSaved}
        onDelete={(id) => deleteMutation.mutate(id)}
      />
    </div>
  );
};

export default Deals;
