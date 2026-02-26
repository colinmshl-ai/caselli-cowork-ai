import { useState, useEffect, useRef, useCallback, MutableRefObject } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, ArrowUp, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ContentCardRenderer from "./ContentCardRenderer";
import CopyButton from "./CopyButton";
import EntityLinker from "./EntityLinker";
import type { ConversationContext } from "@/pages/Chat";

const DEAL_TOOLS = ["get_active_deals", "get_deal_details", "update_deal", "check_upcoming_deadlines", "create_deal"];
const CONTENT_TOOLS = ["draft_social_post", "draft_listing_description", "draft_email"];
const CONTACT_TOOLS = ["search_contacts", "add_contact", "update_contact"];

interface ChatPanelProps {
  pendingPrompt: string | null;
  onPromptConsumed: () => void;
  sendMessageRef: MutableRefObject<((msg: string) => void) | null>;
  onConversationContext?: (ctx: ConversationContext) => void;
}

const TypingIndicator = ({ status, completedTools }: { status: string; completedTools: string[] }) => (
  <div className="flex flex-wrap gap-1.5 px-2 py-1">
    {completedTools.map((tool, i) => (
      <span
        key={i}
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-accent text-accent-foreground animate-fade-in"
      >
        <span className="text-primary">✓</span>
        {tool}
      </span>
    ))}
    {status && (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary/10 text-primary">
        <span className="flex gap-0.5">
          <span className="h-1 w-1 rounded-full bg-primary animate-typing-dot" style={{ animationDelay: "0ms" }} />
          <span className="h-1 w-1 rounded-full bg-primary animate-typing-dot" style={{ animationDelay: "200ms" }} />
          <span className="h-1 w-1 rounded-full bg-primary animate-typing-dot" style={{ animationDelay: "400ms" }} />
        </span>
        {status}
      </span>
    )}
  </div>
);

function parseConversationContext(toolsUsed: { tool: string; description: string; deal_id?: string; contact_id?: string }[]): ConversationContext {
  const toolNames = toolsUsed.map((t) => t.tool);

  let topic: ConversationContext["topic"] = "general";
  let lastToolUsed: string | undefined;
  let lastDealId: string | undefined;
  let lastContactId: string | undefined;

  if (toolNames.some((t) => DEAL_TOOLS.includes(t))) {
    topic = "deals";
  } else if (toolNames.some((t) => CONTENT_TOOLS.includes(t))) {
    topic = "content";
  } else if (toolNames.some((t) => CONTACT_TOOLS.includes(t))) {
    topic = "contacts";
  }

  for (const t of toolsUsed) {
    if (t.tool) lastToolUsed = t.tool;
    if (t.deal_id) lastDealId = t.deal_id;
    if (t.contact_id) lastContactId = t.contact_id;
  }

  return { topic, lastToolUsed, lastDealId, lastContactId };
}

// Parse SSE events from a text buffer, returns [parsed events, remaining buffer]
function parseSSEBuffer(buffer: string): [{ event: string; data: string }[], string] {
  const events: { event: string; data: string }[] = [];
  const parts = buffer.split("\n\n");
  const remaining = parts.pop() || ""; // last part may be incomplete

  for (const part of parts) {
    if (!part.trim()) continue;
    let event = "message";
    let data = "";
    for (const line of part.split("\n")) {
      if (line.startsWith("event: ")) event = line.slice(7);
      else if (line.startsWith("data: ")) data = line.slice(6);
    }
    if (data) events.push({ event, data });
  }

  return [events, remaining];
}

