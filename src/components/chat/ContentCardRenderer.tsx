import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import SocialPostCard from "./SocialPostCard";
import EmailCard from "./EmailCard";
import ListingCard from "./ListingCard";
import DealSummaryCard from "./DealSummaryCard";
import ConversationalRenderer from "./ConversationalRenderer";
import { Separator } from "@/components/ui/separator";

const PROSE_CLASSES =
  "prose prose-sm max-w-none prose-p:my-2 prose-p:leading-relaxed [&>p]:mb-3 prose-ul:my-2 prose-li:my-1 prose-li:leading-relaxed prose-ul:pl-4 prose-headings:my-2 prose-strong:text-foreground prose-a:text-primary text-foreground";

type ContentTypeHint = "social_post" | "email" | "listing_description" | "conversational" | string;

interface ContentCardRendererProps {
  content: string;
  onAction?: (message: string) => void;
  contentType?: "drafted" | "informational";
  contentTypeHint?: ContentTypeHint;
}

/** Returns true if the content is clearly conversational with confirmations or suggestion structure */
function detectConversational(content: string): boolean {
  // Has ✅ confirmation banners — strong signal
  if (/✅/.test(content)) {
    return true;
  }
  // Has a tight "next steps" / "suggestions" header followed by a list
  if (/(?:next\s+steps|suggestion|would you like me to|want me to)\s*.*:/i.test(content) && /\n\s*[-•*\d]/.test(content)) {
    return true;
  }
  return false;
}

