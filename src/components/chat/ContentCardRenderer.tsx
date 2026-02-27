import ReactMarkdown from "react-markdown";
import SocialPostCard from "./SocialPostCard";
import EmailCard from "./EmailCard";
import ListingCard from "./ListingCard";
import DealSummaryCard from "./DealSummaryCard";
import { Separator } from "@/components/ui/separator";

type ContentTypeHint = "social_post" | "email" | "listing_description" | "conversational" | string;

interface ContentCardRendererProps {
  content: string;
  onAction?: (message: string) => void;
  contentType?: "drafted" | "informational";
  contentTypeHint?: ContentTypeHint;
}

/** Returns true if the content is clearly conversational — skip all card detection */
function detectConversational(content: string): boolean {
  const trimmed = content.trimStart();
  // Starts with question words or conversational openers
  if (/^(What|How|Would|Do you|I'd|Here's|Let me|Sure|Absolutely|Great|Of course|Happy to|I can|I'll|That's|Yes|No,)/i.test(trimmed)) {
    return true;
  }
  // Contains conversational phrases
  if (/here's what|I'd recommend|let me know|want me to|shall we|I can help|would you like/i.test(content)) {
    return true;
  }
  // Contains numbered next-steps list
  if (/\n\d+\.\s/.test(content)) {
    return true;
  }
  return false;
}

function detectEmail(content: string) {
  const hasSubject = /\*?\*?Subject:?\*?\*?\s*(.+)/i.test(content);
  const hasRecipient = /\*?\*?To:?\*?\*?\s*(.+)/i.test(content);
  // Require BOTH Subject and To lines
  return hasSubject && hasRecipient;
}

function detectDealSummary(content: string) {
  const hasPipeline = /pipeline|active deals?|deal summary/i.test(content);
  const hasStage = /\b(lead|active|under.?contract|due.?diligence|clear.?to.?close|closed|pending)\b/i.test(content);
  const hasDeadline = /deadline|closing|inspection|appraisal|financing/i.test(content);
  return hasPipeline && (hasStage || hasDeadline);
}

function detectSocial(content: string) {
  const firstTwoLines = content.split("\n").slice(0, 2).join("\n");
  // Require platform name followed by Post:/Caption: in a header pattern at the start
  const hasPlatformHeader = /\*?\*?\b(Instagram|Facebook|LinkedIn|Twitter|X|TikTok)\b\s*(Post|Caption)\s*:?\*?\*?/i.test(firstTwoLines);
  const hasHashtags = /#\w+/.test(content);
  return hasPlatformHeader && hasHashtags;
}

function detectListing(content: string) {
  const lines = content.split("\n");
  // Require property address on its own line (digit + street)
  const hasAddressLine = lines.some(l => /^\*?\*?\d+\s+\w+/.test(l.trim()));
  // Require bed/bath on a separate line
  const hasBedBathLine = lines.some(l => /\bbed/i.test(l) && /\bbath/i.test(l) && /\d/.test(l));
  return hasAddressLine && hasBedBathLine;
}

function parseEmail(content: string) {
  const cleanContent = content.replace(/\*\*(To|Subject|From):\*\*/gi, "$1:");
  const toMatch = cleanContent.match(/To:\s*(.+)/i);
  const subjectMatch = cleanContent.match(/Subject:\s*(.+)/i);

  const to = toMatch?.[1]?.trim().replace(/\*+/g, "") || "";
  const subject = subjectMatch?.[1]?.trim().replace(/\*+/g, "") || "";

  let bodyStart = 0;
  if (subjectMatch) {
    bodyStart = cleanContent.indexOf(subjectMatch[0]) + subjectMatch[0].length;
  } else if (toMatch) {
    bodyStart = cleanContent.indexOf(toMatch[0]) + toMatch[0].length;
  }

  let body = cleanContent.slice(bodyStart)
    .replace(/^\s*[-—]+\s*\n/, "")
    .replace(/^\s*\n/, "")
    .trim();
  body = body.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");

  const firstHeaderIdx = Math.min(
    toMatch ? cleanContent.indexOf(toMatch[0]) : Infinity,
    subjectMatch ? cleanContent.indexOf(subjectMatch[0]) : Infinity
  );
  const intro = content.slice(0, firstHeaderIdx).trim();

  return { intro, to, subject, body };
}

