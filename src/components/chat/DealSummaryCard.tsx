import { Home, Clock, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

interface DealRow {
  address: string;
  client?: string;
  stage?: string;
  price?: string;
}

interface Deadline {
  label: string;
  date: string;
  daysUntil: number;
}

interface DealSummaryCardProps {
  intro: string;
  deals: DealRow[];
  deadlines: Deadline[];
  rawContent?: string;
}

const STAGE_COLORS: Record<string, string> = {
  lead: "bg-muted-foreground",
  active: "bg-blue-500",
  "under contract": "bg-violet-500",
  "due diligence": "bg-amber-500",
  "clear to close": "bg-emerald-500",
  closed: "bg-primary",
  "fell through": "bg-destructive",
  pending: "bg-amber-500",
};

function getStageColor(stage: string) {
  const key = stage.toLowerCase().replace(/_/g, " ");
  return STAGE_COLORS[key] || "bg-muted-foreground";
}

function formatStageLabel(stage: string) {
  return stage
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getUrgencyClass(days: number) {
  if (days <= 3) return "text-destructive";
  if (days <= 7) return "text-yellow-600 dark:text-yellow-400";
  return "text-muted-foreground";
}

const PROSE_CLASSES =
  "prose prose-sm max-w-none prose-p:my-2 prose-p:leading-relaxed prose-ul:my-2 prose-li:my-1 prose-li:leading-relaxed prose-ul:pl-4 prose-headings:my-2 prose-strong:text-foreground prose-a:text-primary text-foreground";

const DealSummaryCard = ({ intro, deals, deadlines, rawContent }: DealSummaryCardProps) => {
  const activeDealCount = deals.filter(
    (d) => d.stage && !/closed|fell.?through/i.test(d.stage)
  ).length;

  const hasStructuredData = deals.length > 0 || deadlines.length > 0;
  const showFallback = !hasStructuredData && rawContent;

  return (
    <div className="border border-border border-l-4 border-l-blue-400 rounded-xl overflow-hidden bg-card mt-3 animate-fade-in-up">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Home size={14} />
          {intro ? "Deal Summary" : "Your Pipeline"}
        </span>
      </div>

      {/* Fallback: raw content when parsing failed */}
      {showFallback && (
        <div className="px-4 py-3">
          <div className={PROSE_CLASSES}>
            <ReactMarkdown remarkPlugins={[remarkBreaks]}>{rawContent}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Deal rows */}
      {deals.length > 0 && (
        <div className="divide-y divide-border">
          {deals.map((deal, i) => (
            <div key={i} className="px-4 py-2.5 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {deal.address}
                </p>
                {deal.client && (
                  <p className="text-xs text-muted-foreground truncate">{deal.client}</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {deal.stage && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={`w-2 h-2 rounded-full ${getStageColor(deal.stage)}`} />
                    {formatStageLabel(deal.stage)}
                  </span>
                )}
                {deal.price && (
                  <span className="text-xs font-medium text-foreground">{deal.price}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deadlines */}
      {deadlines.length > 0 && (
        <div className="border-t border-border px-4 py-2.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Clock size={12} />
            Upcoming Deadlines
          </p>
          <div className="space-y-1.5">
            {deadlines.map((dl, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-foreground">{dl.label}</span>
                <span className={`font-medium flex items-center gap-1 ${getUrgencyClass(dl.daysUntil)}`}>
                  {dl.daysUntil <= 3 && <AlertTriangle size={11} />}
                  {dl.date}
                  {dl.daysUntil >= 0 && (
                    <span className="text-muted-foreground ml-1">
                      ({dl.daysUntil === 0 ? "today" : dl.daysUntil === 1 ? "tomorrow" : `${dl.daysUntil}d`})
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer — only show when we have structured deal data */}
      {deals.length > 0 && (
        <div className="px-4 py-2 border-t border-border">
          <span className="text-[11px] text-muted-foreground">
            {activeDealCount} active deal{activeDealCount !== 1 ? "s" : ""}
            {deals.length !== activeDealCount && ` · ${deals.length} total`}
          </span>
        </div>
      )}
    </div>
  );
};

export default DealSummaryCard;
