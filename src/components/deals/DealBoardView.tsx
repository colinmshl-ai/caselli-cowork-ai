import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

const BOARD_STAGES = [
  { value: "lead", label: "Lead" },
  { value: "active_client", label: "Active" },
  { value: "under_contract", label: "Under Contract" },
  { value: "due_diligence", label: "Due Diligence" },
  { value: "clear_to_close", label: "Clear to Close" },
  { value: "closed", label: "Closed" },
  { value: "fell_through", label: "Fell Through" },
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

function formatPrice(val: number | null) {
  if (!val) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);
}

interface DealBoardViewProps {
  deals: any[];
  onEditDeal: (deal: any) => void;
}

const DealBoardView = ({ deals, onEditDeal }: DealBoardViewProps) => {
  const queryClient = useQueryClient();
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const moveMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase.from("deals").update({ stage }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Deal moved");
    },
    onError: () => toast.error("Failed to move deal"),
  });

  const handleDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    setDragOverStage(null);
    const dealId = e.dataTransfer.getData("text/plain");
    if (dealId) moveMutation.mutate({ id: dealId, stage });
  };

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden">
      <div className="flex gap-3 p-4 h-full min-w-max">
        {BOARD_STAGES.map((stg) => {
          const stageDeals = deals.filter((d) => d.stage === stg.value);
          const totalValue = stageDeals.reduce((sum, d) => sum + (d.contract_price || d.list_price || 0), 0);
          const colors = STAGE_COLORS[stg.value] || STAGE_COLORS.closed;

          return (
            <div
              key={stg.value}
              className={`flex flex-col w-64 shrink-0 rounded-xl border transition-colors ${
                dragOverStage === stg.value ? "border-primary bg-primary/5" : "border-border bg-secondary/30"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOverStage(stg.value); }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={(e) => handleDrop(e, stg.value)}
            >
              {/* Column header */}
              <div className="px-3 py-2.5 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                  <span className="text-xs font-semibold text-foreground">{stg.label}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{stageDeals.length}</span>
                </div>
                {totalValue > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{formatPrice(totalValue)}</p>
                )}
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {stageDeals.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center py-4">No deals</p>
                ) : (
                  stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", deal.id)}
                      onClick={() => onEditDeal(deal)}
                      className="rounded-xl border border-border bg-background p-2.5 cursor-pointer hover:border-primary/40 transition-colors"
                    >
                      <p className="text-xs font-medium text-foreground truncate">{deal.property_address}</p>
                      {deal.client_name && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{deal.client_name}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        {deal.deal_type && (
                          <span className="text-[11px] px-2.5 py-0.5 rounded-lg bg-secondary text-muted-foreground capitalize">
                            {deal.deal_type}
                          </span>
                        )}
                        {(deal.list_price || deal.contract_price) && (
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {formatPrice(deal.contract_price || deal.list_price)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DealBoardView;
