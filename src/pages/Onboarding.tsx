import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Mail, Calendar, Database, Check, User, Mic, Wrench, Link } from "lucide-react";

const SPECIALTIES_OPTIONS = [
  "Residential",
  "Commercial",
  "Luxury",
  "Investment",
  "First-Time Buyers",
  "Relocation",
];

const TEAM_SIZES = ["Solo", "2-5", "6-10", "10+"];

const BRAND_TONES = [
  { value: "professional", label: "Professional & Polished", example: "We're pleased to present this exceptional property at 500 Las Olas Boulevard, offering refined coastal living." },
  { value: "friendly", label: "Friendly & Approachable", example: "Exciting news! Just listed a beautiful home at 500 Las Olas — I'd love to show you around!" },
  { value: "luxury", label: "Luxury & Elevated", example: "Discover refined coastal living at 500 Las Olas Boulevard, where sophistication meets the waterfront." },
  { value: "casual", label: "Casual & Personable", example: "Hey! Just listed this amazing spot at 500 Las Olas. You've gotta see it — DM me!" },
];

const INTEGRATIONS = [
  { icon: Mail, name: "Gmail", description: "Send and receive emails through Caselli" },
  { icon: Calendar, name: "Google Calendar", description: "Sync your showings and deadlines" },
  { icon: Database, name: "HubSpot", description: "Import contacts and sync deal stages" },
];

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading } = useAuth();

  // Step 1
  const [businessName, setBusinessName] = useState("");
  const [brokerageName, setBrokerageName] = useState("");
  const [marketArea, setMarketArea] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [teamSize, setTeamSize] = useState("");

  // Step 2
  const [titleCompany, setTitleCompany] = useState("");
  const [inspector, setInspector] = useState("");
  const [photographer, setPhotographer] = useState("");
  const [lender, setLender] = useState("");

  // Step 3
  const [brandTone, setBrandTone] = useState("professional");
  const [brandVoiceNotes, setBrandVoiceNotes] = useState("");

  useEffect(() => {
    if (!loading && user) {
      if (savingRef.current) return;
      supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (savingRef.current) return;
          if (data?.onboarding_completed) {
            navigate("/chat", { replace: true });
          }
        });
    }
  }, [user, loading, navigate]);

  const toggleSpecialty = (s: string) => {
    setSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const handleFinish = async () => {
    if (!user) return;
    savingRef.current = true;
    setSaving(true);

    try {
      const { error: bpError } = await supabase.from("business_profiles").upsert({
        user_id: user.id,
        business_name: businessName || null,
        brokerage_name: brokerageName || null,
        market_area: marketArea || null,
        specialties: specialties.length > 0 ? specialties : null,
        team_size: teamSize || null,
        preferred_title_company: titleCompany || null,
        preferred_inspector: inspector || null,
        preferred_photographer: photographer || null,
        preferred_lender: lender || null,
        brand_tone: brandTone,
        brand_voice_notes: brandVoiceNotes || null,
      });

      if (bpError) {
        toast.error("Failed to save business profile: " + bpError.message);
        savingRef.current = false;
        setSaving(false);
        return;
      }

      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);

      const { error: pError } = await supabase
        .from("profiles")
        .update({
          onboarding_completed: true,
          trial_ends_at: trialEnd.toISOString(),
        })
        .eq("id", user.id);

      if (pError) {
        toast.error("Failed to update profile: " + pError.message);
        savingRef.current = false;
        setSaving(false);
        return;
      }

      queryClient.setQueryData(["profile-sub", user.id], (old: any) => ({
        ...old,
        onboarding_completed: true,
        trial_ends_at: trialEnd.toISOString(),
      }));

      navigate("/chat", { replace: true });
    } catch (err) {
      toast.error("An unexpected error occurred. Please try again.");
      savingRef.current = false;
      setSaving(false);
    }
  };

  const goNext = () => setStep((s) => s + 1);
  const goBack = () => setStep((s) => s - 1);

  const hasVendors = !!(titleCompany || inspector || photographer || lender);

  const inputClass =
    "w-full rounded-md border border-border bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-foreground";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4">
      {/* Wordmark */}
      <div className="pt-8 pb-6">
        <span className="text-base text-foreground tracking-tight">
          <span className="font-serif italic font-semibold">Caselli</span>{" "}
          <span className="font-sans font-light">Cowork</span>
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-[480px] mb-10">
        <div className="h-1 w-full rounded-full bg-secondary">
          <div
            className="h-1 rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground text-right">Step {step} of 5</p>
      </div>

      {/* Animated step wrapper */}
      <div className="w-full max-w-[480px] pb-16" key={step}>
        <div className="animate-fade-in-up">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground">Tell us about your business</h2>

              <div className="space-y-4">
                <input type="text" placeholder="Business or team name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={inputClass} />
                <input type="text" placeholder="Brokerage" value={brokerageName} onChange={(e) => setBrokerageName(e.target.value)} className={inputClass} />
                <input type="text" placeholder="Market area — city or region you primarily work" value={marketArea} onChange={(e) => setMarketArea(e.target.value)} className={inputClass} />

                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Specialties</p>
                  <p className="text-xs text-muted-foreground mb-2">Select all that apply</p>
                  <div className="flex flex-wrap gap-2">
                    {SPECIALTIES_OPTIONS.map((s) => {
                      const selected = specialties.includes(s);
                      return (
                        <button
                          key={s}
                          onClick={() => toggleSpecialty(s)}
                          className={`flex items-center gap-1.5 rounded-md border px-3 min-h-[44px] py-2.5 text-sm transition-all ${
                            selected
                              ? "border-primary bg-primary/10 text-foreground font-medium shadow-sm"
                              : "border-border text-muted-foreground hover:border-foreground"
                          }`}
                        >
                          {selected && <Check size={14} className="text-primary shrink-0" />}
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Team size</p>
                  <select value={teamSize} onChange={(e) => setTeamSize(e.target.value)} className={inputClass}>
                    <option value="">Select…</option>
                    {TEAM_SIZES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button onClick={goNext} className="w-full rounded-md bg-primary min-h-[44px] py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
                Next
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Your go-to vendors</h2>
                <p className="mt-1 text-sm text-muted-foreground">Your coworker will reference these when coordinating transactions. All fields are optional.</p>
              </div>

              <div className="space-y-4">
                <input type="text" placeholder="Preferred title company" value={titleCompany} onChange={(e) => setTitleCompany(e.target.value)} className={inputClass} />
                <input type="text" placeholder="Preferred inspector" value={inspector} onChange={(e) => setInspector(e.target.value)} className={inputClass} />
                <input type="text" placeholder="Preferred photographer" value={photographer} onChange={(e) => setPhotographer(e.target.value)} className={inputClass} />
                <input type="text" placeholder="Preferred lender" value={lender} onChange={(e) => setLender(e.target.value)} className={inputClass} />
              </div>

              <div className="flex items-center gap-4">
                <button onClick={goBack} className="min-h-[44px] text-sm text-muted-foreground hover:text-foreground transition-colors">Back</button>
                <button onClick={goNext} className="flex-1 rounded-md bg-primary min-h-[44px] py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">Next</button>
                <button onClick={goNext} className="min-h-[44px] text-sm text-muted-foreground hover:text-foreground transition-colors">Skip</button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground">Your brand voice</h2>

              <div>
                <p className="text-sm font-medium text-foreground mb-3">Tone</p>
                <div className="grid grid-cols-1 gap-2">
                  {BRAND_TONES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setBrandTone(t.value)}
                      className={`rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                        brandTone === t.value
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border text-muted-foreground hover:border-foreground"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                {/* Tone example */}
                {BRAND_TONES.map((t) =>
                  brandTone === t.value ? (
                    <p key={t.value} className="mt-3 text-xs italic text-muted-foreground animate-fade-in leading-relaxed">
                      "{t.example}"
                    </p>
                  ) : null
                )}
              </div>

              <div>
                <textarea
                  placeholder="Paste an example email or social post you've written so Caselli can match your voice"
                  value={brandVoiceNotes}
                  onChange={(e) => setBrandVoiceNotes(e.target.value)}
                  rows={5}
                  className={inputClass + " resize-none"}
                />
                <p className="mt-1.5 text-xs text-muted-foreground">This helps your coworker write content that sounds like you</p>
              </div>

              <div className="flex items-center gap-4">
                <button onClick={goBack} className="min-h-[44px] text-sm text-muted-foreground hover:text-foreground transition-colors">Back</button>
                <button onClick={goNext} className="flex-1 rounded-md bg-primary min-h-[44px] py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">Next</button>
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground">Connect your tools</h2>

              <div className="space-y-3">
                {INTEGRATIONS.map(({ icon: Icon, name, description }) => (
                  <div key={name} className="flex items-center justify-between rounded-md border border-border px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Icon size={18} className="text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{name}</p>
                        <p className="text-xs text-muted-foreground">{description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toast.info("Coming soon — we'll notify you when this is available")}
                      className="rounded-md border border-border px-3 min-h-[44px] py-2.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                    >
                      Connect
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4">
                <button onClick={goBack} className="min-h-[44px] text-sm text-muted-foreground hover:text-foreground transition-colors">Back</button>
                <button onClick={goNext} className="flex-1 rounded-md bg-primary min-h-[44px] py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">Next</button>
              </div>
            </div>
          )}

          {/* STEP 5 */}
          {step === 5 && (
            <div className="space-y-8 text-center pt-8">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">Meet your coworker</h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                  Your business profile, brand voice, and vendors are configured. Caselli is ready to help with deals, marketing, emails, and more.
                </p>
              </div>

              {/* Setup summary */}
              <div className="text-left mx-auto max-w-xs space-y-2">
                <SummaryItem icon={User} label="Business profile" done={!!(businessName || brokerageName || marketArea || specialties.length)} />
                <SummaryItem icon={Mic} label="Brand voice" done={!!brandTone} />
                <SummaryItem icon={Wrench} label="Preferred vendors" done={hasVendors} />
                <SummaryItem icon={Link} label="Integrations" done={false} subtitle="Coming soon" />
              </div>

              <button
                onClick={handleFinish}
                disabled={saving}
                className="rounded-md bg-primary px-8 min-h-[44px] py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Setting up…" : "Start Working"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function SummaryItem({ icon: Icon, label, done, subtitle }: { icon: any; label: string; done: boolean; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className={`flex items-center justify-center w-6 h-6 rounded-full ${done ? "bg-primary/10" : "bg-secondary"}`}>
        {done ? <Check size={14} className="text-primary" /> : <Icon size={14} className="text-muted-foreground" />}
      </div>
      <div>
        <p className={`text-sm ${done ? "text-foreground" : "text-muted-foreground"}`}>{label}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

export default Onboarding;
