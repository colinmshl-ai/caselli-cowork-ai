import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const SPECIALTIES_OPTIONS = [
  "Residential",
  "Commercial",
  "Luxury",
  "New Construction",
  "Investment",
  "Land",
  "Condos",
  "Foreclosures",
  "Relocation",
  "First-Time Buyers",
];

const TONE_OPTIONS = [
  { value: "professional", label: "Professional & Polished" },
  { value: "friendly", label: "Friendly & Approachable" },
  { value: "luxury", label: "Luxury & Elevated" },
  { value: "casual", label: "Casual & Personable" },
  { value: "authoritative", label: "Authoritative" },
];

const PLAN_LABELS: Record<string, string> = {
  solo: "Solo Agent",
  top_producer: "Top Producer",
  team: "Team",
};

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Profile
  const [fullName, setFullName] = useState("");
  // Business
  const [biz, setBiz] = useState({
    business_name: "",
    brokerage_name: "",
    market_area: "",
    team_size: "",
    specialties: [] as string[],
  });
  // Brand
  const [brandTone, setBrandTone] = useState("professional");
  const [brandNotes, setBrandNotes] = useState("");
  // Vendors
  const [vendors, setVendors] = useState({
    preferred_title_company: "",
    preferred_inspector: "",
    preferred_photographer: "",
    preferred_lender: "",
  });
  // Billing
  const [planTier, setPlanTier] = useState("solo");
  const [subStatus, setSubStatus] = useState("trial");
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);

  const [saving, setSaving] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("business_profiles").select("*").eq("user_id", user.id).single(),
    ]).then(([profileRes, bizRes]) => {
      if (profileRes.data) {
        setFullName(profileRes.data.full_name || "");
        setPlanTier(profileRes.data.plan_tier || "solo");
        setSubStatus(profileRes.data.subscription_status || "trial");
        setTrialEndsAt(profileRes.data.trial_ends_at);
      }
      if (bizRes.data) {
        setBiz({
          business_name: bizRes.data.business_name || "",
          brokerage_name: bizRes.data.brokerage_name || "",
          market_area: bizRes.data.market_area || "",
          team_size: bizRes.data.team_size || "",
          specialties: bizRes.data.specialties || [],
        });
        setBrandTone(bizRes.data.brand_tone || "professional");
        setBrandNotes(bizRes.data.brand_voice_notes || "");
        setVendors({
          preferred_title_company: bizRes.data.preferred_title_company || "",
          preferred_inspector: bizRes.data.preferred_inspector || "",
          preferred_photographer: bizRes.data.preferred_photographer || "",
          preferred_lender: bizRes.data.preferred_lender || "",
        });
      }
      setDataLoading(false);
    });
  }, [user]);

  const save = async (section: string, fn: () => Promise<{ error: any }> | PromiseLike<{ error: any }>) => {
    setSaving(section);
    const { error } = await fn();
    setSaving(null);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: `${section} updated successfully.` });
    }
  };

  const daysRemaining = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const statusLabel =
    subStatus === "trial" && daysRemaining !== null
      ? `Trial — ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining`
      : subStatus === "active"
      ? "Active"
      : subStatus === "cancelled"
      ? "Cancelled"
      : subStatus;

  if (!user) return null;

  if (dataLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-border px-5 py-4">
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="px-5 py-8 max-w-2xl space-y-12">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-5 w-28" />
              <div className="space-y-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-5 py-4">
        <h1 className="text-sm font-semibold text-foreground">Settings</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-8 max-w-2xl">
        {/* Profile */}
        <Section title="Profile">
          <Field label="Full Name" value={fullName} onChange={setFullName} />
          <Field label="Email" value={user.email || ""} disabled />
          <SaveBtn
            loading={saving === "Profile"}
            onClick={() =>
              save("Profile", () =>
                supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id)
              )
            }
          />
        </Section>

        {/* Business Info */}
        <Section title="Business Info">
          <Field label="Business Name" value={biz.business_name} onChange={(v) => setBiz({ ...biz, business_name: v })} />
          <Field label="Brokerage" value={biz.brokerage_name} onChange={(v) => setBiz({ ...biz, brokerage_name: v })} />
          <Field label="Market Area" value={biz.market_area} onChange={(v) => setBiz({ ...biz, market_area: v })} />
          <Field label="Team Size" value={biz.team_size} onChange={(v) => setBiz({ ...biz, team_size: v })} />
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Specialties</label>
            <div className="flex flex-wrap gap-3">
              {SPECIALTIES_OPTIONS.map((s) => (
                <label key={s} className="flex items-center gap-1.5 min-h-[44px] text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={biz.specialties.includes(s)}
                    onChange={(e) => {
                      setBiz({
                        ...biz,
                        specialties: e.target.checked
                          ? [...biz.specialties, s]
                          : biz.specialties.filter((x) => x !== s),
                      });
                    }}
                    className="rounded border-border"
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>
          <SaveBtn
            loading={saving === "Business Info"}
            onClick={() =>
              save("Business Info", () =>
                supabase
                  .from("business_profiles")
                  .update({
                    business_name: biz.business_name,
                    brokerage_name: biz.brokerage_name,
                    market_area: biz.market_area,
                    team_size: biz.team_size,
                    specialties: biz.specialties,
                  })
                  .eq("user_id", user.id)
              )
            }
          />
        </Section>

        {/* Brand Voice */}
        <Section title="Brand Voice">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Brand Tone</label>
            <div className="flex flex-wrap gap-4">
              {TONE_OPTIONS.map((t) => (
                <label key={t.value} className="flex items-center gap-1.5 min-h-[44px] text-sm text-foreground cursor-pointer">
                  <input
                    type="radio"
                    name="brand_tone"
                    value={t.value}
                    checked={brandTone === t.value}
                    onChange={() => setBrandTone(t.value)}
                    className="border-border"
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Brand Voice Notes</label>
            <textarea
              value={brandNotes}
              onChange={(e) => setBrandNotes(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none"
              placeholder="Describe your communication style, words you use, your vibe..."
            />
          </div>
          <SaveBtn
            loading={saving === "Brand Voice"}
            onClick={() =>
              save("Brand Voice", () =>
                supabase
                  .from("business_profiles")
                  .update({ brand_tone: brandTone, brand_voice_notes: brandNotes })
                  .eq("user_id", user.id)
              )
            }
          />
        </Section>

        {/* Vendors */}
        <Section title="Preferred Vendors">
          <Field label="Title Company" value={vendors.preferred_title_company} onChange={(v) => setVendors({ ...vendors, preferred_title_company: v })} />
          <Field label="Inspector" value={vendors.preferred_inspector} onChange={(v) => setVendors({ ...vendors, preferred_inspector: v })} />
          <Field label="Photographer" value={vendors.preferred_photographer} onChange={(v) => setVendors({ ...vendors, preferred_photographer: v })} />
          <Field label="Lender" value={vendors.preferred_lender} onChange={(v) => setVendors({ ...vendors, preferred_lender: v })} />
          <SaveBtn
            loading={saving === "Vendors"}
            onClick={() =>
              save("Vendors", () =>
                supabase.from("business_profiles").update(vendors).eq("user_id", user.id)
              )
            }
          />
        </Section>

        {/* Connected Tools */}
        <Section title="Connected Tools">
          {["Gmail", "Google Calendar", "HubSpot"].map((tool) => (
            <div key={tool} className="flex items-center justify-between py-2">
              <span className="text-sm text-foreground">{tool}</span>
              <span className="text-xs text-muted-foreground">Coming soon</span>
            </div>
          ))}
        </Section>

        {/* Billing */}
        <Section title="Billing">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Plan</span>
              <span className="text-sm font-medium text-foreground">{PLAN_LABELS[planTier] || planTier}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className="text-sm font-medium text-foreground">{statusLabel}</span>
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                const { data, error } = await supabase.functions.invoke("customer-portal");
                if (error) throw error;
                if (data?.url) {
                  window.location.href = data.url;
                }
              } catch (err: any) {
                toast({
                  title: "Error",
                  description: err?.message || "Could not open billing portal. You may need an active subscription first.",
                  variant: "destructive",
                });
              }
            }}
            className="mt-4 w-full md:w-auto rounded-md border border-border px-4 min-h-[44px] py-2.5 text-sm text-foreground hover:bg-secondary/50 transition-colors"
          >
            Manage Subscription
          </button>
        </Section>

        {/* Sign Out */}
        <div className="pt-8 pb-12">
          <button
            onClick={async () => {
              await supabase.auth.signOut();
            }}
            className="text-sm text-destructive hover:opacity-70 transition-opacity"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-12">
    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-5">{title}</h2>
    <div className="space-y-4">{children}</div>
  </div>
);

const Field = ({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
}) => (
  <div className="space-y-1.5">
    <label className="text-sm text-muted-foreground">{label}</label>
    <input
      type="text"
      value={value}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      disabled={disabled}
      className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50 disabled:cursor-not-allowed"
    />
  </div>
);

const SaveBtn = ({ loading, onClick }: { loading: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    disabled={loading}
    className="mt-2 w-full md:w-auto rounded-md bg-primary px-4 min-h-[44px] py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
  >
    {loading ? "Saving..." : "Save"}
  </button>
);

export default Settings;
