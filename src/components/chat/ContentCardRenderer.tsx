import ReactMarkdown from "react-markdown";
import SocialPostCard from "./SocialPostCard";
import EmailCard from "./EmailCard";
import ListingCard from "./ListingCard";

interface ContentCardRendererProps {
  content: string;
}

function detectEmail(content: string) {
  const hasSubject = /Subject:\s*(.+)/i.test(content);
  const hasRecipient = /To:\s*(.+)/i.test(content) || /\b(Dear |Hi |Hello )/i.test(content);
  return hasSubject && hasRecipient;
}

function detectSocial(content: string) {
  const hasPlatform = /\b(Instagram|Facebook|LinkedIn)\b/i.test(content);
  const hasDraft = /draft|post|caption/i.test(content);
  return hasPlatform && hasDraft;
}

function detectListing(content: string) {
  return /\bbed/i.test(content) && /\bbath/i.test(content) && /\d/.test(content);
}

function parseEmail(content: string) {
  const toMatch = content.match(/To:\s*(.+)/i);
  const subjectMatch = content.match(/Subject:\s*(.+)/i);

  const to = toMatch?.[1]?.trim() || "";
  const subject = subjectMatch?.[1]?.trim() || "";

  // Find where the email body starts (after Subject line or after a blank line following headers)
  let bodyStart = 0;
  if (subjectMatch) {
    bodyStart = content.indexOf(subjectMatch[0]) + subjectMatch[0].length;
  } else if (toMatch) {
    bodyStart = content.indexOf(toMatch[0]) + toMatch[0].length;
  }

  const body = content.slice(bodyStart).replace(/^\s*\n/, "").trim();

  // Intro is everything before "To:" or "Subject:" whichever comes first
  const firstHeaderIdx = Math.min(
    toMatch ? content.indexOf(toMatch[0]) : Infinity,
    subjectMatch ? content.indexOf(subjectMatch[0]) : Infinity
  );
  const intro = content.slice(0, firstHeaderIdx).trim();

  return { intro, to, subject, body };
}

function parseSocial(content: string) {
  const platformMatch = content.match(/\b(Instagram|Facebook|LinkedIn)\b/i);
  const platform = platformMatch?.[1] || "Social";

  // Try to split on common patterns like "---", triple backticks, or "Here's" intro
  // Look for a block that starts after a colon or newline following the intro
  const lines = content.split("\n");
  let splitIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Detect start of draft block: line after "draft", "post", "caption" mention with colon
    if (/(:|\bhere'?s?\b)/i.test(line) && /draft|post|caption/i.test(line)) {
      splitIdx = i;
      break;
    }
  }

  if (splitIdx === -1) {
    // Fallback: first line is intro, rest is content
    return { intro: lines[0], platform, postContent: lines.slice(1).join("\n").trim() };
  }

  const intro = lines.slice(0, splitIdx + 1).join("\n").trim();
  let postContent = lines.slice(splitIdx + 1).join("\n").trim();

  // Strip wrapping quotes or backticks
  postContent = postContent.replace(/^[`"]+|[`"]+$/g, "").trim();

  return { intro, platform, postContent };
}

function parseListing(content: string) {
  const lines = content.split("\n");

  // Try to find address line (usually has a number followed by street name)
  let address = "";
  let statsLine = "";
  let descStart = 0;
  let introEnd = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Address pattern: starts with number, has street-like words
    if (!address && /^\d+\s+\w+/.test(line)) {
      address = line.replace(/[*#]+/g, "").trim();
      descStart = i + 1;
      introEnd = i;
      continue;
    }
    // Stats line with bed/bath
    if (address && /\bbed/i.test(line) && /\bbath/i.test(line)) {
      statsLine = line.replace(/[*#-]+/g, "").trim();
      descStart = i + 1;
      break;
    }
  }

  if (!address) {
    // Fallback: use first line mentioning bed/bath context
    address = "Property";
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

const ContentCardRenderer = ({ content }: ContentCardRendererProps) => {
  if (detectEmail(content)) {
    const { intro, to, subject, body } = parseEmail(content);
    return (
      <>
        {intro && (
          <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-foreground text-foreground">
            <ReactMarkdown>{intro}</ReactMarkdown>
          </div>
        )}
        <EmailCard to={to} subject={subject} body={body} />
      </>
    );
  }

  if (detectSocial(content)) {
    const { intro, platform, postContent } = parseSocial(content);
    return (
      <>
        {intro && (
          <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-foreground text-foreground">
            <ReactMarkdown>{intro}</ReactMarkdown>
          </div>
        )}
        <SocialPostCard platform={platform} content={postContent} />
      </>
    );
  }

  if (detectListing(content)) {
    const { intro, address, stats, description } = parseListing(content);
    return (
      <>
        {intro && (
          <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-foreground text-foreground">
            <ReactMarkdown>{intro}</ReactMarkdown>
          </div>
        )}
        <ListingCard address={address} stats={stats} description={description} />
      </>
    );
  }

  // Fallback: plain markdown
  return (
    <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-foreground text-foreground">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
};

export default ContentCardRenderer;
