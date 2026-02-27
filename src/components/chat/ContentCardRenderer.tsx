import ReactMarkdown from "react-markdown";
import SocialPostCard from "./SocialPostCard";
import EmailCard from "./EmailCard";
import ListingCard from "./ListingCard";
import { Separator } from "@/components/ui/separator";

interface ContentCardRendererProps {
  content: string;
  onAction?: (message: string) => void;
  contentType?: "drafted" | "informational";
}

function detectEmail(content: string) {
  const hasSubject = /\*?\*?Subject:?\*?\*?\s*(.+)/i.test(content);
  const hasRecipient = /\*?\*?To:?\*?\*?\s*(.+)/i.test(content) || /\b(Dear |Hi |Hello |Hey )\w/i.test(content);
  const hasClosing = /Best|Sincerely|Regards|Thanks|Warm regards/i.test(content);
  return hasSubject || (hasRecipient && hasClosing);
}

function detectSocial(content: string) {
  const lines = content.split("\n").slice(0, 3).join("\n");
  const hasPlatformInHeader = /\b(Instagram|Facebook|LinkedIn|Twitter|X|TikTok)\b/i.test(lines);
  const hasHashtags = /#\w+/.test(content);
  const isConversational = /next steps|I'd suggest|want me to|shall we|^\d+\.\s/im.test(content);
  return hasPlatformInHeader && hasHashtags && !isConversational;
}

function detectListing(content: string) {
  const hasBedBath = /\bbed/i.test(content) && /\bbath/i.test(content) && /\d/.test(content);
  const hasMLS = /\bMLS\b|listing description|property description/i.test(content);
  const hasPropertyDetails = /sq\s*ft|square feet|square foot/i.test(content) && /\d/.test(content);
  return hasBedBath || hasMLS || hasPropertyDetails;
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
    // Try "at [address]" pattern
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

/** Split content into sections on "---" horizontal rules */
function splitSections(content: string): string[] {
  const parts = content.split(/\n---+\n/);
  // Also split on triple-newline boundaries between distinct content types
  const result: string[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed) result.push(trimmed);
  }
  return result.length > 0 ? result : [content];
}

function renderSection(section: string, onAction?: (message: string) => void, contentType?: "drafted" | "informational") {
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

const ContentCardRenderer = ({ content, onAction, contentType }: ContentCardRendererProps) => {
  const sections = splitSections(content);

  if (sections.length === 1) {
    return <>{renderSection(sections[0], onAction, contentType)}</>;
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
          {renderSection(section, onAction, contentType)}
        </div>
      ))}
    </div>
  );
};

export default ContentCardRenderer;
