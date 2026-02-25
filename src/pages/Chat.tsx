import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import ChatPanel from "@/components/chat/ChatPanel";
import ActivityPanel from "@/components/chat/ActivityPanel";

const Chat = () => {
  const [activeTab, setActiveTab] = useState<"chat" | "activity">("chat");
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const sendMessageRef = useRef<((msg: string) => void) | null>(null);

  useEffect(() => {
    const prompt = searchParams.get("prompt");
    if (prompt) {
      setPendingPrompt(prompt);
    }
  }, [searchParams]);

  const handleQuickAction = useCallback((message: string) => {
    setActiveTab("chat");
    if (sendMessageRef.current) {
      sendMessageRef.current(message);
    } else {
      setPendingPrompt(message);
    }
  }, []);

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* Mobile tab toggle */}
      <div className="flex md:hidden border-b border-border">
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === "chat"
              ? "text-foreground border-b-2 border-foreground"
              : "text-muted-foreground"
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === "activity"
              ? "text-foreground border-b-2 border-foreground"
              : "text-muted-foreground"
          }`}
        >
          Activity
        </button>
      </div>

      {/* Chat panel */}
      <div
        className={`flex-1 flex flex-col md:w-[58%] md:max-w-[58%] min-h-0 ${
          activeTab !== "chat" ? "hidden md:flex" : "flex"
        }`}
      >
        <ChatPanel
          pendingPrompt={pendingPrompt}
          onPromptConsumed={() => setPendingPrompt(null)}
          sendMessageRef={sendMessageRef}
        />
      </div>

      {/* Activity panel */}
      <div
        className={`md:w-[42%] md:max-w-[42%] border-l border-border flex flex-col min-h-0 ${
          activeTab !== "activity" ? "hidden md:flex" : "flex"
        }`}
      >
        <ActivityPanel onQuickAction={handleQuickAction} />
      </div>
    </div>
  );
};

export default Chat;
