import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-12 text-center">
          <h1 className="text-2xl tracking-tight text-foreground">
            <span className="font-serif italic font-semibold">Caselli</span>{" "}
            <span className="font-sans font-light">Cowork</span>
          </h1>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <h2 className="text-lg font-medium text-foreground">Check your email</h2>
            <p className="text-sm text-muted-foreground">
              We sent a password reset link to <span className="text-foreground">{email}</span>
            </p>
            <Link to="/login" className="inline-block text-sm text-primary hover:opacity-70 transition-opacity">
              Back to login
            </Link>
          </div>
        ) : (
          <>
            <h2 className="mb-2 text-center text-lg font-medium text-foreground">Reset your password</h2>
            <p className="mb-8 text-center text-sm text-muted-foreground">
              Enter your email and we'll send you a reset link
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                inputMode="email"
                className="w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-foreground"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-primary min-h-[44px] py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send Reset Link"}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-muted-foreground">
              <Link to="/login" className="text-foreground underline underline-offset-4 hover:opacity-70">
                Back to login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