function parseSocial(content: string) {
  const platformMatch = content.match(/\b(Instagram|Facebook|LinkedIn|Twitter|X|TikTok)\b/i);
  const platform = platformMatch?.[1] || "Social";

  const lines = content.split("\n");
  let splitIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/(:|\bhere'?s?\b)/i.test(line) && /draft|post|caption/i.test(line)) {
      splitIdx = i;
      break;
    }
  }

  if (splitIdx === -1) {
    return { intro: lines[0], platform, postContent: lines.slice(1).join("\n").trim() };
  }

  const intro = lines.slice(0, splitIdx + 1).join("\n").trim();
  let postContent = lines.slice(splitIdx + 1).join("\n").trim();

  postContent = postContent
    .replace(/^["`\*]+|["`\*]+$/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .trim();

  return { intro, platform, postContent };
}

function parseListing(content: string) {
  const lines = content.split("\n");

  let address = "";
  let statsLine = "";
  let descStart = 0;
  let introEnd = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!address && /^\d+\s+\w+/.test(line)) {
      address = line.replace(/[*#]+/g, "").trim();
      descStart = i + 1;
      introEnd = i;
      continue;
    }
    if (address && /\bbed/i.test(line) && /\bbath/i.test(line)) {
      statsLine = line.replace(/[*#-]+/g, "").trim();
      descStart = i + 1;
      break;
    }
  }

  if (!address) {
    const atMatch = content.match(/\bat\s+(\d+\s+[A-Z][\w\s,]+)/i);
    if (atMatch) {
      address = atMatch[1].replace(/[*#]+/g, "").trim();
    } else {
      address = "Listing Description";
    }

    const bedBathLine = lines.find((l) => /\bbed/i.test(l) && /\bbath/i.test(l));
    if (bedBathLine) {
      statsLine = bedBathLine.replace(/[*#-]+/g, "").trim();
      descStart = lines.indexOf(bedBathLine) + 1;
      introEnd = lines.indexOf(bedBathLine);
    }
  }

  const intro = lines.slice(0, introEnd).join("\n").trim();
  const description = lines.slice(descStart).join("\n").trim();

  return { intro, address, stats: statsLine, description };
}

function parseDealSummary(content: string) {
  const lines = content.split("\n");
  const deals: { address: string; client?: string; stage?: string; price?: string }[] = [];
  const deadlines: { label: string; date: string; daysUntil: number }[] = [];
  const introLines: string[] = [];
  let pastIntro = false;

  const stagePattern = /\b(lead|active|under[\s_]?contract|due[\s_]?diligence|clear[\s_]?to[\s_]?close|closed|fell[\s_]?through|pending)\b/i;
  const pricePattern = /\$[\d,]+/;
  const addressPattern = /^\d+\s+\w+/;
  const deadlinePattern = /\b(closing|inspection|appraisal|financing|deadline)\b[:\s]*(.+)/i;
  const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\w+ \d{1,2},?\s*\d{4}|\d{4}-\d{2}-\d{2})/;

  for (const rawLine of lines) {
    const line = rawLine.replace(/[*#]+/g, "").replace(/^[-•]\s*/, "").trim();
    if (!line) continue;

    const hasAddress = addressPattern.test(line);
    const stageMatch = line.match(stagePattern);
    const priceMatch = line.match(pricePattern);

    if (hasAddress || (stageMatch && priceMatch)) {
      pastIntro = true;
      const deal: { address: string; client?: string; stage?: string; price?: string } = {
        address: hasAddress ? line.split(/[|·—–,]/)[0].trim() : line.split(/[|·—–,]/)[0].trim(),
      };

      if (stageMatch) deal.stage = stageMatch[1];
      if (priceMatch) deal.price = priceMatch[0];

      const clientMatch = line.match(/client:?\s*([^|·,]+)/i) || line.match(/for\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
      if (clientMatch) deal.client = clientMatch[1].trim();

      deals.push(deal);
      continue;
    }

    const dlMatch = line.match(deadlinePattern);
    if (dlMatch) {
      pastIntro = true;
      const dateMatch = dlMatch[2].match(datePattern);
      if (dateMatch) {
        const parsed = new Date(dateMatch[1]);
        const now = new Date();
        const diffMs = parsed.getTime() - now.getTime();
        const daysUntil = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

        deadlines.push({
          label: `${dlMatch[1].charAt(0).toUpperCase()}${dlMatch[1].slice(1).toLowerCase()} — ${line.split(/[|·—–]/)[0].trim()}`,
          date: dateMatch[1],
          daysUntil,
        });
      }
      continue;
    }

    if (!pastIntro) {
      introLines.push(rawLine);
    }
  }

  return { intro: introLines.join("\n").trim(), deals, deadlines };
}

/** Split content into sections on "---" horizontal rules */
function splitSections(content: string): string[] {
  const parts = content.split(/\n---+\n/);
  const result: string[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed) result.push(trimmed);
  }
  return result.length > 0 ? result : [content];
}

function renderSection(
  section: string,
  onAction?: (message: string) => void,
  contentType?: "drafted" | "informational",
  contentTypeHint?: ContentTypeHint
) {
  // If we have a content_type hint from the backend, use it directly
  if (contentTypeHint && contentTypeHint !== "conversational") {
    if (contentTypeHint === "email") {
      const { intro, to, subject, body } = parseEmail(section);
      return (
        <>
          {intro && (
            <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-foreground text-foreground">
              <ReactMarkdown>{intro}</ReactMarkdown>
            </div>
          )}
          <EmailCard to={to} subject={subject} body={body} onAction={onAction} contentType={contentType} />
        </>
      );
    }
    if (contentTypeHint === "social_post") {
      const { intro, platform, postContent } = parseSocial(section);
      return (
        <>
          {intro && (
            <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-foreground text-foreground">
              <ReactMarkdown>{intro}</ReactMarkdown>
            </div>
          )}
          <SocialPostCard platform={platform} content={postContent} onAction={onAction} contentType={contentType} />
        </>
      );
    }
    if (contentTypeHint === "listing_description") {
      const { intro, address, stats, description } = parseListing(section);
      return (
        <>
          {intro && (
            <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-foreground text-foreground">
              <ReactMarkdown>{intro}</ReactMarkdown>
            </div>
          )}
          <ListingCard address={address} stats={stats} description={description} onAction={onAction} contentType={contentType} />
        </>
      );
    }
  }

  // If hint says conversational, skip card detection entirely
  if (contentTypeHint === "conversational") {
    return (
      <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-foreground text-foreground">
        <ReactMarkdown>{section}</ReactMarkdown>
      </div>
    );
  }

  // Fallback: no hint (old messages) — use tightened regex with conversational guard
  if (detectConversational(section)) {
    return (
      <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-foreground text-foreground">
        <ReactMarkdown>{section}</ReactMarkdown>
      </div>
    );
  }

  if (detectEmail(section)) {
    const { intro, to, subject, body } = parseEmail(section);
    return (
      <>
        {intro && (
          <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-foreground text-foreground">
            <ReactMarkdown>{intro}</ReactMarkdown>
          </div>
        )}
        <EmailCard to={to} subject={subject} body={body} onAction={onAction} contentType={contentType} />
      </>
    );
  }

  if (detectDealSummary(section)) {
    const { intro, deals, deadlines } = parseDealSummary(section);
    return (
      <>
        {intro && (
          <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-foreground text-foreground">
            <ReactMarkdown>{intro}</ReactMarkdown>
          </div>
        )}
        <DealSummaryCard intro={intro} deals={deals} deadlines={deadlines} />
      </>
    );
  }

  if (detectSocial(section)) {
    const { intro, platform, postContent } = parseSocial(section);
    return (
      <>
        {intro && (
          <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-foreground text-foreground">
            <ReactMarkdown>{intro}</ReactMarkdown>
          </div>
        )}
        <SocialPostCard platform={platform} content={postContent} onAction={onAction} contentType={contentType} />
      </>
    );
  }

  if (detectListing(section)) {
    const { intro, address, stats, description } = parseListing(section);
    return (
      <>
        {intro && (
          <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-foreground text-foreground">
            <ReactMarkdown>{intro}</ReactMarkdown>
          </div>
        )}
        <ListingCard address={address} stats={stats} description={description} onAction={onAction} contentType={contentType} />
      </>
    );
  }

  // Plain markdown
  return (
    <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-foreground text-foreground">
      <ReactMarkdown>{section}</ReactMarkdown>
    </div>
  );
}

const ContentCardRenderer = ({ content, onAction, contentType, contentTypeHint }: ContentCardRendererProps) => {
  const sections = splitSections(content);

  if (sections.length === 1) {
    return <>{renderSection(sections[0], onAction, contentType, contentTypeHint)}</>;
  }

  return (
    <div className="space-y-0">
      {sections.map((section, i) => (
        <div
          key={i}
          className="animate-fade-in-up"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          {i > 0 && <Separator className="my-3" />}
          {renderSection(section, onAction, contentType, contentTypeHint)}
        </div>
      ))}
    </div>
  );
};

export default ContentCardRenderer;
