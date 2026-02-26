import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { X } from "lucide-react";
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

const CONTACT_TYPES = [
  { value: "client", label: "Client" },
  { value: "lead", label: "Lead" },
  { value: "vendor", label: "Vendor" },
  { value: "agent", label: "Agent" },
  { value: "lender", label: "Lender" },
  { value: "other", label: "Other" },
];

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
