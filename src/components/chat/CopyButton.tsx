import { useState } from "react";
import { Copy, Check } from "lucide-react";

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 p-1.5 rounded-md bg-background/80 backdrop-blur-sm text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? (
        <>
          <Check size={14} className="text-primary" />
          <span>Copied</span>
        </>
      ) : (
        <>
          <Copy size={14} />
          <span>Copy</span>
        </>
      )}
    </button>
  );
};

export default CopyButton;