function detectEmail(content: string) {
  // If it also looks like a social post, it's not an email
  if (detectSocial(content)) return false;
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
  // Normalize: force newline before platform headers so detection works even if inline
  const normalized = content.replace(
    /([^\n])(\*{0,2}(Instagram|Facebook|LinkedIn|Twitter|X|TikTok)\s*(Post|Caption)\s*:?\*{0,2})/gi,
    '$1\n\n$2'
  );
  const firstThreeLines = normalized.split("\n").filter(l => l.trim()).slice(0, 3).join("\n");
  const hasPlatformHeader = /\*?\*?\b(Instagram|Facebook|LinkedIn|Twitter|X|TikTok)\b\s*(Post|Caption)\s*:?\*?\*?/i.test(firstThreeLines);
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

function stripTrailingSuggestions(text: string): { cleaned: string; suggestions: string } {
  const idx = text.search(/\n\s*(?:next\s+steps|would you like|want me to|I can also|here are some|shall I|let me know|happy to)/i);
  if (idx > 0) {
    return { cleaned: text.slice(0, idx).trim(), suggestions: text.slice(idx).trim() };
  }
  return { cleaned: text, suggestions: "" };
}

function parseEmail(content: string) {
  // Force separation before email headers
  const normalizedContent = content.replace(
    /([^\n])(\*{0,2}(To|Subject|From)\s*:\s*\*{0,2})/gi,
    '$1\n\n$2'
  );

  const cleanContent = normalizedContent.replace(/\*\*(To|Subject|From):\*\*/gi, "$1:");
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

  // Strip trailing suggestions from body
  const { cleaned: cleanBody, suggestions } = stripTrailingSuggestions(body);
  body = cleanBody;

  const firstHeaderIdx = Math.min(
    toMatch ? cleanContent.indexOf(toMatch[0]) : Infinity,
    subjectMatch ? cleanContent.indexOf(subjectMatch[0]) : Infinity
  );
  let intro = normalizedContent.slice(0, firstHeaderIdx).trim();
  if (suggestions) {
    intro = intro + (intro ? '\n\n' : '') + suggestions;
  }

  return { intro, to, subject, body };
}

function parseSocial(content: string) {
  // Force separation before platform headers so intro text doesn't run into card
  const normalizedContent = content.replace(
    /([^\n])(\*{0,2}(Instagram|Facebook|LinkedIn|Twitter|X|TikTok)\s*(Post|Caption)\s*:?\*{0,2})/gi,
    '$1\n\n$2'
  );

  const platformMatch = normalizedContent.match(/\b(Instagram|Facebook|LinkedIn|Twitter|X|TikTok)\b/i);
  const platform = platformMatch?.[1] || "Social";

  const lines = normalizedContent.split("\n");
  let splitIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Match platform header lines like "**Instagram Post:**"
    if (/\*?\*?\b(Instagram|Facebook|LinkedIn|Twitter|X|TikTok)\b\s*(Post|Caption)\s*:?\*?\*?/i.test(line)) {
      splitIdx = i;
      break;
    }
    if (/(:|\bhere'?s?\b)/i.test(line) && /draft|post|caption/i.test(line)) {
      splitIdx = i;
      break;
    }
  }

  if (splitIdx === -1) {
    return { intro: lines[0], platform, postContent: lines.slice(1).join("\n").trim() };
  }

  let intro = lines.slice(0, splitIdx).join("\n").trim();
  let postContent = lines.slice(splitIdx + 1).join("\n").trim();

  postContent = postContent
    .replace(/^["`\*]+|["`\*]+$/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .trim();

  // Strip next steps / suggestions from post content
  const { cleaned, suggestions } = stripTrailingSuggestions(postContent);
  postContent = cleaned;
  if (suggestions) {
    intro = intro + (intro ? '\n\n' : '') + suggestions;
  }

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

  let intro = lines.slice(0, introEnd).join("\n").trim();
  let description = lines.slice(descStart).join("\n").trim();

  // Strip trailing suggestions from listing description
  const { cleaned, suggestions } = stripTrailingSuggestions(description);
  description = cleaned;
  if (suggestions) {
    intro = intro + (intro ? '\n\n' : '') + suggestions;
  }

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

function splitCardFromConversation(content: string, hint: ContentTypeHint): { cardContent: string; conversationalTail: string } {
  const conversationalPatterns = [
    /\n\s*(?:next\s+steps|here(?:'s| are) (?:some|a few)|would you like|want me to|I can also|shall I|let me know|happy to)/i,
    /\n\s*(?:\d+[\.\)]\s+(?:adapt|edit|schedule|draft|create|send|adjust|share|post))/i,
  ];

  let splitIdx = -1;
  for (const pattern of conversationalPatterns) {
    const match = content.search(pattern);
    if (match > 0 && (splitIdx === -1 || match < splitIdx)) {
      splitIdx = match;
    }
  }

  if (splitIdx > 0) {
    return {
      cardContent: content.slice(0, splitIdx).trim(),
      conversationalTail: content.slice(splitIdx).trim(),
    };
  }
  return { cardContent: content, conversationalTail: "" };
}

function renderCardOnly(
  section: string,
  onAction?: (message: string) => void,
  contentType?: "drafted" | "informational",
  contentTypeHint?: ContentTypeHint
) {
  if (contentTypeHint === "email") {
    const { intro, to, subject, body } = parseEmail(section);
    return (
      <>
        {intro && (
          <div className={PROSE_CLASSES}>
            <ReactMarkdown remarkPlugins={[remarkBreaks]}>{intro}</ReactMarkdown>
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
          <div className={PROSE_CLASSES}>
            <ReactMarkdown remarkPlugins={[remarkBreaks]}>{intro}</ReactMarkdown>
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
          <div className={PROSE_CLASSES}>
            <ReactMarkdown remarkPlugins={[remarkBreaks]}>{intro}</ReactMarkdown>
          </div>
        )}
        <ListingCard address={address} stats={stats} description={description} onAction={onAction} contentType={contentType} />
      </>
    );
  }
  return (
    <div className={PROSE_CLASSES}>
      <ReactMarkdown remarkPlugins={[remarkBreaks]}>{section}</ReactMarkdown>
    </div>
  );
}

function renderSection(
  section: string,
  onAction?: (message: string) => void,
  contentType?: "drafted" | "informational",
  contentTypeHint?: ContentTypeHint
) {
  // For hinted card types, split card content from conversational tail
  if (contentTypeHint && contentTypeHint !== "conversational") {
    if (contentTypeHint === "email" || contentTypeHint === "social_post" || contentTypeHint === "listing_description") {
      const { cardContent, conversationalTail } = splitCardFromConversation(section, contentTypeHint);
      const cardElement = renderCardOnly(cardContent, onAction, contentType, contentTypeHint);
      if (conversationalTail) {
        return (
          <>
            {cardElement}
            <ConversationalRenderer content={conversationalTail} onAction={onAction} />
          </>
        );
      }
      return cardElement;
    }
  }

  // If hint says conversational, use enhanced conversational renderer
  if (contentTypeHint === "conversational") {
    return <ConversationalRenderer content={section} onAction={onAction} />;
  }

  // Fallback: no hint (old messages) — use tightened regex with conversational guard
  if (detectConversational(section)) {
    return <ConversationalRenderer content={section} onAction={onAction} />;
  }

  if (detectSocial(section)) {
    const { cardContent, conversationalTail } = splitCardFromConversation(section, "social_post");
    const { intro, platform, postContent } = parseSocial(cardContent);
    const cardElement = (
      <>
        {intro && (
          <div className={PROSE_CLASSES}>
            <ReactMarkdown remarkPlugins={[remarkBreaks]}>{intro}</ReactMarkdown>
          </div>
        )}
        <SocialPostCard platform={platform} content={postContent} onAction={onAction} contentType={contentType} />
      </>
    );
    if (conversationalTail) {
      return (
        <>
          {cardElement}
          <ConversationalRenderer content={conversationalTail} onAction={onAction} />
        </>
      );
    }
    return cardElement;
  }

  if (detectEmail(section)) {
    const { cardContent, conversationalTail } = splitCardFromConversation(section, "email");
    const { intro, to, subject, body } = parseEmail(cardContent);
    const cardElement = (
      <>
        {intro && (
          <div className={PROSE_CLASSES}>
            <ReactMarkdown remarkPlugins={[remarkBreaks]}>{intro}</ReactMarkdown>
          </div>
        )}
        <EmailCard to={to} subject={subject} body={body} onAction={onAction} contentType={contentType} />
      </>
    );
    if (conversationalTail) {
      return (
        <>
          {cardElement}
          <ConversationalRenderer content={conversationalTail} onAction={onAction} />
        </>
      );
    }
    return cardElement;
  }

  if (detectDealSummary(section)) {
    const { intro, deals, deadlines } = parseDealSummary(section);
    return (
      <>
        {intro && (
          <div className={PROSE_CLASSES}>
            <ReactMarkdown remarkPlugins={[remarkBreaks]}>{intro}</ReactMarkdown>
          </div>
        )}
        <DealSummaryCard intro={intro} deals={deals} deadlines={deadlines} />
      </>
    );
  }

  if (detectListing(section)) {
    const { cardContent, conversationalTail } = splitCardFromConversation(section, "listing_description");
    const { intro, address, stats, description } = parseListing(cardContent);
    const cardElement = (
      <>
        {intro && (
          <div className={PROSE_CLASSES}>
            <ReactMarkdown remarkPlugins={[remarkBreaks]}>{intro}</ReactMarkdown>
          </div>
        )}
        <ListingCard address={address} stats={stats} description={description} onAction={onAction} contentType={contentType} />
      </>
    );
    if (conversationalTail) {
      return (
        <>
          {cardElement}
          <ConversationalRenderer content={conversationalTail} onAction={onAction} />
        </>
      );
    }
    return cardElement;
  }

  // Plain markdown
  return (
    <div className={PROSE_CLASSES}>
      <ReactMarkdown remarkPlugins={[remarkBreaks]}>{section}</ReactMarkdown>
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
