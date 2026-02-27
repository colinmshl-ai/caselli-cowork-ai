import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { X, Mail, Share2, Clock } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const STAGE_OPTIONS = [
  { value: "lead", label: "Lead" },
  { value: "active_client", label: "Active Client" },
  { value: "under_contract", label: "Under Contract" },
  { value: "due_diligence", label: "Due Diligence" },
  { value: "clear_to_close", label: "Clear to Close" },
  { value: "closed", label: "Closed" },
  { value: "fell_through", label: "Fell Through" },
];

interface DealSlideOverProps {
  open: boolean;
  deal: any | null;
  onClose: () => void;
  onSaved: () => void;
  onDelete: (id: string) => void;
}

const inputClass =
  "w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-foreground";

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const dateValue = value ? new Date(value + "T00:00:00") : undefined;
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className={cn(inputClass, "text-left", !value && "text-muted-foreground")}>
            {dateValue ? format(dateValue, "MMM d, yyyy") : "Select date"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={dateValue} onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : "")} initialFocus className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>
    </div>
  );
}

const DealSlideOver = ({ open, deal, onClose, onSaved, onDelete }: DealSlideOverProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [addressError, setAddressError] = useState(false);

  const [propertyAddress, setPropertyAddress] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [dealType, setDealType] = useState("buyer");
  const [stage, setStage] = useState("lead");
  const [listPrice, setListPrice] = useState("");
  const [contractPrice, setContractPrice] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [inspectionDeadline, setInspectionDeadline] = useState("");
  const [financingDeadline, setFinancingDeadline] = useState("");
  const [appraisalDeadline, setAppraisalDeadline] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch activity for this deal
  const { data: activities = [] } = useQuery({
    queryKey: ["deal-activity", deal?.id],
    queryFn: async () => {
      if (!deal?.id || !user) return [];
      const { data, error } = await supabase
        .from("task_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) return [];
      // Filter by deal_id in metadata client-side
      return (data || []).filter((t: any) => t.metadata?.deal_id === deal.id);
    },
    enabled: !!deal?.id && !!user && open,
  });

  useEffect(() => {
    if (deal) {
      setPropertyAddress(deal.property_address || "");
      setClientName(deal.client_name || "");
      setClientEmail(deal.client_email || "");
      setClientPhone(deal.client_phone || "");
      setDealType(deal.deal_type || "buyer");
      setStage(deal.stage || "lead");
      setListPrice(deal.list_price?.toString() || "");
      setContractPrice(deal.contract_price?.toString() || "");
      setClosingDate(deal.closing_date || "");
      setInspectionDeadline(deal.inspection_deadline || "");
      setFinancingDeadline(deal.financing_deadline || "");
      setAppraisalDeadline(deal.appraisal_deadline || "");
      setNotes(deal.notes || "");
    } else {
      setPropertyAddress(""); setClientName(""); setClientEmail(""); setClientPhone("");
      setDealType("buyer"); setStage("lead"); setListPrice(""); setContractPrice("");
      setClosingDate(""); setInspectionDeadline(""); setFinancingDeadline("");
      setAppraisalDeadline(""); setNotes("");
    }
    setAddressError(false);
  }, [deal, open]);

  const handleSave = async () => {
    if (!user) return;
    if (!propertyAddress.trim()) {
      setAddressError(true);
      toast.error("Property address is required");
      return;
    }

    setSaving(true);
    const payload = {
      user_id: user.id,
      property_address: propertyAddress.trim(),
      client_name: clientName.trim() || null,
      client_email: clientEmail.trim() || null,
      client_phone: clientPhone.trim() || null,
      deal_type: dealType,
      stage,
      list_price: listPrice ? parseFloat(listPrice) : null,
      contract_price: contractPrice ? parseFloat(contractPrice) : null,
      closing_date: closingDate || null,
      inspection_deadline: inspectionDeadline || null,
      financing_deadline: financingDeadline || null,
      appraisal_deadline: appraisalDeadline || null,
      notes: notes.trim() || null,
    };

    let error;
    if (deal) {
      ({ error } = await supabase.from("deals").update(payload).eq("id", deal.id));
    } else {
      ({ error } = await supabase.from("deals").insert(payload));
    }

    if (error) {
      toast.error("Failed to save deal");
    } else {
      toast.success(deal ? "Deal updated" : "Deal created");
      onSaved();
    }
    setSaving(false);
  };

  const quickAction = (prompt: string) => {
    navigate(`/chat?prompt=${encodeURIComponent(prompt)}`);
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={cn("fixed inset-0 z-40 bg-foreground/10 transition-opacity duration-200", open ? "opacity-100" : "opacity-0 pointer-events-none")}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 bottom-0 z-50 w-full md:max-w-[480px] overflow-y-auto bg-background border-l border-border transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex justify-center pt-2 md:hidden">
          <div className="h-1 w-8 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">{deal ? "Edit Deal" : "New Deal"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Quick actions when editing */}
        {deal && (
          <div className="flex gap-2 px-5 py-3 border-b border-border">
            <button
              onClick={() => quickAction(`Draft a follow-up email to ${deal.client_name || "my client"} about the property at ${deal.property_address}`)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              <Mail size={12} /> Draft email
            </button>
            <button
              onClick={() => quickAction(`Create a social media post for the listing at ${deal.property_address}`)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              <Share2 size={12} /> Social post
            </button>
          </div>
        )}

        <div className="space-y-4 px-5 py-5">
          {/* Address with validation */}
          <div>
            <input
              type="text"
              placeholder="Property address *"
              value={propertyAddress}
              onChange={(e) => { setPropertyAddress(e.target.value); if (e.target.value.trim()) setAddressError(false); }}
              onBlur={() => { if (!propertyAddress.trim()) setAddressError(true); }}
              className={cn(inputClass, addressError && "border-destructive")}
            />
            {addressError && <p className="text-xs text-destructive mt-1">Property address is required</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input type="text" placeholder="Client name" value={clientName} onChange={(e) => setClientName(e.target.value)} className={inputClass} />
            <input type="email" placeholder="Client email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className={inputClass} />
          </div>

          <input type="tel" placeholder="Client phone" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className={inputClass} />

          {/* Deal type toggle */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Deal type</label>
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(["buyer", "seller"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDealType(t)}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    dealType === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Stage */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Stage</label>
            <select value={stage} onChange={(e) => setStage(e.target.value)} className={inputClass}>
              {STAGE_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">List price</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">$</span>
                <input type="number" placeholder="0" value={listPrice} onChange={(e) => setListPrice(e.target.value)} className={cn(inputClass, "pl-7")} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Contract price</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">$</span>
                <input type="number" placeholder="0" value={contractPrice} onChange={(e) => setContractPrice(e.target.value)} className={cn(inputClass, "pl-7")} />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <DateField label="Closing date" value={closingDate} onChange={setClosingDate} />
            <DateField label="Inspection deadline" value={inspectionDeadline} onChange={setInspectionDeadline} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <DateField label="Financing deadline" value={financingDeadline} onChange={setFinancingDeadline} />
            <DateField label="Appraisal deadline" value={appraisalDeadline} onChange={setAppraisalDeadline} />
          </div>

          {/* Notes */}
          <textarea placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className={cn(inputClass, "resize-none")} />

          {/* Actions */}
          <div className="flex items-center gap-4 pt-2">
            <button onClick={handleSave} disabled={saving} className="flex-1 rounded-lg bg-primary min-h-[44px] py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={onClose} className="min-h-[44px] px-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
          </div>

          {/* Delete */}
          {deal && (
            <div className="pt-4 border-t border-border">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="text-sm text-destructive hover:opacity-70 transition-opacity">Delete this deal</button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete deal?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete "{deal.property_address}". This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(deal.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {/* Activity timeline */}
          {deal && activities.length > 0 && (
            <div className="pt-4 border-t border-border">
              <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <Clock size={12} /> Activity
              </h3>
              <div className="space-y-2">
                {activities.map((a: any) => (
                  <div key={a.id} className="flex gap-2 text-xs">
                    <span className="text-muted-foreground whitespace-nowrap">
                      {new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <span className="text-foreground">{a.description || a.task_type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DealSlideOver;
