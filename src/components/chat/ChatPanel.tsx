import { useState, useEffect, useRef, useCallback, MutableRefObject } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, ArrowUp, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ContentCardRenderer from "./ContentCardRenderer";
import CopyButton from "./CopyButton";

interface ChatPanelProps {
  pendingPrompt: string | null;
  onPromptConsumed: () => void;
  sendMessageRef: MutableRefObject<((msg: string) => void) | null>;
}

const TypingIndicator = ({ status }: { status: string }) => (
  <div className="flex items-center gap-1 px-2 py-1">
    <span className="text-sm text-muted-foreground animate-pulse">
      {status}
    </span>
  </div>
);

const WELCOME_TEMPLATE = (firstName: string) =>
  `Hey ${firstName}! I'm Caselli, your AI coworker. I've reviewed your business profile and I'm ready to help. Here are a few things I can do right now:\n\n- **Draft social media posts** for your listings\n- **Track your deals** and flag upcoming deadlines\n- **Write emails** in your voice to clients and vendors\n- **Manage your contacts** and follow-up reminders\n\nWhat would you like to tackle first?`;

const ChatPanel = ({ pendingPrompt, onPromptConsumed, sendMessageRef }: ChatPanelProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [typingStatus, setTypingStatus] = useState("");
  const [showConvos, setShowConvos] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialized = useRef(false);
  const welcomeSent = useRef(false);

  // Fetch conversations
  const { data: conversations = [], isSuccess: convosLoaded } = useQuery({
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

  // Load most recent conversation on mount OR send welcome message
  useEffect(() => {
    if (!convosLoaded || !user || initialized.current) return;

    if (conversations.length > 0) {
      initialized.current = true;
      loadConversation(conversations[0].id);
    } else if (!welcomeSent.current) {
      welcomeSent.current = true;
      initialized.current = true;
      sendWelcomeMessage();
    }
  }, [convosLoaded, conversations, user]);

  const sendWelcomeMessage = async () => {
    if (!user) return;

    // Fetch first name from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const fullName = profile?.full_name || "";
    const firstName = fullName.split(" ")[0] || "there";

    // Create welcome conversation
    const { data: convo, error: convoErr } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title: "Welcome" })
      .select()
      .single();
    if (convoErr || !convo) return;

    // Insert welcome message
    const welcomeContent = WELCOME_TEMPLATE(firstName);
    const { data: msg } = await supabase
      .from("messages")
      .insert({ conversation_id: convo.id, role: "assistant", content: welcomeContent })
      .select()
      .single();

    setActiveConvoId(convo.id);
    if (msg) setMessages([msg]);
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingStatus]);

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
    setTypingStatus("Thinking...");
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("chat", {
        body: { conversation_id: convoId, message: text.trim() },
      });

      if (fnError) throw fnError;

      // Flash tool descriptions sequentially
      const toolsUsed: { tool: string; description: string }[] = fnData?.tools_used || [];
      for (const t of toolsUsed) {
        setTypingStatus(t.description);
        await new Promise((r) => setTimeout(r, 600));
      }

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
      setTypingStatus("");
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
        {messages.length === 0 && !typingStatus && (
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
                  : "max-w-[85%] text-foreground group relative"
              }`}
            >
              {m.role === "assistant" ? (
                <>
                  <ContentCardRenderer content={m.content} />
                  <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <CopyButton text={m.content} />
                  </div>
                </>
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
          </div>
        ))}

        {typingStatus && (
          <div className="flex items-start">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground mr-2 mt-0.5">
              C
            </div>
            <TypingIndicator status={typingStatus} />
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
