import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { X, Mail, CalendarPlus, LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
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

const CONTACT_TYPES = [
  { value: "client", label: "Client" },
  { value: "lead", label: "Lead" },
  { value: "vendor", label: "Vendor" },
  { value: "agent", label: "Agent" },
  { value: "lender", label: "Lender" },
  { value: "other", label: "Other" },
];

const STAGE_COLORS: Record<string, string> = {
  lead: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  "under contract": "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  "due diligence": "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  "clear to close": "bg-green-500/10 text-green-700 dark:text-green-400",
  closed: "bg-muted text-muted-foreground",
  withdrawn: "bg-destructive/10 text-destructive",
};

interface ContactSlideOverProps {
  open: boolean;
  contact: any | null;
  onClose: () => void;
  onSaved: () => void;
  onDelete: (id: string) => void;
}

const inputClass =
  "w-full rounded-md border border-border bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-foreground";

const ContactSlideOver = ({ open, contact, onClose, onSaved, onDelete }: ContactSlideOverProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [contactType, setContactType] = useState("other");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (contact) {
      setFullName(contact.full_name || "");
      setEmail(contact.email || "");
      setPhone(contact.phone || "");
      setContactType(contact.contact_type || "other");
      setCompany(contact.company || "");
      setNotes(contact.notes || "");
    } else {
      setFullName(""); setEmail(""); setPhone("");
      setContactType("other"); setCompany(""); setNotes("");
    }
  }, [contact, open]);

  // Linked deals query
  const { data: linkedDeals = [] } = useQuery({
    queryKey: ["contact-deals", contact?.id, contact?.full_name, contact?.email],
    queryFn: async () => {
      if (!user || !contact) return [];
      let query = supabase
        .from("deals")
        .select("id, property_address, stage, list_price")
        .eq("user_id", user.id);

      if (contact.full_name && contact.email) {
        query = query.or(`client_name.ilike.${contact.full_name},client_email.ilike.${contact.email}`);
      } else if (contact.full_name) {
        query = query.ilike("client_name", contact.full_name);
      } else if (contact.email) {
        query = query.ilike("client_email", contact.email);
      } else {
        return [];
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!contact && open,
  });

  // Activity timeline
  const { data: activities = [] } = useQuery({
    queryKey: ["contact-activity", contact?.id],
    queryFn: async () => {
      if (!user || !contact) return [];
      const { data, error } = await supabase
        .from("task_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      // Filter client-side for metadata containing contact name/email
      return (data || []).filter((t: any) => {
        const meta = JSON.stringify(t.metadata || {}).toLowerCase();
        const desc = (t.description || "").toLowerCase();
        const name = contact.full_name?.toLowerCase() || "";
        const em = contact.email?.toLowerCase() || "";
        return (name && (meta.includes(name) || desc.includes(name))) ||
               (em && (meta.includes(em) || desc.includes(em)));
      });
    },
    enabled: !!user && !!contact && open,
  });

  const handleSave = async () => {
    if (!user) return;
    if (!fullName.trim()) { toast.error("Name is required"); return; }
    setSaving(true);

    const payload = {
      user_id: user.id,
      full_name: fullName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      contact_type: contactType,
      company: company.trim() || null,
      notes: notes.trim() || null,
    };

    let error;
    if (contact) {
      ({ error } = await supabase.from("contacts").update(payload).eq("id", contact.id));
    } else {
      ({ error } = await supabase.from("contacts").insert(payload));
    }

    if (error) { toast.error("Failed to save contact"); }
    else { toast.success(contact ? "Contact updated" : "Contact created"); onSaved(); }
    setSaving(false);
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-foreground/10 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
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
          <h2 className="text-sm font-semibold text-foreground">{contact ? "Edit Contact" : "New Contact"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={18} /></button>
        </div>

        {/* Quick actions */}
        {contact && (
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
            <button
              onClick={() => {
                onClose();
                navigate(`/chat?prompt=${encodeURIComponent(`Draft a professional email to ${contact.full_name}${contact.email ? ` (${contact.email})` : ""}`)}`);
              }}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary/50 transition-colors"
            >
              <Mail size={13} /> Draft email
            </button>
            <button
              onClick={() => toast.info("Coming soon")}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary/50 transition-colors"
            >
              <LinkIcon size={13} /> Add to deal
            </button>
            <button
              onClick={() => {
                onClose();
                navigate(`/chat?prompt=${encodeURIComponent(`Schedule a follow-up with ${contact.full_name} for next week`)}`);
              }}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary/50 transition-colors"
            >
              <CalendarPlus size={13} /> Follow-up
            </button>
          </div>
        )}

        <div className="space-y-4 px-5 py-5">
          <input type="text" placeholder="Full name *" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          <input type="tel" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
            <select value={contactType} onChange={(e) => setContactType(e.target.value)} className={inputClass}>
              {CONTACT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <input type="text" placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} className={inputClass} />
          <textarea placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className={cn(inputClass, "resize-none")} />

          <div className="flex items-center gap-4 pt-2">
            <button onClick={handleSave} disabled={saving} className="flex-1 rounded-md bg-primary min-h-[44px] py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={onClose} className="min-h-[44px] px-4 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          </div>

          {/* Linked deals */}
          {contact && linkedDeals.length > 0 && (
            <div className="pt-4 border-t border-border">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Linked Deals</h3>
              <div className="space-y-2">
                {linkedDeals.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <span className="text-sm text-foreground truncate">{d.property_address}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STAGE_COLORS[d.stage] || STAGE_COLORS.lead}`}>
                      {d.stage}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity timeline */}
          {contact && activities.length > 0 && (
            <div className="pt-4 border-t border-border">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recent Activity</h3>
              <div className="space-y-3">
                {activities.map((a: any) => (
                  <div key={a.id} className="flex gap-3">
                    <div className="mt-1.5 h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0" />
                    <div>
                      <p className="text-sm text-foreground">{a.description || a.task_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {contact && (
            <div className="pt-4 border-t border-border">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="text-sm text-destructive hover:opacity-70 transition-opacity">Delete this contact</button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete contact?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete "{contact.full_name}". This action cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(contact.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
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

export default ContactSlideOver;
