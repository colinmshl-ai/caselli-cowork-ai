import { useState, useEffect, useRef, useCallback, MutableRefObject } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, ArrowUp, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ChatPanelProps {
  pendingPrompt: string | null;
  onPromptConsumed: () => void;
  sendMessageRef: MutableRefObject<((msg: string) => void) | null>;
}

const TypingIndicator = () => (
  <div className="flex items-center gap-1 px-2 py-1">
    <div className="flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce"
          style={{ animationDelay: `${i * 150}ms`, animationDuration: "0.8s" }}
        />
      ))}
    </div>
  </div>
);

const ChatPanel = ({ pendingPrompt, onPromptConsumed, sendMessageRef }: ChatPanelProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [typing, setTyping] = useState(false);
  const [showConvos, setShowConvos] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialized = useRef(false);

  // Fetch conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Load most recent conversation on mount
  useEffect(() => {
    if (!initialized.current && conversations.length > 0 && !activeConvoId) {
      initialized.current = true;
      loadConversation(conversations[0].id);
    }
  }, [conversations]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // Handle pending prompt
  useEffect(() => {
    if (pendingPrompt && user) {
      sendMessage(pendingPrompt);
      onPromptConsumed();
    }
  }, [pendingPrompt, user]);

  // Expose send function
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !user) return;

    let convoId = activeConvoId;

    // Create conversation if needed
    if (!convoId) {
      const title = text.slice(0, 40) + (text.length > 40 ? "…" : "");
      const { data, error } = await supabase
        .from("conversations")
        .insert({ user_id: user.id, title })
        .select()
        .single();
      if (error || !data) return;
      convoId = data.id;
      setActiveConvoId(convoId);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }

    // Save user message
    const userMsg = { conversation_id: convoId, role: "user", content: text.trim() };
    const { data: savedUser } = await supabase.from("messages").insert(userMsg).select().single();
    if (savedUser) setMessages((prev) => [...prev, savedUser]);

    // Update conversation timestamp
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", convoId);

    setInput("");
    resetTextarea();

    // Call AI edge function
    setTyping(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("chat", {
        body: { conversation_id: convoId, message: text.trim() },
      });

      if (fnError) throw fnError;

      const assistantContent = fnData?.response || "Sorry, I couldn't generate a response.";
      // Fetch the saved assistant message from DB to get proper id/timestamps
      const { data: latestMessages } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convoId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (latestMessages?.[0]) {
        setMessages((prev) => [...prev, latestMessages[0]]);
      } else {
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: assistantContent }]);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setTyping(false);
    }
  }, [activeConvoId, user, queryClient]);

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage, sendMessageRef]);

  const loadConversation = async (id: string) => {
    setActiveConvoId(id);
    setShowConvos(false);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };

  const startNewChat = () => {
    setActiveConvoId(null);
    setMessages([]);
    setShowConvos(false);
    initialized.current = true;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const resetTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  };

  return (
    <>
      {/* Top bar */}
      <div className="border-b border-border px-4 py-3 flex items-center justify-between">
        <button
          onClick={startNewChat}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus size={16} />
          <span>New Chat</span>
        </button>

        <div className="relative">
          <button
            onClick={() => setShowConvos(!showConvos)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            History
            <ChevronDown size={14} className={`transition-transform ${showConvos ? "rotate-180" : ""}`} />
          </button>

          {showConvos && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowConvos(false)} />
              <div className="absolute right-0 top-8 z-20 w-64 max-h-72 overflow-y-auto rounded-md border border-border bg-background shadow-sm">
                {conversations.length === 0 ? (
                  <p className="p-3 text-xs text-muted-foreground">No conversations yet</p>
                ) : (
                  conversations.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => loadConversation(c.id)}
                      className={`w-full text-left px-3 py-2.5 text-xs border-b border-border last:border-0 hover:bg-secondary/50 transition-colors ${
                        c.id === activeConvoId ? "bg-secondary/50" : ""
                      }`}
                    >
                      <span className="block text-foreground truncate">{c.title || "Untitled"}</span>
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(new Date(c.updated_at), { addSuffix: true })}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !typing && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Start a conversation with Caselli</p>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground mr-2 mt-0.5">
                C
              </div>
            )}
            <div
              className={`text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-secondary rounded-2xl rounded-br-md px-4 py-2.5 max-w-[75%]"
                  : "max-w-[85%] text-foreground"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}

        {typing && (
          <div className="flex items-start">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground mr-2 mt-0.5">
              C
            </div>
            <TypingIndicator />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 z-10 border-t border-border bg-background px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask Caselli anything..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none max-h-[120px]"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim()}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-30"
          >
            <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </>
  );
};

export default ChatPanel;
