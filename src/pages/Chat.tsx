import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Activity, X } from "lucide-react";
import ChatPanel from "@/components/chat/ChatPanel";
import type { TodoItem } from "@/components/chat/ChatPanel";
import ActivityPanel from "@/components/chat/ActivityPanel";
import { useIsMobile } from "@/hooks/use-mobile";

export interface ConversationContext {
  lastToolUsed?: string;
  lastDealId?: string;
  lastContactId?: string;
  topic?: "deals" | "content" | "contacts" | "general";
}

const Chat = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const sendMessageRef = useRef<((msg: string) => void) | null>(null);
  const [conversationContext, setConversationContext] = useState<ConversationContext>({ topic: "general" });
  const chatTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [showActivity, setShowActivity] = useState(false);
  const [todos, setTodos] = useState<TodoItem[]>([]);

  useEffect(() => {
    const prompt = searchParams.get("prompt");
    if (prompt) setPendingPrompt(prompt);
  }, [searchParams]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        chatTextareaRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleQuickAction = useCallback((message: string) => {
    setShowActivity(false);
    if (sendMessageRef.current) {
      sendMessageRef.current(message);
    } else {
      setPendingPrompt(message);
    }
  }, []);

  return (
    <div className="relative flex h-full flex-col">
      <ChatPanel
        pendingPrompt={pendingPrompt}
        onPromptConsumed={() => setPendingPrompt(null)}
        sendMessageRef={sendMessageRef}
        onConversationContext={setConversationContext}
        textareaRef={chatTextareaRef}
        onToggleActivity={() => setShowActivity((p) => !p)}
        showActivity={showActivity}
        onTodosUpdate={setTodos}
      />

      {showActivity && (
        <>
          {isMobile && (
            <div
              className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
              onClick={() => setShowActivity(false)}
            />
          )}
          <div
            className={`
              fixed z-50
              ${isMobile
                ? "inset-x-3 bottom-3 top-auto max-h-[75vh] rounded-2xl"
                : "right-4 top-16 bottom-auto w-[340px] max-h-[calc(100vh-5rem)] rounded-2xl"
              }
              border border-border bg-card/95 backdrop-blur-xl shadow-2xl
              flex flex-col overflow-hidden
              animate-in fade-in slide-in-from-right-3 duration-200
            `}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Activity</span>
              </div>
              <button
                onClick={() => setShowActivity(false)}
                className="flex items-center justify-center h-7 w-7 rounded-lg hover:bg-secondary/70 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <ActivityPanel
                onQuickAction={handleQuickAction}
                conversationContext={conversationContext}
                isFloating
                todos={todos}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Chat;
