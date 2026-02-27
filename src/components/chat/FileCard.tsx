import { FileText, Globe, FileSpreadsheet, FileType, Download, Copy, Check } from "lucide-react";
import { useState } from "react";

interface FileCardProps {
  filename: string;
  url: string;
  format: string;
  size: number;
}

const formatIcons: Record<string, typeof FileText> = {
  md: FileText,
  html: Globe,
  csv: FileSpreadsheet,
  txt: FileType,
};

const formatLabels: Record<string, string> = {
  md: "Markdown",
  html: "HTML",
  csv: "CSV",
  txt: "Plain Text",
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

const FileCard = ({ filename, url, format, size }: FileCardProps) => {
  const [copied, setCopied] = useState(false);
  const Icon = formatIcons[format] || FileText;

  const handleCopy = async () => {
    try {
      const res = await fetch(url);
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: copy URL
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 my-2 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10">
          <Icon size={18} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{filename}</p>
          <p className="text-xs text-muted-foreground">
            {formatLabels[format] || format.toUpperCase()} • {formatSize(size)}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Download size={13} />
          Download
        </a>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border border-border bg-background text-foreground hover:bg-secondary/50 transition-colors"
        >
          {copied ? (
            <>
              <Check size={13} className="text-primary" />
              Copied
            </>
          ) : (
            <>
              <Copy size={13} />
              Copy
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default FileCard;
