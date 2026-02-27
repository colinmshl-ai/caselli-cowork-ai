import { useState, useEffect, useRef } from "react";
import { Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UndoAction {
  type: "delete_deal" | "delete_contact" | "revert_deal";
  entity_id: string;
  previous_values?: Record<string, unknown>;
  label: string;
}

interface UndoButtonProps {
  actions: UndoAction[];
  onUndoComplete?: () => void;
}

const UNDO_WINDOW_MS = 30_000;

const UndoButton = ({ actions, onUndoComplete }: UndoButtonProps) => {
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(UNDO_WINDOW_MS / 1000));
  const [isUndoing, setIsUndoing] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - mountedAt.current;
      const remaining = Math.ceil((UNDO_WINDOW_MS - elapsed) / 1000);
      if (remaining <= 0) {
        setDismissed(true);
        clearInterval(interval);
      } else {
        setSecondsLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (dismissed || actions.length === 0) return null;

  const handleUndo = async () => {
    setIsUndoing(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      for (const action of actions) {
        const res = await fetch(`${supabaseUrl}/functions/v1/undo-action`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            type: action.type,
            entity_id: action.entity_id,
            previous_values: action.previous_values,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Undo failed");
        }
      }

      toast.success("Action undone");
      setDismissed(true);
      onUndoComplete?.();
    } catch (err) {
      console.error("Undo failed:", err);
      toast.error("Could not undo — try manually from the Deals or Contacts page");
    } finally {
      setIsUndoing(false);
    }
  };

  return (
    <button
      onClick={handleUndo}
      disabled={isUndoing}
      className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground bg-secondary/60 hover:bg-secondary transition-all duration-200 animate-fade-in disabled:opacity-50"
    >
      <Undo2 size={12} />
      {isUndoing ? "Undoing…" : `Undo (${secondsLeft}s)`}
    </button>
  );
};

export default UndoButton;
