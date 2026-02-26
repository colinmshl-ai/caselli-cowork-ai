import { useState, useEffect, useRef, useCallback, MutableRefObject } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, ArrowUp, Clock, Search } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import ContentCardRenderer from "./ContentCardRenderer";

import EntityLinker from "./EntityLinker";
import SuggestionChips from "./SuggestionChips";
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
  <div className="flex flex-wrap gap-1.5 py-2">
    {completedTools.map((tool, i) => (
      <span
        key={i}
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-accent/10 text-accent-foreground animate-fade-in"
      >
        <span className="text-primary">✓</span>
        {tool}
      </span>
    ))}
    {status && (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary">
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
  const [convoSearch, setConvoSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialized = useRef(false);
  const welcomeSent = useRef(false);
  const [completedTools, setCompletedTools] = useState<string[]>([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [lastToolUsed, setLastToolUsed] = useState<string | undefined>();
  const [lastTopic, setLastTopic] = useState<string | undefined>();

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

    const [profileRes, dealsRes, taskRes, lastConvoRes] = await Promise.all([
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
      supabase
        .from("conversations")
        .select("title")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1),
    ]);

    const fullName = profileRes.data?.full_name || "";
    const firstName = fullName.split(" ")[0] || "there";
    const deals = dealsRes.data || [];
    const tasks = taskRes.data || [];
    const lastConvoTitle = lastConvoRes.data?.[0]?.title;

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

    let content = greeting + ", " + firstName + "! ";

    // Reference last session if available
    if (lastConvoTitle && (deals.length > 0 || tasks.length > 0)) {
      content += `Last time we worked on **${lastConvoTitle}**. `;
    }

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

      // Reference recent tasks
      if (tasks.length > 0) {
        content += "\n**Recent activity:**\n";
        for (const t of tasks.slice(0, 3)) {
          content += "- " + (t.description || t.task_type) + "\n";
        }
      }

      content += "\nWant to continue where we left off, or start something new?";
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
    setLastToolUsed(undefined);
    setLastTopic(undefined);
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
        let firstDeltaReceived = false;
        setMessages((prev) => [...prev, { id: placeholderId, role: "assistant", content: "" }]);

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
                if (!firstDeltaReceived) {
                  firstDeltaReceived = true;
                  setTypingStatus("");
                }
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
          setLastToolUsed(ctx.lastToolUsed);
          setLastTopic(ctx.topic);
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
        setLastToolUsed(ctx.lastToolUsed);
        setLastTopic(ctx.topic);
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
      <div className="px-4 py-3.5 flex items-center justify-between shadow-sm relative z-10">
        {/* History button — left */}
        <Sheet open={showConvos} onOpenChange={(open) => { setShowConvos(open); if (!open) setConvoSearch(""); }}>
          <SheetTrigger asChild>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <Clock size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">History</TooltipContent>
            </Tooltip>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
              <SheetTitle className="text-sm font-semibold">Conversations</SheetTitle>
              <div className="relative mt-2">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={convoSearch}
                  onChange={(e) => setConvoSearch(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full rounded-md border border-border bg-transparent pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
              </div>
            </SheetHeader>
            <div className="overflow-y-auto max-h-[calc(100vh-120px)]">
              {conversations.length === 0 ? (
                <p className="p-4 text-xs text-muted-foreground">No conversations yet</p>
              ) : (
                conversations
                  .filter((c) => !convoSearch || (c.title || "").toLowerCase().includes(convoSearch.toLowerCase()))
                  .map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { loadConversation(c.id); setShowConvos(false); setConvoSearch(""); }}
                      className={`w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-secondary/50 transition-colors ${
                        c.id === activeConvoId ? "bg-secondary/50" : ""
                      }`}
                    >
                      <span className="block text-sm text-foreground truncate">{c.title || "Untitled"}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(c.updated_at), { addSuffix: true })}
                      </span>
                    </button>
                  ))
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Centered title */}
        <div className="absolute left-1/2 -translate-x-1/2 max-w-[60%]">
          {(() => {
            const activeConvo = conversations.find((c) => c.id === activeConvoId);
            const title = activeConvo?.title;
            if (!title) return <span className="text-sm text-muted-foreground italic">New conversation</span>;
            const truncated = title.length > 30 ? title.slice(0, 30) + "…" : title;
            return <span className="text-sm font-medium text-foreground truncate block">{truncated}</span>;
          })()}
        </div>

        {/* New chat — right */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={startNewChat}
              className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus size={16} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">New chat</TooltipContent>
        </Tooltip>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 md:space-y-8" style={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight : undefined }}>
        {messages.length === 0 && !typingStatus && (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <p className="text-sm text-muted-foreground">Start a conversation with Caselli Cowork</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md w-full">
              {[
                "I just got a new listing at...",
                "Draft a social post for...",
                "Give me a pipeline overview",
                "Help me follow up with a client",
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-left text-sm px-4 py-3 rounded-lg border border-border bg-card hover:bg-secondary/50 text-foreground transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, idx) => (
          <div key={m.id} className={`flex animate-fade-in-up ${m.role === "user" ? "justify-end" : "justify-start"} ${m.role === "assistant" && idx > 0 && messages[idx - 1]?.role === "user" ? "mt-2" : ""}`}>
            <div
              className={`text-sm leading-relaxed ${
                m.role === "user"
                  ? "border border-border bg-transparent rounded-xl px-4 py-2.5 max-w-[70%]"
                  : "max-w-[85%] md:max-w-[95%] text-foreground"
              }`}
            >
              {m.role === "assistant" ? (
                <EntityLinker dealId={m.lastDealId} contactId={m.lastContactId}>
                  <ContentCardRenderer content={m.content} onAction={sendMessage} />
                </EntityLinker>
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
          </div>
        ))}

        {/* Starter prompts below welcome message when no user messages yet */}
        {messages.length > 0 && messages.every((m) => m.role === "assistant") && !typingStatus && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md">
            {[
              "I just got a new listing at...",
              "Draft a social post for...",
              "Give me a pipeline overview",
              "Help me follow up with a client",
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="text-left text-sm px-4 py-3 rounded-lg border border-border bg-card hover:bg-secondary/50 text-foreground transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {(typingStatus || completedTools.length > 0) && (
          <TypingIndicator status={typingStatus} completedTools={completedTools} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion chips */}
      {!typingStatus && messages.length > 0 && (
        <SuggestionChips
          lastToolUsed={lastToolUsed}
          topic={lastTopic}
          onSend={sendMessage}
        />
      )}

      {/* Input */}
      <div className="sticky bottom-0 z-10 bg-background px-4 py-3 pb-safe border-t border-border">
        <div className="flex items-end gap-2 rounded-2xl border border-transparent bg-secondary/50 px-5 py-3 transition-all focus-within:border-border focus-within:bg-card">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask Caselli Cowork anything..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none max-h-[120px] min-h-[44px] md:min-h-0"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim()}
            className={`flex h-9 w-9 shrink-0 items-center justify-center transition-colors ${input.trim() ? "text-primary" : "text-muted-foreground"}`}
          >
            <ArrowUp size={20} />
          </button>
        </div>
      </div>
    </>
  );
};

export default ChatPanel;
