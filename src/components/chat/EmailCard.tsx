import { Send, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import CopyButton from "./CopyButton";
import CardActions from "./CardActions";

interface EmailCardProps {
  to: string;
  subject: string;
  body: string;
  onAction?: (message: string) => void;
}

const EmailCard = ({ to, subject, body, onAction }: EmailCardProps) => {
  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  const charCount = body.length;

  return (
    <div className="border border-border border-l-4 border-l-blue-400 rounded-md overflow-hidden bg-card mt-3 animate-fade-in-up">
      <div className="px-4 py-3 border-b border-border space-y-1.5">
        <div className="text-xs text-muted-foreground">
          To: <span className={to ? "text-foreground" : "text-muted-foreground italic"}>{to || "Recipient"}</span>
        </div>
        <div className="text-sm font-medium text-foreground">{subject}</div>
      </div>
      <div className="px-4 py-3">
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{body}</p>
      </div>
      <div className="px-4 py-2 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {charCount} chars · {wordCount} words
        </span>
        <div className="flex items-center gap-1">
          {onAction && <CardActions contentType="email" onAction={onAction} />}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => toast.info("Coming soon — connect Gmail in Settings")}
          >
            <Send size={11} className="mr-1" />
            Send
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => toast.success("Draft saved")}
          >
            <Save size={11} className="mr-1" />
            Save draft
          </Button>
          <CopyButton text={`To: ${to}\nSubject: ${subject}\n\n${body}`} />
        </div>
      </div>
    </div>
  );
};

export default EmailCard;
