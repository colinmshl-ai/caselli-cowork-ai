import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOOLS = [
  {
    name: "get_active_deals",
    description: "Get all active deals for this agent including property address, client name, stage, and all deadline dates. Use when the agent asks about their deals, pipeline, or workload.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_deal_details",
    description: "Get full details for a specific deal. Use when discussing a specific property or transaction.",
    input_schema: { type: "object", properties: { deal_id: { type: "string" } }, required: ["deal_id"] },
  },
  {
    name: "update_deal",
    description: "Update a deal's stage, dates, price, or notes. Use when the agent tells you about a status change or updated information.",
    input_schema: {
      type: "object",
      properties: {
        deal_id: { type: "string" },
        stage: { type: "string" },
        closing_date: { type: "string" },
        inspection_deadline: { type: "string" },
        financing_deadline: { type: "string" },
        appraisal_deadline: { type: "string" },
        contract_price: { type: "number" },
        notes: { type: "string" },
      },
      required: ["deal_id"],
    },
  },
  {
    name: "check_upcoming_deadlines",
    description: "Check for deal deadlines in the next 7 days. Use proactively when the agent asks what to focus on or about their schedule.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "create_deal",
    description: "Create a new deal when the agent mentions a new listing, buyer, or transaction. ALWAYS infer deal_type from context: if the agent says 'listing', 'listed', or 'seller' it is a seller deal. If they say 'buyer', 'looking for', or 'making an offer' it is a buyer deal. Default stage to 'lead' for new mentions, 'active_client' if they mention an existing relationship, 'under_contract' if they mention a signed contract. Extract list_price from any dollar amount mentioned.",
    input_schema: {
      type: "object",
      properties: {
        property_address: { type: "string" },
        client_name: { type: "string" },
        client_email: { type: "string" },
        deal_type: { type: "string", enum: ["buyer", "seller"] },
        stage: { type: "string" },
        list_price: { type: "number" },
        notes: { type: "string" },
      },
      required: ["property_address"],
    },
  },
  {
    name: "draft_social_post",
    description: "Draft a social media post. Default to Instagram unless the agent specifies otherwise. ALWAYS include 5-8 relevant hashtags. Include emojis appropriate to the platform. Types: new_listing, just_sold, open_house, market_update, tip, testimonial. Match the agent's brand voice exactly. After drafting, ask: Want me to adjust anything or adapt this for another platform?",
    input_schema: {
      type: "object",
      properties: {
        post_type: { type: "string" },
        property_address: { type: "string" },
        details: { type: "string" },
        platform: { type: "string", enum: ["instagram", "facebook", "linkedin"] },
      },
      required: ["post_type"],
    },
  },
  {
    name: "draft_listing_description",
    description: "Draft a listing description for MLS or marketing. Follow Fair Housing — property features only. After drafting, ask: 'Want me to adjust anything, or is this good to go?'",
    input_schema: {
      type: "object",
      properties: {
        property_address: { type: "string" },
        bedrooms: { type: "number" },
        bathrooms: { type: "number" },
        sqft: { type: "number" },
        features: { type: "string" },
        style: { type: "string", enum: ["mls_short", "mls_full", "marketing"] },
      },
      required: ["property_address"],
    },
  },
  {
    name: "draft_email",
    description: "Draft an email. Before drafting, ALWAYS use search_contacts to look up the recipient and pull their email address. Types: follow_up, check_in, congratulations, introduction, status_update, vendor_coordination. Match brand voice. Include proper email headers (To, Subject) in the output. After drafting, ask: Want me to adjust anything?",
    input_schema: {
      type: "object",
      properties: {
        email_type: { type: "string" },
        recipient_name: { type: "string" },
        recipient_role: { type: "string" },
        context: { type: "string" },
        deal_id: { type: "string" },
      },
      required: ["email_type", "recipient_name"],
    },
  },
  {
    name: "search_contacts",
    description: "Search contacts by name, email, or company. Use this PROACTIVELY before drafting emails or creating deals that mention a person by name. Return all matching results so the AI can reference the correct contact.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "add_contact",
    description: "Add a new contact — lead, client, vendor, or other professional.",
    input_schema: {
      type: "object",
      properties: {
        full_name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        contact_type: { type: "string" },
        company: { type: "string" },
        notes: { type: "string" },
      },
      required: ["full_name"],
    },
  },
  {
    name: "update_contact",
    description: "Update an existing contact's information.",
    input_schema: {
      type: "object",
      properties: {
        contact_id: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        contact_type: { type: "string" },
        company: { type: "string" },
        notes: { type: "string" },
      },
      required: ["contact_id"],
    },
  },
];

