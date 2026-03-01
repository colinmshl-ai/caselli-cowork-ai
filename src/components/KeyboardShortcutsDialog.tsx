import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
const mod = isMac ? "⌘" : "Ctrl";

const SHORTCUTS = [
  { keys: `${mod}K`, action: "Focus chat input" },
  { keys: `${mod}Enter`, action: "Send message" },
  { keys: "Escape", action: "Close panel / blur input" },
  { keys: `${mod}N`, action: "New conversation" },
  { keys: `${mod}.`, action: "Stop generation" },
  { keys: "↑", action: "Edit last message (empty input)" },
];

interface KeyboardShortcutsDialogProps {
  trigger?: React.ReactNode;
}

const KeyboardShortcutsDialog = ({ trigger }: KeyboardShortcutsDialogProps) => (
  <Dialog>
    <DialogTrigger asChild>
      {trigger || (
        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Keyboard size={16} />
          View keyboard shortcuts
        </button>
      )}
    </DialogTrigger>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="text-base">Keyboard Shortcuts</DialogTitle>
      </DialogHeader>
      <div className="space-y-1 mt-2">
        {SHORTCUTS.map(({ keys, action }) => (
          <div key={keys} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
            <span className="text-sm text-foreground">{action}</span>
            <kbd className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">
              {keys}
            </kbd>
          </div>
        ))}
      </div>
    </DialogContent>
  </Dialog>
);

export default KeyboardShortcutsDialog;