const ChatPanel = ({ pendingPrompt, onPromptConsumed, sendMessageRef, onConversationContext }: ChatPanelProps) => {
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
  const [completedTools, setCompletedTools] = useState<string[]>([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Mobile keyboard handling via visualViewport
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      const kh = Math.max(0, window.innerHeight - vv.height);
      setKeyboardHeight(kh);
    };
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

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

    const [profileRes, dealsRes, taskRes] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).single(),
      supabase
        .from("deals")
        .select("*")
        .eq("user_id", user.id)
        .not("stage", "in", '("closed","fell_through")')
        .order("closing_date", { ascending: true }),
      supabase
        .from("task_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const fullName = profileRes.data?.full_name || "";
    const firstName = fullName.split(" ")[0] || "there";
    const deals = dealsRes.data || [];
    const tasks = taskRes.data || [];

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

    let content = greeting + ", " + firstName + "! ";

    if (deals.length === 0 && tasks.length === 0) {
      content += "I'm Caselli Cowork, your AI coworker. I've reviewed your business profile and I'm ready to help.\n\nHere are a few things I can do right now:\n\n";
      content += "- **Track your deals** and flag upcoming deadlines\n";
      content += "- **Draft social media posts** for your listings\n";
      content += "- **Write emails** in your voice to clients and vendors\n";
      content += "- **Manage your contacts** and follow-up reminders\n\n";
      content += "What would you like to tackle first?";
    } else {
      content += "Here's your quick briefing:\n\n";
      content += "**Pipeline:** " + deals.length + " active deal" + (deals.length !== 1 ? "s" : "") + "\n";

      const now = new Date();
      const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const nowStr = now.toISOString().split("T")[0];
      const threeDayStr = threeDays.toISOString().split("T")[0];

      const urgentDeadlines: { property: string; type: string; date: string }[] = [];
      for (const d of deals) {
        for (const [field, label] of [
          ["closing_date", "Closing"],
          ["inspection_deadline", "Inspection"],
          ["financing_deadline", "Financing"],
          ["appraisal_deadline", "Appraisal"],
        ] as const) {
          const val = (d as any)[field];
          if (val && val >= nowStr && val <= threeDayStr) {
            urgentDeadlines.push({ property: d.property_address, type: label, date: val });
          }
        }
      }

      if (urgentDeadlines.length > 0) {
        content += "\n**Urgent deadlines:**\n";
        for (const dl of urgentDeadlines) {
          content += "- " + dl.type + " for " + dl.property + " on " + dl.date + "\n";
        }
      }

      content += "\nWhat would you like to focus on?";
    }

    const { data: convo, error: convoErr } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title: greeting + " briefing" })
      .select()
      .single();
    if (convoErr || !convo) return;

    const { data: msg } = await supabase
      .from("messages")
      .insert({ conversation_id: convo.id, role: "assistant", content })
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

  // Main send function with SSE streaming
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !user) return;

    let convoId = activeConvoId;

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

    const userMsg = { conversation_id: convoId, role: "user", content: text.trim() };
    const { data: savedUser } = await supabase.from("messages").insert(userMsg).select().single();
    if (savedUser) setMessages((prev) => [...prev, savedUser]);

    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", convoId);

    setInput("");
    resetTextarea();
    setTypingStatus("Thinking...");

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ conversation_id: convoId, message: text.trim() }),
      });

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream") && response.body) {
        // SSE streaming path
        const placeholderId = crypto.randomUUID();
        setMessages((prev) => [...prev, { id: placeholderId, role: "assistant", content: "" }]);
        setTypingStatus("");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";
        const streamingContentRef = { current: "" };
        let toolsUsed: { tool: string; description: string }[] = [];
        let lastDealIdFromDone: string | undefined;
        let lastContactIdFromDone: string | undefined;
        let errorSeen = false;
        let updateScheduled = false;

        const scheduleUpdate = () => {
          if (updateScheduled) return;
          updateScheduled = true;
          requestAnimationFrame(() => {
            updateScheduled = false;
            const content = streamingContentRef.current;
            setMessages((prev) =>
              prev.map((m) => (m.id === placeholderId ? { ...m, content } : m))
            );
          });
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const [events, remaining] = parseSSEBuffer(sseBuffer);
          sseBuffer = remaining;

          for (const evt of events) {
            switch (evt.event) {
              case "text_delta": {
                const parsed = JSON.parse(evt.data);
                streamingContentRef.current += parsed.text;
                scheduleUpdate();
                break;
              }
              case "tool_status": {
                const parsed = JSON.parse(evt.data);
                setTypingStatus((prev) => {
                  if (prev && prev !== "Thinking...") {
                    setCompletedTools((ct) => [...ct, prev.replace("...", " - done")]);
                  }
                  return parsed.status;
                });
                break;
              }
              case "done": {
                const parsed = JSON.parse(evt.data);
                toolsUsed = parsed.tools_used || [];
                // Capture entity IDs from done event
                lastDealIdFromDone = parsed.last_deal_id || undefined;
                lastContactIdFromDone = parsed.last_contact_id || undefined;
                if (lastDealIdFromDone || lastContactIdFromDone) {
                  const ctx = parseConversationContext(toolsUsed);
                  ctx.lastDealId = lastDealIdFromDone;
                  ctx.lastContactId = lastContactIdFromDone;
                  onConversationContext?.(ctx);
                }
                break;
              }
              case "error": {
                const parsed = JSON.parse(evt.data);
                errorSeen = true;
                streamingContentRef.current = parsed.message || "Something went wrong.";
                scheduleUpdate();
                break;
              }
            }
          }
        }

        // Final content update
        const finalContent = streamingContentRef.current || (errorSeen ? "Something went wrong. Please try again." : "I wasn't able to generate a response.");
        const entityIds = {
          lastDealId: lastDealIdFromDone,
          lastContactId: lastContactIdFromDone,
        };
        setMessages((prev) =>
          prev.map((m) => (m.id === placeholderId ? { ...m, content: finalContent, ...entityIds } : m))
        );

        // Fetch the saved message from DB to get the real ID
        const { data: latestMessages } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", convoId)
          .eq("role", "assistant")
          .order("created_at", { ascending: false })
          .limit(1);

        if (latestMessages?.[0]) {
          setMessages((prev) =>
            prev.map((m) => (m.id === placeholderId ? latestMessages[0] : m))
          );
        }

        // Invalidate activity panel queries
        queryClient.invalidateQueries({ queryKey: ["activity-deals"] });
        queryClient.invalidateQueries({ queryKey: ["activity-tasks"] });

        // Update conversation context
        if (toolsUsed.length > 0) {
          const ctx = parseConversationContext(toolsUsed);
          onConversationContext?.(ctx);
        }
      } else {
        // Fallback: JSON response (non-streaming)
        const fnData = await response.json();
        if (!response.ok) throw new Error(fnData.error || "Request failed");

        const toolsUsed: { tool: string; description: string }[] = fnData?.tools_used || [];
        for (const t of toolsUsed) {
          setTypingStatus(t.description);
          await new Promise((r) => setTimeout(r, 600));
        }

        const ctx = parseConversationContext(toolsUsed);
        onConversationContext?.(ctx);

        const assistantContent = fnData?.response || "Sorry, I couldn't generate a response.";
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
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setTypingStatus("");
      setCompletedTools([]);
    }
  }, [activeConvoId, user, queryClient, onConversationContext]);

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
    onConversationContext?.({ topic: "general" });
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
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight : undefined }}>
        {messages.length === 0 && !typingStatus && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Start a conversation with Caselli Cowork</p>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex animate-fade-in-up ${m.role === "user" ? "justify-end" : "justify-start"}`}>
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
                  <EntityLinker dealId={m.lastDealId} contactId={m.lastContactId}>
                    <ContentCardRenderer content={m.content} onAction={sendMessage} />
                  </EntityLinker>
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

        {(typingStatus || completedTools.length > 0) && (
          <div className="flex items-start">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground mr-2 mt-0.5">
              C
            </div>
            <TypingIndicator status={typingStatus} completedTools={completedTools} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 z-10 bg-background px-4 py-3 pb-safe">
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 shadow-sm transition-shadow focus-within:ring-1 focus-within:ring-ring">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask Caselli Cowork anything..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none max-h-[120px]"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-30"
          >
            <ArrowUp size={15} />
          </button>
        </div>
      </div>
    </>
  );
};

export default ChatPanel;
