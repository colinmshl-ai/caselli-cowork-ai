import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Search } from "lucide-react";
import ContactSlideOver from "@/components/contacts/ContactSlideOver";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "client", label: "Clients" },
  { value: "lead", label: "Leads" },
  { value: "vendor", label: "Vendors" },
  { value: "agent", label: "Agents" },
  { value: "lender", label: "Lenders" },
];

const TYPE_LABELS: Record<string, string> = {
  client: "Client",
  lead: "Lead",
  vendor: "Vendor",
  agent: "Agent",
  lender: "Lender",
  other: "Other",
};

const Contacts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [slideOpen, setSlideOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const filtered = contacts.filter((c) => {
    if (filter !== "all" && c.contact_type !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.full_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact deleted");
      setSlideOpen(false);
      setEditingContact(null);
    },
    onError: () => toast.error("Failed to delete contact"),
  });

  const openNew = () => { setEditingContact(null); setSlideOpen(true); };
  const openEdit = (c: any) => { setEditingContact(c); setSlideOpen(true); };
  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["contacts"] });
    setSlideOpen(false);
    setEditingContact(null);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground md:text-2xl">Contacts</h1>
          <button onClick={openNew} className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
            Add Contact
          </button>
        </div>

        <div className="relative mt-3">
          <Search size={16} className="absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search contacts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-transparent py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-foreground"
          />
        </div>

        <div className="mt-3 flex gap-1 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f.value ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm text-muted-foreground">{search || filter !== "all" ? "No matching contacts" : "No contacts yet"}</p>
            {!search && filter === "all" && (
              <button onClick={openNew} className="mt-2 text-sm font-medium text-primary hover:opacity-70 transition-opacity">
                Add your first contact
              </button>
            )}
          </div>
        ) : (
          <div>
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => openEdit(c)}
                className="flex w-full items-center gap-4 border-b border-border px-5 py-3.5 text-left transition-colors hover:bg-secondary/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground truncate">{c.full_name}</span>
                    {c.company && <span className="text-sm text-muted-foreground truncate hidden sm:inline">{c.company}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {c.email && <span className="text-xs text-muted-foreground truncate">{c.email}</span>}
                    {c.phone && <span className="text-xs text-muted-foreground hidden sm:inline">{c.phone}</span>}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                  {TYPE_LABELS[c.contact_type] || c.contact_type}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <ContactSlideOver
        open={slideOpen}
        contact={editingContact}
        onClose={() => { setSlideOpen(false); setEditingContact(null); }}
        onSaved={handleSaved}
        onDelete={(id) => deleteMutation.mutate(id)}
      />
    </div>
  );
};

export default Contacts;
