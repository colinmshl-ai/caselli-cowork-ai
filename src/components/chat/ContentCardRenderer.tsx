import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import SocialPostCard from "./SocialPostCard";
import EmailCard from "./EmailCard";
import ListingCard from "./ListingCard";
import DealSummaryCard from "./DealSummaryCard";
import PropertyListingCard from "./PropertyListingCard";
import ConversationalRenderer from "./ConversationalRenderer";
import { Separator } from "@/components/ui/separator";

const PROSE_CLASSES =
  "prose prose-sm max-w-none prose-p:my-2 prose-p:leading-relaxed [&>p]:mb-3 prose-ul:my-2 prose-li:my-1 prose-li:leading-relaxed prose-ul:pl-4 prose-headings:my-2 prose-strong:text-foreground prose-a:text-primary text-foreground";

type ContentTypeHint = "social_post" | "email" | "listing_description" | "conversational" | "property_enriched" | "deal_summary" | string;

interface ContentCardRendererProps {
  content: string;
  onAction?: (message: string) => void;
  contentType?: "drafted" | "informational";
  contentTypeHint?: ContentTypeHint;
}

// ─── Confidence-score detectors (0–1) ────────────────────────────────

function detectConversationalConfidence(content: string): number {
  let score = 0;
  if (/✅/.test(content)) score += 0.5;
  if (/(?:next\s+steps|suggestion|would you like me to|want me to)\s*.*:/i.test(content) && /\n\s*[-•*\d]/.test(content)) score += 0.4;
  // Short content without structure is likely conversational
  const lines = content.split("\n").filter(l => l.trim());
  if (lines.length <= 3 && score === 0) score += 0.3;
  return Math.min(score, 1);
}