async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  userId: string,
  adminClient: ReturnType<typeof createClient>
): Promise<{ result: unknown; taskType: string; taskDescription: string }> {
  switch (toolName) {
    case "get_active_deals": {
      const { data } = await adminClient
        .from("deals")
        .select("*")
        .eq("user_id", userId)
        .not("stage", "in", '("closed","fell_through")')
        .order("closing_date", { ascending: true });
      return {
        result: data || [],
        taskType: "deal_lookup",
        taskDescription: "Looked up active deals",
      };
    }
    case "get_deal_details": {
      const { data } = await adminClient
        .from("deals")
        .select("*")
        .eq("id", toolInput.deal_id as string)
        .eq("user_id", userId)
        .single();
      return {
        result: data || { error: "Deal not found" },
        taskType: "deal_lookup",
        taskDescription: `Looked up deal details for ${data?.property_address || toolInput.deal_id}`,
      };
    }
    case "update_deal": {
      const { deal_id, ...updates } = toolInput;
      const cleanUpdates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(updates)) {
        if (v !== undefined && v !== null) cleanUpdates[k] = v;
      }
      cleanUpdates.updated_at = new Date().toISOString();
      const { data, error } = await adminClient
        .from("deals")
        .update(cleanUpdates)
        .eq("id", deal_id as string)
        .eq("user_id", userId)
        .select()
        .single();
      return {
        result: error ? { error: error.message } : data,
        taskType: "deal_update",
        taskDescription: `Updated deal ${data?.property_address || deal_id}: ${Object.keys(cleanUpdates).filter(k => k !== "updated_at").join(", ")}`,
      };
    }
    case "check_upcoming_deadlines": {
      const now = new Date();
      const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const nowStr = now.toISOString().split("T")[0];
      const futureStr = sevenDays.toISOString().split("T")[0];
      const { data: deals } = await adminClient
        .from("deals")
        .select("*")
        .eq("user_id", userId)
        .not("stage", "in", '("closed","fell_through")');

      const deadlines: { property: string; deadline_type: string; date: string }[] = [];
      for (const d of deals || []) {
        for (const [field, label] of [
          ["closing_date", "Closing"],
          ["inspection_deadline", "Inspection"],
          ["financing_deadline", "Financing"],
          ["appraisal_deadline", "Appraisal"],
        ] as const) {
          const val = d[field];
          if (val && val >= nowStr && val <= futureStr) {
            deadlines.push({ property: d.property_address, deadline_type: label, date: val });
          }
        }
      }
      deadlines.sort((a, b) => a.date.localeCompare(b.date));
      return {
        result: deadlines,
        taskType: "deadline_check",
        taskDescription: `Checked upcoming deadlines — ${deadlines.length} found`,
      };
    }
    case "create_deal": {
      const { data, error } = await adminClient
        .from("deals")
        .insert({ user_id: userId, ...toolInput })
        .select()
        .single();
      return {
        result: error ? { error: error.message } : data,
        taskType: "deal_create",
        taskDescription: `Created new deal: ${toolInput.property_address}`,
      };
    }
    case "draft_social_post":
    case "draft_listing_description":
    case "draft_email": {
      let context: Record<string, unknown> = { success: true, ...toolInput };
      if (toolInput.deal_id) {
        const { data: deal } = await adminClient
          .from("deals")
          .select("*")
          .eq("id", toolInput.deal_id as string)
          .eq("user_id", userId)
          .single();
        if (deal) context.deal = deal;
      }
      return {
        result: context,
        taskType: "content_drafted",
        taskDescription: `Drafted ${toolName.replace("draft_", "")}: ${toolInput.post_type || toolInput.style || toolInput.email_type || ""}`.trim(),
      };
    }
    case "search_contacts": {
      const q = `%${toolInput.query as string}%`;
      const { data } = await adminClient
        .from("contacts")
        .select("*")
        .eq("user_id", userId)
        .or(`full_name.ilike.${q},email.ilike.${q},company.ilike.${q}`);
      return {
        result: data || [],
        taskType: "contact_lookup",
        taskDescription: `Searched contacts for "${toolInput.query}"`,
      };
    }
    case "add_contact": {
      const { data, error } = await adminClient
        .from("contacts")
        .insert({ user_id: userId, ...toolInput })
        .select()
        .single();
      return {
        result: error ? { error: error.message } : data,
        taskType: "contact_updated",
        taskDescription: `Added contact: ${toolInput.full_name}`,
      };
    }
    case "update_contact": {
      const { contact_id, ...updates } = toolInput;
      const cleanUpdates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(updates)) {
        if (v !== undefined && v !== null) cleanUpdates[k] = v;
      }
      const { data, error } = await adminClient
        .from("contacts")
        .update(cleanUpdates)
        .eq("id", contact_id as string)
        .eq("user_id", userId)
        .select()
        .single();
      return {
        result: error ? { error: error.message } : data,
        taskType: "contact_updated",
        taskDescription: `Updated contact: ${data?.full_name || contact_id}`,
      };
    }
    default:
      return { result: { error: "Unknown tool" }, taskType: "unknown", taskDescription: "Unknown tool called" };
  }
}

