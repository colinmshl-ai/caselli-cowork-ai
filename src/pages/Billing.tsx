import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

const PLANS = [
  {
    key: "solo",
    name: "Solo Agent",
    price: "$149",
    description: "For individual agents",
    priceId: "price_1T4t1qF9b6Nn9gJr0a0oJFQW",
    features: [
      "Full AI coworker access",
      "Deal tracking & deadlines",
      "Content generation",
      "Unlimited conversations",
    ],
    recommended: false,
  },
  {
    key: "top_producer",
    name: "Top Producer",
    price: "$299",
    description: "For high-volume producers",
    priceId: "price_1T4t1tF9b6Nn9gJrOjhiztez",
    features: [
      "Everything in Solo",
      "Unlimited deals",
      "Background automations",
      "Priority support",
    ],
    recommended: true,
  },
  {
    key: "team",
    name: "Team",
    price: "$499",
    description: "For teams up to 5",
    priceId: "price_1T4t1wF9b6Nn9gJrYd9hR7Iz",
    features: [
      "Everything in Top Producer",
      "Shared deals & contacts",
      "Team activity feed",
      "Custom workflows",
    ],
    recommended: false,
  },
];

const Billing = () => {
  const { session, loading } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["billing-profile", session?.user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", session!.user.id)
        .single();
      return data;
    },
    enabled: !!session?.user,
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const handleSelectPlan = async (priceId: string, key: string) => {
    setLoadingPlan(key);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { price_id: priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">Caselli</h1>
          <h2 className="text-3xl font-semibold text-foreground mt-8 mb-3">Choose your plan</h2>
          <p className="text-muted-foreground">14-day free trial included with every plan</p>
          <div className="mt-4 flex items-center justify-center gap-4">
            {profile?.onboarding_completed && (
              <a href="/chat" className="text-sm text-primary hover:opacity-70 transition-opacity">← Back to app</a>
            )}
            <button onClick={handleSignOut} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign out</button>
          </div>
        </div>

        {/* Plans */}
        <div className="grid gap-12 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div key={plan.key} className="flex flex-col">
              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                <span className="text-sm text-muted-foreground">/mo</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>

              <ul className="mt-6 space-y-3 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="text-primary mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectPlan(plan.priceId, plan.key)}
                disabled={loadingPlan !== null}
                className={`mt-8 w-full rounded-md py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 ${
                  plan.recommended
                    ? "bg-primary text-primary-foreground py-3"
                    : "border border-border text-foreground hover:bg-secondary/50"
                }`}
              >
                {loadingPlan === plan.key ? "Loading..." : "Start Trial"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Billing;
