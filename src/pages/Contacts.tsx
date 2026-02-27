import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Search, Upload, Users, UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ContactSlideOver from "@/components/contacts/ContactSlideOver";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

const TYPE_COLORS: Record<string, string> = {
  client: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  lead: "bg-green-500/10 text-green-700 dark:text-green-400",
  vendor: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  agent: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  lender: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  other: "bg-muted text-muted-foreground",
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
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user.id)
        .order("full_name", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["deals"],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("deals")
        .select("id, client_name, client_email, property_address, stage")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const getDealCount = (contact: any) => {
    return deals.filter(
      (d) =>
        (d.client_name && contact.full_name && d.client_name.toLowerCase() === contact.full_name.toLowerCase()) ||
        (d.client_email && contact.email && d.client_email.toLowerCase() === contact.email.toLowerCase())
    ).length;
  };

  const filtered = contacts.filter((c) => {
    if (filter !== "all" && c.contact_type !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.full_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.notes?.toLowerCase().includes(q) ||
        c.contact_type?.toLowerCase().includes(q)
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

  const TypeBadge = ({ type }: { type: string }) => (
    <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-[11px] font-medium ${TYPE_COLORS[type] || TYPE_COLORS.other}`}>
      {TYPE_LABELS[type] || type}
    </span>
  );

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-base font-semibold text-foreground">Contacts</h1>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    disabled
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 min-h-[44px] py-2.5 text-sm font-medium text-muted-foreground opacity-60 cursor-not-allowed"
                  >
                    <Upload size={14} />
                    Import
                  </button>
                </TooltipTrigger>
                <TooltipContent>Coming soon</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <button onClick={openNew} className="rounded-lg bg-primary px-4 min-h-[44px] py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
              Add Contact
            </button>
          </div>
        </div>

        <div className="relative mt-3">
          <Search size={16} className="absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search contacts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-transparent py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-foreground"
          />
        </div>

        <div className="mt-3 flex gap-1 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`whitespace-nowrap rounded-lg px-3 min-h-[44px] text-xs font-medium transition-colors ${
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
          <div className="px-5 py-5 space-y-1">

            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b border-border">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <UserPlus size={32} className="text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">
              {search || filter !== "all" ? "No matching contacts" : "No contacts yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {search || filter !== "all" ? "Try adjusting your search or filter" : "Add your first contact to get started"}
            </p>
            {!search && filter === "all" && (
              <button onClick={openNew} className="mt-3 text-sm font-medium text-primary hover:opacity-70 transition-opacity">
                Add contact
              </button>
            )}
          </div>
        ) : (
          <div>
            {filtered.map((c) => {
              const dealCount = getDealCount(c);
              const timeAgo = c.created_at
                ? formatDistanceToNow(new Date(c.created_at), { addSuffix: true })
                : null;

              return (
                <button
                  key={c.id}
                  onClick={() => openEdit(c)}
                  className="w-full border-b border-border px-5 py-3 text-left transition-all duration-200 hover:bg-secondary/50 min-h-[44px]"
                >
                  {/* Mobile card layout */}
                  <div className="md:hidden">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{c.full_name}</span>
                      <TypeBadge type={c.contact_type} />
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      {c.email && <span className="truncate">{c.email}</span>}
                      {c.email && c.phone && <span>·</span>}
                      {c.phone && <span>{c.phone}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      {dealCount > 0 && (
                        <span className="text-[11px] text-muted-foreground">
                          {dealCount} deal{dealCount !== 1 ? "s" : ""}
                        </span>
                      )}
                      {timeAgo && (
                        <span className="text-[11px] text-muted-foreground/60">Added {timeAgo}</span>
                      )}
                    </div>
                  </div>

                  {/* Desktop row layout */}
                  <div className="hidden md:flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-foreground truncate">{c.full_name}</span>
                        {c.company && <span className="text-sm text-muted-foreground truncate">{c.company}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {c.email && <span className="text-xs text-muted-foreground truncate">{c.email}</span>}
                        {c.phone && <span className="text-xs text-muted-foreground">{c.phone}</span>}
                        {dealCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            · {dealCount} deal{dealCount !== 1 ? "s" : ""}
                          </span>
                        )}
                        {timeAgo && (
                          <span className="text-xs text-muted-foreground/60">· Added {timeAgo}</span>
                        )}
                      </div>
                    </div>
                    <TypeBadge type={c.contact_type} />
                  </div>
                </button>
              );
            })}
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
