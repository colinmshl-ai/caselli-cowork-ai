import CopyButton from "./CopyButton";

interface EmailCardProps {
  to: string;
  subject: string;
  body: string;
}

const EmailCard = ({ to, subject, body }: EmailCardProps) => (
  <div className="border border-border rounded-md overflow-hidden bg-background mt-3">
    <div className="px-4 py-3 border-b border-border space-y-1.5">
      <div className="text-xs text-muted-foreground">
        To: <span className={to ? "text-foreground" : "text-muted-foreground italic"}>{to || "Recipient"}</span>
      </div>
      <div className="text-sm font-medium text-foreground">{subject}</div>
    </div>
    <div className="px-4 py-3">
      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{body}</p>
    </div>
    <div className="px-4 py-2.5 border-t border-border flex items-center justify-end">
      <CopyButton text={`To: ${to}\nSubject: ${subject}\n\n${body}`} />
    </div>
  </div>
);

export default EmailCard;
