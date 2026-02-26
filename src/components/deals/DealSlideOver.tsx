import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { X } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
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
  "w-full rounded-md border border-border bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-foreground";

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const dateValue = value ? new Date(value + "T00:00:00") : undefined;

  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              inputClass,
              "text-left",
              !value && "text-muted-foreground"
            )}
          >
            {dateValue ? format(dateValue, "MMM d, yyyy") : "Select date"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : "")}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

const DealSlideOver = ({ open, deal, onClose, onSaved, onDelete }: DealSlideOverProps) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

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
      setPropertyAddress("");
      setClientName("");
      setClientEmail("");
      setClientPhone("");
      setDealType("buyer");
      setStage("lead");
      setListPrice("");
      setContractPrice("");
      setClosingDate("");
      setInspectionDeadline("");
      setFinancingDeadline("");
      setAppraisalDeadline("");
      setNotes("");
    }
  }, [deal, open]);

  const handleSave = async () => {
    if (!user) return;
    if (!propertyAddress.trim()) {
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

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-foreground/10"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full md:max-w-[480px] overflow-y-auto bg-background border-l border-border">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">
            {deal ? "Edit Deal" : "New Deal"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <input
            type="text"
            placeholder="Property address *"
            value={propertyAddress}
            onChange={(e) => setPropertyAddress(e.target.value)}
            className={inputClass}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Client name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className={inputClass}
            />
            <input
              type="email"
              placeholder="Client email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              className={inputClass}
            />
          </div>

          <input
            type="tel"
            placeholder="Client phone"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            className={inputClass}
          />

          {/* Deal type toggle */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Deal type</label>
            <div className="flex rounded-md border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setDealType("buyer")}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  dealType === "buyer"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Buyer
              </button>
              <button
                type="button"
                onClick={() => setDealType("seller")}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  dealType === "seller"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Seller
              </button>
            </div>
          </div>

          {/* Stage */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Stage</label>
            <select value={stage} onChange={(e) => setStage(e.target.value)} className={inputClass}>
              {STAGE_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">List price</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">$</span>
                <input
                  type="number"
                  placeholder="0"
                  value={listPrice}
                  onChange={(e) => setListPrice(e.target.value)}
                  className={cn(inputClass, "pl-7")}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Contract price</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">$</span>
                <input
                  type="number"
                  placeholder="0"
                  value={contractPrice}
                  onChange={(e) => setContractPrice(e.target.value)}
                  className={cn(inputClass, "pl-7")}
                />
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
          <textarea
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className={cn(inputClass, "resize-none")}
          />

          {/* Actions */}
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-md bg-primary min-h-[44px] py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={onClose}
              className="min-h-[44px] px-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>

          {/* Delete */}
          {deal && (
            <div className="pt-4 border-t border-border">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="text-sm text-destructive hover:opacity-70 transition-opacity">
                    Delete this deal
                  </button>
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
                    <AlertDialogAction
                      onClick={() => onDelete(deal.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DealSlideOver;