const TOOL_DESCRIPTIONS: Record<string, string> = {
  get_active_deals: "Looking up your deals...",
  get_deal_details: "Pulling deal details...",
  update_deal: "Updating your deal...",
  check_upcoming_deadlines: "Checking your deadlines...",
  create_deal: "Creating a new deal...",
  draft_social_post: "Drafting a social post...",
  draft_listing_description: "Writing a listing description...",
  draft_email: "Drafting an email...",
  search_contacts: "Searching your contacts...",
  add_contact: "Adding a new contact...",
  update_contact: "Updating contact info...",
};

const encoder = new TextEncoder();

function sendSSE(controller: ReadableStreamDefaultController, event: string, data: object) {
  controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
}

async function parseAnthropicStream(
  response: Response,
  controller: ReadableStreamDefaultController,
  onText: (text: string) => void,
  onToolUse: (tool: { id: string; name: string; input: Record<string, unknown> }) => void,
): Promise<"end_turn" | "tool_use"> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentToolId = "";
  let currentToolName = "";
  let currentToolInput = "";
  let stopReason: "end_turn" | "tool_use" = "end_turn";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6);
      if (jsonStr === "[DONE]") continue;

      let event;
      try {
        event = JSON.parse(jsonStr);
      } catch {
        continue;
      }

      switch (event.type) {
        case "content_block_start":
          if (event.content_block?.type === "tool_use") {
            currentToolId = event.content_block.id;
            currentToolName = event.content_block.name;
            currentToolInput = "";
          }
          break;

        case "content_block_delta":
          if (event.delta?.type === "text_delta") {
            const text = event.delta.text;
            onText(text);
            sendSSE(controller, "text_delta", { text });
          } else if (event.delta?.type === "input_json_delta") {
            currentToolInput += event.delta.partial_json;
          }
          break;

        case "content_block_stop":
          if (currentToolId) {
            let parsedInput: Record<string, unknown> = {};
            try {
              if (currentToolInput) parsedInput = JSON.parse(currentToolInput);
            } catch { /* empty input */ }
            onToolUse({ id: currentToolId, name: currentToolName, input: parsedInput });
            currentToolId = "";
            currentToolName = "";
            currentToolInput = "";
          }
          break;

        case "message_delta":
          if (event.delta?.stop_reason) {
            stopReason = event.delta.stop_reason;
          }
          break;
      }
    }
  }

  return stopReason;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { conversation_id, message } = await req.json();
    if (!conversation_id || !message) {
      return new Response(JSON.stringify({ error: "Missing conversation_id or message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch context in parallel
    const [profileRes, memoryRes, historyRes, recentActivityRes, lastConvoRes] = await Promise.all([
      userClient.from("business_profiles").select("*").eq("user_id", userId).maybeSingle(),
      userClient.from("memory_facts").select("fact").eq("user_id", userId).order("created_at", { ascending: false }).limit(25),
      userClient.from("messages").select("role, content, metadata, tool_results").eq("conversation_id", conversation_id).order("created_at", { ascending: true }),
      userClient.from("task_history").select("task_type, description, metadata, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
      userClient.from("conversations").select("title, id").eq("user_id", userId).order("updated_at", { ascending: false }).limit(1),
    ]);

    const profile = profileRes.data;
    const memoryFacts = memoryRes.data || [];
    const history = historyRes.data || [];
    const recentActivity = recentActivityRes.data || [];
    const lastConvo = lastConvoRes.data?.[0];

    // Build system prompt
    let systemPrompt = `You are Caselli, a sharp, proactive real estate AI coworker. You anticipate needs, not just respond to requests. When an agent mentions a listing, you automatically think about what marketing materials they'll need, what deadlines to track, and who to notify. You speak in the agent's chosen brand tone at all times.\n\n`;

    if (profile) {
      const fields: [string, string | null | undefined][] = [
        ["Business Name", profile.business_name],
        ["Brokerage", profile.brokerage_name],
        ["Market Area", profile.market_area],
        ["Specialties", profile.specialties?.join(", ")],
        ["Team Size", profile.team_size],
        ["Brand Voice", profile.brand_tone],
        ["Brand Voice Sample", profile.brand_voice_notes],
        ["Preferred Title Company", profile.preferred_title_company],
        ["Preferred Inspector", profile.preferred_inspector],
        ["Preferred Photographer", profile.preferred_photographer],
        ["Preferred Lender", profile.preferred_lender],
      ];
      const agentLines = fields.filter(([, v]) => v && v.trim()).map(([l, v]) => `${l}: ${v}`);
      if (agentLines.length > 0) {
        systemPrompt += `ABOUT THE AGENT YOU WORK WITH:\n${agentLines.join("\n")}\n\n`;
      }
    }

    if (memoryFacts.length > 0) {
      systemPrompt += `THINGS I REMEMBER FROM PAST CONVERSATIONS:\n${memoryFacts.map((m) => `- ${m.fact}`).join("\n")}\n\n`;
    }

    // Add recent activity context for cross-conversation continuity
    if (recentActivity.length > 0) {
      systemPrompt += `RECENT ACTIVITY (last actions across all conversations):\n`;
      for (const activity of recentActivity) {
        const meta = activity.metadata as Record<string, unknown> | null;
        const toolName = meta?.tool || activity.task_type;
        const inputSummary = meta?.input ? Object.entries(meta.input as Record<string, unknown>).filter(([, v]) => v).map(([k, v]) => `${k}="${v}"`).join(", ") : "";
        systemPrompt += `- ${activity.description || toolName}${inputSummary ? ` (${inputSummary})` : ""}\n`;
      }
      systemPrompt += `\n`;
    }

    if (lastConvo && lastConvo.id !== conversation_id && lastConvo.title) {
      systemPrompt += `LAST CONVERSATION CONTEXT: The user's most recent conversation was titled "${lastConvo.title}". Reference this naturally if relevant.\n\n`;
    }

    systemPrompt += `YOUR PERSONALITY AND BEHAVIOR:
- You are a sharp, proactive coworker, not a chatbot. Think two steps ahead.
- After completing ANY task, always suggest 1-2 logical next steps without being asked.
- When you create a deal, immediately offer: "Want me to draft a welcome email to the client?" or "Should I check if we have their contact info on file?"
- When you draft content, offer to adapt it for other platforms or draft a follow-up.
- When you check deadlines, proactively flag anything within 48 hours as urgent and suggest action items.
- If a deal has been in the same stage for a long time, mention it.
- Speak in real estate terminology naturally. Do not explain basic terms like CMA, DOM, PSA, contingency.
- Keep responses concise and actionable. Agents are busy.
- When drafting content or communications, always match the agent's brand voice.
- After completing any task, suggest 2-3 logical next steps. Examples:
  - After creating a deal → suggest drafting marketing materials, setting up deadline reminders, and notifying the client
  - After drafting a social post → suggest creating versions for other platforms, scheduling the post, and drafting a matching email blast
  - After adding a contact → suggest drafting an intro email, linking them to an existing deal, and setting a follow-up reminder

YOUR CAPABILITIES AND HOW TO USE THEM:
- You have tools to manage deals, contacts, and draft content. USE THEM PROACTIVELY.
- When the agent mentions a person by name, automatically search contacts to see if they exist before asking.
- When the agent mentions a property address, check if there is already a deal for it.
- When creating a deal, also offer to add the client as a contact if they are not already in the system.
- When drafting an email, always populate the To field with the recipient's name and pull their email from contacts if possible.
- Chain related actions: if the user says "I just got a new listing at 123 Main St from Sarah Chen", you should create the deal AND search/add the contact AND offer to draft a social post, all in one flow.
- Always present drafted content in a clean format and ask "Want me to adjust anything, or is this good to go?"

MEMORY AWARENESS:
- Reference the agent's business context naturally. Use their brokerage name, market area, specialties, and preferred vendors in responses.
- If they're in a luxury market, use elevated language. If they're in a first-time buyer market, use approachable language.
- Weave remembered facts from past conversations into your responses naturally — don't announce "I remember that..."

RULES:
- Always follow Fair Housing guidelines. No references to protected classes in any content.
- When writing listing descriptions, focus only on property features.
- If asked for legal advice, recommend consulting a broker or attorney.
- If asked something outside your expertise, say so honestly.
- Use your tools proactively. Do not wait to be explicitly asked if the context makes it obvious.
- After every response, think: "What would a great assistant do next?" and suggest it.
- Never give one-word or minimal answers. Always add value.

MULTI-ACTION BEHAVIOR:
- When a user request involves multiple related actions, execute them all in sequence using your tools.
- Example: "Add a new listing at 123 Oak Ave for buyer Mike Torres, list price 450k" should trigger: create_deal, then search_contacts for Mike Torres, then add_contact if not found, then offer to draft a social post.
- You have up to 5 tool calls per message. Use them.
- After completing a chain of actions, summarize everything you did in a clear list.`;

    const apiMessages = [
      ...history.map((m: { role: string; content: string; metadata?: { tools?: { tool: string; input: Record<string, unknown>; result_summary?: string }[] } }) => {
        let content = m.content;
        if (m.role === "assistant" && m.metadata?.tools) {
          const toolSummary = m.metadata.tools.map((t: { tool: string; input: Record<string, unknown>; result_summary?: string }) => {
            const inputParts = Object.entries(t.input || {}).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => `${k}="${v}"`).join(", ");
            const resultPart = t.result_summary ? ` → ${t.result_summary}` : "";
            return `[Used ${t.tool}: ${inputParts}${resultPart}]`;
          }).join("\n");
          content = toolSummary + "\n" + content;
        }
        return { role: m.role === "assistant" ? "assistant" : "user", content };
      }),
      { role: "user", content: message },
    ];

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullText = "";
          const toolsUsed: { tool: string; description: string }[] = [];
          const toolCallLog: { tool: string; input: Record<string, unknown>; result: unknown }[] = [];
          let currentMessages = [...apiMessages];
          let iterations = 0;
          let lastCreatedDealId: string | null = null;
          let lastCreatedContactId: string | null = null;

          while (iterations < 5) {
            iterations++;

            // Retry logic for Anthropic API
            let anthropicRes: Response | null = null;
            let retryCount = 0;
            const maxRetries = 2;

            while (retryCount <= maxRetries) {
              anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                  "x-api-key": ANTHROPIC_API_KEY,
                  "anthropic-version": "2023-06-01",
                  "content-type": "application/json",
                },
                body: JSON.stringify({
                  model: "claude-sonnet-4-20250514",
                  system: systemPrompt,
                  messages: currentMessages,
                  tools: TOOLS,
                  max_tokens: 4096,
                  stream: true,
                }),
              });

              if (anthropicRes.ok) break;

              const errText = await anthropicRes.text();

              // Rate limit or overloaded — retry after delay
              if ((anthropicRes.status === 429 || anthropicRes.status === 529) && retryCount < maxRetries) {
                console.warn(`Anthropic ${anthropicRes.status}, retry ${retryCount + 1}/${maxRetries}`);
                retryCount++;
                await new Promise((r) => setTimeout(r, 2000));
                continue;
              }

              // Context window too long — trim and retry once
              if (anthropicRes.status === 400 && errText.toLowerCase().includes("context window") && retryCount === 0) {
                console.warn("Context window exceeded, trimming to last 10 messages");
                currentMessages = currentMessages.slice(-10);
                retryCount++;
                continue;
              }

              // Non-retryable error
              let userMessage = "Something went wrong. Please try again.";
              if (anthropicRes.status === 429 || anthropicRes.status === 529) {
                userMessage = "I'm handling a lot of requests right now. Please try again in a moment.";
              } else if (anthropicRes.status === 400 && errText.toLowerCase().includes("context window")) {
                userMessage = "This conversation is getting long. Starting a new chat may help.";
              }
              console.error("Anthropic API error:", errText);
              sendSSE(controller, "error", { message: userMessage });
              controller.close();
              return;
            }

            if (!anthropicRes || !anthropicRes.ok) {
              sendSSE(controller, "error", { message: "Something went wrong. Please try again." });
              controller.close();
              return;
            }

            // Collect tool calls and text from this stream iteration
            let iterationText = "";
            const iterationToolCalls: { id: string; name: string; input: Record<string, unknown> }[] = [];

            const stopReason = await parseAnthropicStream(
              anthropicRes,
              controller,
              (text) => {
                iterationText += text;
                fullText += text;
              },
              (tool) => {
                iterationToolCalls.push(tool);
              },
            );

            if (stopReason === "tool_use" && iterationToolCalls.length > 0) {
              // Build assistant content blocks for the conversation
              const assistantContent: unknown[] = [];
              if (iterationText) {
                assistantContent.push({ type: "text", text: iterationText });
              }
              for (const tool of iterationToolCalls) {
                assistantContent.push({
                  type: "tool_use",
                  id: tool.id,
                  name: tool.name,
                  input: tool.input,
                });
              }

              currentMessages.push({ role: "assistant", content: assistantContent });

              // Execute tools and send status events
              const toolResults: { type: string; tool_use_id: string; content: string }[] = [];
              for (const tool of iterationToolCalls) {
                const desc = TOOL_DESCRIPTIONS[tool.name] || "Working on it...";
                const toolEntry: { tool: string; description: string; deal_id?: string; contact_id?: string } = { tool: tool.name, description: desc };
                if (tool.input?.deal_id) toolEntry.deal_id = tool.input.deal_id;
                if (tool.input?.contact_id) toolEntry.contact_id = tool.input.contact_id;
                toolsUsed.push(toolEntry);
                sendSSE(controller, "tool_status", { tool: tool.name, status: desc });

                const { result, taskType, taskDescription } = await executeTool(
                  tool.name,
                  tool.input,
                  userId,
                  adminClient
                );

                toolCallLog.push({ tool: tool.name, input: tool.input, result });

                // Track entity IDs from tool results
                if (result && typeof result === "object" && !Array.isArray(result)) {
                  const r = result as Record<string, unknown>;
                  if (tool.name === "create_deal" && r.id) lastCreatedDealId = r.id as string;
                  if (tool.name === "add_contact" && r.id) lastCreatedContactId = r.id as string;
                  if (tool.name === "get_deal_details" && r.id) lastCreatedDealId = r.id as string;
                }
                if (tool.name === "search_contacts" && Array.isArray(result) && result.length > 0) {
                  lastCreatedContactId = (result[0] as Record<string, unknown>).id as string;
                }

                // Log to task_history
                await adminClient.from("task_history").insert({
                  user_id: userId,
                  task_type: taskType,
                  description: taskDescription,
                  metadata: { tool: tool.name, input: tool.input },
                }).then(({ error }) => { if (error) console.error("task_history insert error:", error); });

                toolResults.push({
                  type: "tool_result",
                  tool_use_id: tool.id,
                  content: JSON.stringify(result),
                });
              }

              currentMessages.push({ role: "user", content: toolResults });
              // Loop continues — will make another streaming call
            } else {
              // end_turn — we're done
              break;
            }
          }

          // Send done event
          sendSSE(controller, "done", { tools_used: toolsUsed, last_deal_id: lastCreatedDealId, last_contact_id: lastCreatedContactId });

          // Save assistant message with enriched tool metadata
          const assistantContent = fullText || "I wasn't able to generate a response.";
          const metadata = toolCallLog.length > 0 ? {
            tools: toolCallLog.map(t => {
              // Create a concise result summary for history context
              let resultSummary = "";
              if (t.result && typeof t.result === "object" && !Array.isArray(t.result)) {
                const r = t.result as Record<string, unknown>;
                if (r.error) resultSummary = `error: ${r.error}`;
                else if (r.id && r.property_address) resultSummary = `created deal ${(r.id as string).slice(0, 8)} at ${r.property_address}`;
                else if (r.id && r.full_name) resultSummary = `added contact ${r.full_name}`;
                else if (r.id) resultSummary = `id=${(r.id as string).slice(0, 8)}`;
                else if (r.success) resultSummary = "success";
              } else if (Array.isArray(t.result)) {
                resultSummary = `${t.result.length} result(s)`;
              }
              return { tool: t.tool, input: t.input, result_summary: resultSummary || undefined };
            })
          } : null;
          await Promise.all([
            userClient.from("messages").insert({
              conversation_id,
              role: "assistant",
              content: assistantContent,
              metadata,
            }),
            userClient.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversation_id),
          ]);

          // Background memory extraction (fire and forget)
          // Only run if user message is substantive and assistant used tools
          const shouldExtractMemory = message.length > 20 && toolCallLog.length > 0;
          if (shouldExtractMemory) {
            const lastMessages = [...history.slice(-3), { role: "user", content: message }, { role: "assistant", content: assistantContent }].slice(-4);
            (async () => {
              try {
                const excerpt = lastMessages.map((m) => `${m.role}: ${m.content}`).join("\n\n");
                const memRes = await fetch("https://api.anthropic.com/v1/messages", {
                  method: "POST",
                  headers: {
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                  },
                  body: JSON.stringify({
                    model: "claude-haiku-3-5-20241022",
                    system: "You extract important facts from conversations. Return ONLY a JSON array.",
                    messages: [{
                      role: "user",
                      content: `Extract important facts about this real estate agent's business, clients, deals, or preferences from the following conversation excerpt. Only extract facts worth remembering for future conversations. Return ONLY a valid JSON array of objects with 'fact' (string) and 'category' (string) fields. Categories: client_preference, deal_info, business_preference, vendor_info, personal, other. If nothing worth remembering, return [].\n\nConversation:\n${excerpt}`,
                    }],
                    max_tokens: 256,
                  }),
                });

                if (!memRes.ok) {
                  console.error("Memory extraction API error:", await memRes.text());
                  return;
                }

                const memData = await memRes.json();
                const rawText = memData.content?.[0]?.text || "[]";
                const jsonMatch = rawText.match(/\[[\s\S]*\]/);
                if (!jsonMatch) return;

                const facts = JSON.parse(jsonMatch[0]);
                if (!Array.isArray(facts) || facts.length === 0) return;

                // Deduplicate against existing facts
                const { data: existingFacts } = await adminClient
                  .from("memory_facts")
                  .select("fact")
                  .eq("user_id", userId);
                const existingTexts = (existingFacts || []).map((f: { fact: string }) => f.fact.toLowerCase());

                const rows = facts
                  .filter((f: { fact?: string; category?: string }) => f.fact && f.category)
                  .filter((f: { fact: string }) => {
                    const lower = f.fact.toLowerCase();
                    return !existingTexts.some((existing: string) => existing.includes(lower) || lower.includes(existing));
                  })
                  .map((f: { fact: string; category: string }) => ({
                    user_id: userId,
                    fact: f.fact,
                    category: f.category,
                    source_conversation_id: conversation_id,
                  }));

                if (rows.length > 0) {
                  await adminClient.from("memory_facts").insert(rows);
                }
              } catch (err) {
                console.error("Memory extraction failed (non-blocking):", err);
              }
            })();
          }

          controller.close();
        } catch (err) {
          console.error("Streaming error:", err);
          try {
            sendSSE(controller, "error", { message: `Chat error: ${(err as Error)?.message || 'Unknown error'}` });
          } catch { /* controller may be closed */ }
          try { controller.close(); } catch { /* already closed */ }
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    console.error("Chat function error:", err);
    return new Response(JSON.stringify({ error: `Chat error: ${(err as Error)?.message || 'Unknown error'}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