function detectSocialConfidence(content: string): number {
  // Normalize: force newline before platform headers
  const normalized = content.replace(
    /([^\n])(\*{0,2}(Instagram|Facebook|LinkedIn|Twitter|X|TikTok)\s*(Post|Caption)\s*:?\*{0,2})/gi,
    '$1\n\n$2'
  );
  const nonEmptyLines = normalized.split("\n").filter(l => l.trim());
  const firstThree = nonEmptyLines.slice(0, 3).join("\n");

  // Check if platform keyword only appears in conversational phrasing
  const conversationalMentions = /(?:adapt|convert|rewrite|adjust|modify|change)\s+(?:this\s+)?(?:for|to)\s+(?:Instagram|Facebook|LinkedIn|Twitter|X|TikTok)/i;
  if (conversationalMentions.test(content) && !(/\*?\*?\b(Instagram|Facebook|LinkedIn|Twitter|X|TikTok)\b\s*(Post|Caption)\s*:?\*?\*?/i.test(firstThree))) {
    return 0;
  }

  let score = 0;

  // Platform keyword in first 3 lines
  const hasPlatformHeader = /\*?\*?\b(Instagram|Facebook|LinkedIn|Twitter|X|TikTok)\b\s*(Post|Caption)\s*:?\*?\*?/i.test(firstThree);
  if (hasPlatformHeader) score += 0.4;
  else return 0; // No platform header in first 3 lines = not a social post

  // Hashtags
  if (/#\w+/.test(content)) score += 0.2;

  // Emoji density > 1%
  const emojiCount = (content.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || []).length;
  if (emojiCount / content.length > 0.01) score += 0.1;

  // Quotes present
  if (/[""]/.test(content)) score += 0.1;

  // "Post" or "Caption" header format
  if (/\b(Post|Caption)\s*:/i.test(firstThree)) score += 0.2;

  return Math.min(score, 1);
}

function detectEmailConfidence(content: string): number {
  const nonEmptyLines = content.split("\n").filter(l => l.trim());
  const firstFive = nonEmptyLines.slice(0, 5).join("\n");

  let score = 0;

  // "Subject:" in first 5 lines
  if (/\*?\*?Subject:?\*?\*?\s*(.+)/i.test(firstFive)) score += 0.4;
  else return 0; // No subject in first 5 lines = not an email

  // "To:" present
  if (/\*?\*?To:?\*?\*?\s*(.+)/i.test(content)) score += 0.15;

  // Has body (≥2 lines after subject)
  const subjectIdx = nonEmptyLines.findIndex(l => /Subject:/i.test(l));
  if (subjectIdx >= 0 && nonEmptyLines.length - subjectIdx - 1 >= 2) score += 0.35;

  // Deduct if also looks social
  if (detectSocialConfidence(content) > 0.5) return 0;

  return Math.min(score, 1);
}

function detectDealSummaryConfidence(content: string): number {
  let score = 0;
  if (/pipeline|active deals?|deal summary/i.test(content)) score += 0.4;
  if (/\b(lead|active|under.?contract|due.?diligence|clear.?to.?close|closed|pending)\b/i.test(content)) score += 0.2;
  if (/deadline|closing|inspection|appraisal|financing/i.test(content)) score += 0.2;
  // Must have at least price or address-like patterns
  if (/\$[\d,]+/.test(content)) score += 0.1;
  if (/^\*?\*?\d+\s+\w+/m.test(content)) score += 0.1;
  return Math.min(score, 1);
}

function detectListingConfidence(content: string): number {
  if (detectPropertyEnrichedConfidence(content) > 0.7) return 0;
  const lines = content.split("\n");
  let score = 0;
  if (lines.some(l => /^\*?\*?\d+\s+\w+/.test(l.trim()))) score += 0.4;
  if (lines.some(l => /\bbed/i.test(l) && /\bbath/i.test(l) && /\d/.test(l))) score += 0.4;
  // Description length
  if (content.length > 200) score += 0.2;
  return Math.min(score, 1);
}

function detectPropertyEnrichedConfidence(content: string): number {
  let score = 0;
  if (/✅/.test(content)) score += 0.3;
  if (/\bbed/i.test(content) && /\bbath/i.test(content)) score += 0.3;
  if (/sq\s*ft|square\s*f/i.test(content)) score += 0.3;
  if (/\$[\d,]+/.test(content)) score += 0.1;
  return Math.min(score, 1);
}

// ─── Parsers (unchanged) ────────────────────────────────────

function parsePropertyEnriched(content: string) {
  const lines = content.split("\n");
  let address = "";
  let price: string | undefined;
  let bedrooms: number | undefined;
  let bathrooms: number | undefined;
  let squareFootage: number | undefined;
  let yearBuilt: number | undefined;
  let propertyType: string | undefined;
  const introLines: string[] = [];
  let pastCard = false;

  for (const rawLine of lines) {
    const line = rawLine.replace(/[*#]+/g, "").replace(/^[-•✅]\s*/, "").trim();
    if (!line) continue;

    if (!address && /^\d+\s+\w+/.test(line)) {
      address = line.split(/[|·—–]/).at(0)?.trim() || line;
      pastCard = true;
      continue;
    }

    const priceMatch = line.match(/\$[\d,]+(?:\.\d+)?/);
    if (priceMatch && !price) price = priceMatch[0];

    const bedMatch = line.match(/(\d+)\s*bed/i);
    if (bedMatch) bedrooms = parseInt(bedMatch[1]);

    const bathMatch = line.match(/([\d.]+)\s*bath/i);
    if (bathMatch) bathrooms = parseFloat(bathMatch[1]);

    const sqftMatch = line.match(/([\d,]+)\s*(?:sq\s*ft|square\s*f)/i);
    if (sqftMatch) squareFootage = parseInt(sqftMatch[1].replace(/,/g, ""));

    const yearMatch = line.match(/(?:built|year\s*built)[:\s]*(\d{4})/i) || line.match(/(\d{4})\s*(?:built|construction)/i);
    if (yearMatch) yearBuilt = parseInt(yearMatch[1]);

    const typeMatch = line.match(/(?:type|property\s*type)[:\s]*([\w\s]+)/i);
    if (typeMatch) propertyType = typeMatch[1].trim();

    if (!pastCard && /✅/.test(rawLine)) pastCard = true;
    if (!pastCard) introLines.push(rawLine);
  }

  const { cleaned, suggestions } = stripTrailingSuggestions(content);
  let intro = introLines.join("\n").trim();
  if (suggestions) intro = intro + (intro ? "\n\n" : "") + suggestions;

  return { intro, address: address || "Property", price, bedrooms, bathrooms, squareFootage, yearBuilt, propertyType };
}

function stripTrailingSuggestions(text: string): { cleaned: string; suggestions: string } {
  const idx = text.search(/\n\s*(?:next\s+steps|would you like|want me to|I can also|here are some|shall I|let me know|happy to)/i);
  if (idx > 0) return { cleaned: text.slice(0, idx).trim(), suggestions: text.slice(idx).trim() };
  return { cleaned: text, suggestions: "" };
}

function parseEmail(content: string) {
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
  if (subjectMatch) bodyStart = cleanContent.indexOf(subjectMatch[0]) + subjectMatch[0].length;
  else if (toMatch) bodyStart = cleanContent.indexOf(toMatch[0]) + toMatch[0].length;

  let body = cleanContent.slice(bodyStart).replace(/^\s*[-—]+\s*\n/, "").replace(/^\s*\n/, "").trim();
  body = body.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");

  const { cleaned: cleanBody, suggestions } = stripTrailingSuggestions(body);
  body = cleanBody;

  const firstHeaderIdx = Math.min(
    toMatch ? cleanContent.indexOf(toMatch[0]) : Infinity,
    subjectMatch ? cleanContent.indexOf(subjectMatch[0]) : Infinity
  );
  let intro = normalizedContent.slice(0, firstHeaderIdx).trim();
  if (suggestions) intro = intro + (intro ? '\n\n' : '') + suggestions;

  return { intro, to, subject, body };
}

function parseSocial(content: string) {
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
    if (/\*?\*?\b(Instagram|Facebook|LinkedIn|Twitter|X|TikTok)\b\s*(Post|Caption)\s*:?\*?\*?/i.test(line)) { splitIdx = i; break; }
    if (/(:|\bhere'?s?\b)/i.test(line) && /draft|post|caption/i.test(line)) { splitIdx = i; break; }
  }

  if (splitIdx === -1) return { intro: lines[0], platform, postContent: lines.slice(1).join("\n").trim() };

  let intro = lines.slice(0, splitIdx).join("\n").trim();
  let postContent = lines.slice(splitIdx + 1).join("\n").trim()
    .replace(/^["`\*]+|["`\*]+$/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .trim();

  const { cleaned, suggestions } = stripTrailingSuggestions(postContent);
  postContent = cleaned;
  if (suggestions) intro = intro + (intro ? '\n\n' : '') + suggestions;

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
    if (atMatch) address = atMatch[1].replace(/[*#]+/g, "").trim();
    else address = "Listing Description";

    const bedBathLine = lines.find((l) => /\bbed/i.test(l) && /\bbath/i.test(l));
    if (bedBathLine) {
      statsLine = bedBathLine.replace(/[*#-]+/g, "").trim();
      descStart = lines.indexOf(bedBathLine) + 1;
      introEnd = lines.indexOf(bedBathLine);
    }
  }

  let intro = lines.slice(0, introEnd).join("\n").trim();
  let description = lines.slice(descStart).join("\n").trim();

  const { cleaned, suggestions } = stripTrailingSuggestions(description);
  description = cleaned;
  if (suggestions) intro = intro + (intro ? '\n\n' : '') + suggestions;

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
  const addressPattern = /(?:^\*{0,2}\d+\s+\w+)|(?:^\d+\s+\w+)/;
  const deadlinePattern = /\b(closing|inspection|appraisal|financing|deadline)\b[:\s]*(.+)/i;
  const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\w+ \d{1,2},?\s*\d{4}|\d{4}-\d{2}-\d{2})/;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\*{1,2}/g, "").replace(/^#{1,4}\s*/, "").replace(/^[-•]\s*/, "").trim();
    if (!line) continue;

    const hasAddress = addressPattern.test(line);
    const stageMatch = line.match(stagePattern);
    const priceMatch = line.match(pricePattern);
    const signals = [hasAddress, !!stageMatch, !!priceMatch].filter(Boolean).length;

    if (signals >= 2 || (hasAddress && line.includes("|"))) {
      pastIntro = true;
      const segments = line.split(/[|·—–]/);
      const deal: { address: string; client?: string; stage?: string; price?: string } = { address: segments[0].trim() };
      if (stageMatch) deal.stage = stageMatch[1];
      if (priceMatch) deal.price = priceMatch[0];
      const clientMatch = line.match(/client:?\s*([^|·,]+)/i) || line.match(/for\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
      if (clientMatch) deal.client = clientMatch[1].trim();
      if (!hasAddress && !deal.address) deal.address = segments[0].trim() || "Deal";
      deals.push(deal);
      continue;
    }

    if (priceMatch && line.length > 10 && !deadlinePattern.test(line)) {
      const textPart = line.replace(pricePattern, "").replace(/[|·—–,]/g, " ").trim();
      if (textPart.length > 3) {
        pastIntro = true;
        deals.push({ address: textPart, price: priceMatch[0], stage: stageMatch?.[1] });
        continue;
      }
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

    if (!pastIntro) introLines.push(rawLine);
  }

  return { intro: introLines.join("\n").trim(), deals, deadlines, rawContent: content };
}

// ─── Section splitting ────────────────────────────────────

function splitSections(content: string): string[] {
  const parts = content.split(/\n-{3,}\n/);
  const result: string[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.length < 50 && result.length > 0) {
      result[result.length - 1] += '\n\n' + trimmed;
    } else {
      result.push(trimmed);
    }
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
    if (match > 0 && (splitIdx === -1 || match < splitIdx)) splitIdx = match;
  }

  if (splitIdx > 0) {
    return { cardContent: content.slice(0, splitIdx).trim(), conversationalTail: content.slice(splitIdx).trim() };
  }
  return { cardContent: content, conversationalTail: "" };
}

// ─── Card rendering (hint-based) ────────────────────────────────────

function renderCardOnly(
  section: string,
  onAction?: (message: string) => void,
  contentType?: "drafted" | "informational",
  contentTypeHint?: ContentTypeHint
) {
  if (contentTypeHint === "email") {
    const { intro, to, subject, body } = parseEmail(section);
    if (!body.trim() || body.trim().length < 50) return null;
    return (
      <>
        {intro && <div className={PROSE_CLASSES}><ReactMarkdown remarkPlugins={[remarkBreaks]}>{intro}</ReactMarkdown></div>}
        <EmailCard to={to} subject={subject} body={body} onAction={onAction} contentType={contentType} />
      </>
    );
  }
  if (contentTypeHint === "social_post") {
    const { intro, platform, postContent } = parseSocial(section);
    if (!postContent.trim() || postContent.trim().length < 20) return null;
    return (
      <>
        {intro && <div className={PROSE_CLASSES}><ReactMarkdown remarkPlugins={[remarkBreaks]}>{intro}</ReactMarkdown></div>}
        <SocialPostCard platform={platform} content={postContent} onAction={onAction} contentType={contentType} />
      </>
    );
  }
  if (contentTypeHint === "listing_description") {
    const { intro, address, stats, description } = parseListing(section);
    if (!description.trim() || description.trim().length < 30) return null;
    return (
      <>
        {intro && <div className={PROSE_CLASSES}><ReactMarkdown remarkPlugins={[remarkBreaks]}>{intro}</ReactMarkdown></div>}
        <ListingCard address={address} stats={stats} description={description} onAction={onAction} contentType={contentType} />
      </>
    );
  }
  if (contentTypeHint === "deal_summary") {
    const { intro, deals, deadlines, rawContent } = parseDealSummary(section);
    return (
      <>
        {intro && <div className={PROSE_CLASSES}><ReactMarkdown remarkPlugins={[remarkBreaks]}>{intro}</ReactMarkdown></div>}
        <DealSummaryCard intro={intro} deals={deals} deadlines={deadlines} rawContent={rawContent} />
      </>
    );
  }
  if (contentTypeHint === "property_enriched") {
    const { intro, address, price, bedrooms, bathrooms, squareFootage, yearBuilt, propertyType } = parsePropertyEnriched(section);
    const hasStats = bedrooms != null || bathrooms != null || squareFootage != null;
    if (address === "Property" && !hasStats) return null;
    return (
      <>
        {intro && <div className={PROSE_CLASSES}><ReactMarkdown remarkPlugins={[remarkBreaks]}>{intro}</ReactMarkdown></div>}
        <PropertyListingCard address={address} price={price} bedrooms={bedrooms} bathrooms={bathrooms} squareFootage={squareFootage} yearBuilt={yearBuilt} propertyType={propertyType} onAction={onAction} />
      </>
    );
  }
  return null;
}

// ─── Render a card for a detected type (confidence fallback) ────────

function renderDetectedCard(
  section: string,
  detectedType: string,
  onAction?: (message: string) => void,
  contentType?: "drafted" | "informational"
) {
  const { cardContent, conversationalTail } = splitCardFromConversation(section, detectedType);

  let cardElement: React.ReactNode = null;

  if (detectedType === "property_enriched") {
    const { intro, address, price, bedrooms, bathrooms, squareFootage, yearBuilt, propertyType } = parsePropertyEnriched(cardContent);
    cardElement = (
      <>
        {intro && <div className={PROSE_CLASSES}><ReactMarkdown remarkPlugins={[remarkBreaks]}>{intro}</ReactMarkdown></div>}
        <PropertyListingCard address={address} price={price} bedrooms={bedrooms} bathrooms={bathrooms} squareFootage={squareFootage} yearBuilt={yearBuilt} propertyType={propertyType} onAction={onAction} />
      </>
    );
  } else if (detectedType === "social_post") {
    const { intro, platform, postContent } = parseSocial(cardContent);
    if (!postContent.trim() || postContent.trim().length < 20) return null;
    cardElement = (
      <>
        {intro && <div className={PROSE_CLASSES}><ReactMarkdown remarkPlugins={[remarkBreaks]}>{intro}</ReactMarkdown></div>}
        <SocialPostCard platform={platform} content={postContent} onAction={onAction} contentType={contentType} />
      </>
    );
  } else if (detectedType === "email") {
    const { intro, to, subject, body } = parseEmail(cardContent);
    if (!body.trim() || body.trim().length < 50) return null;
    cardElement = (
      <>
        {intro && <div className={PROSE_CLASSES}><ReactMarkdown remarkPlugins={[remarkBreaks]}>{intro}</ReactMarkdown></div>}
        <EmailCard to={to} subject={subject} body={body} onAction={onAction} contentType={contentType} />
      </>
    );
  } else if (detectedType === "deal_summary") {
    const { intro, deals, deadlines, rawContent } = parseDealSummary(cardContent);
    cardElement = (
      <>
        {intro && <div className={PROSE_CLASSES}><ReactMarkdown remarkPlugins={[remarkBreaks]}>{intro}</ReactMarkdown></div>}
        <DealSummaryCard intro={intro} deals={deals} deadlines={deadlines} rawContent={rawContent} />
      </>
    );
  } else if (detectedType === "listing") {
    const { intro, address, stats, description } = parseListing(cardContent);
    if (!description.trim() || description.trim().length < 30) return null;
    cardElement = (
      <>
        {intro && <div className={PROSE_CLASSES}><ReactMarkdown remarkPlugins={[remarkBreaks]}>{intro}</ReactMarkdown></div>}
        <ListingCard address={address} stats={stats} description={description} onAction={onAction} contentType={contentType} />
      </>
    );
  }

  if (!cardElement) return null;

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

// ─── Main render logic ────────────────────────────────────

function renderSection(
  section: string,
  onAction?: (message: string) => void,
  contentType?: "drafted" | "informational",
  contentTypeHint?: ContentTypeHint
) {
  // 1. Backend hint takes absolute priority
  if (contentTypeHint && contentTypeHint !== "conversational") {
    const { cardContent, conversationalTail } = splitCardFromConversation(section, contentTypeHint);
    const cardElement = renderCardOnly(cardContent, onAction, contentType, contentTypeHint);
    if (cardElement) {
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
    // Hint rendering failed — fall through to conversational
  }

  if (contentTypeHint === "conversational") {
    return <ConversationalRenderer content={section} onAction={onAction} />;
  }

  // 2. Confidence-based fallback (only for old messages without hints)
  const scores: Record<string, number> = {
    conversational: detectConversationalConfidence(section),
    property_enriched: detectPropertyEnrichedConfidence(section),
    social_post: detectSocialConfidence(section),
    email: detectEmailConfidence(section),
    deal_summary: detectDealSummaryConfidence(section),
    listing: detectListingConfidence(section),
  };

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [bestType, bestScore] = sorted[0];

  // Conversational wins — use ConversationalRenderer
  if (bestType === "conversational" && bestScore > 0.3) {
    return <ConversationalRenderer content={section} onAction={onAction} />;
  }

  // Only render as card if confidence > 0.7
  if (bestScore > 0.7 && bestType !== "conversational") {
    const card = renderDetectedCard(section, bestType, onAction, contentType);
    if (card) return card;
  }

  // 3. Default: conversational markdown
  return <ConversationalRenderer content={section} onAction={onAction} />;
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
