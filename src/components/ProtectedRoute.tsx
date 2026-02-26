import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, user, loading } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile-sub", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("subscription_status, trial_ends_at, plan_tier, onboarding_completed")
        .eq("id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  if (loading || (session && profileLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Check onboarding
  if (profile && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  // Check subscription status
  if (profile) {
    const { subscription_status, trial_ends_at } = profile;

    if (subscription_status === "cancelled" || subscription_status === "past_due") {
      return <Navigate to="/billing" replace />;
    }

    if (subscription_status === "trial" && trial_ends_at) {
      const trialEnd = new Date(trial_ends_at);
      if (trialEnd < new Date()) {
        return <Navigate to="/billing" replace />;
      }
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
