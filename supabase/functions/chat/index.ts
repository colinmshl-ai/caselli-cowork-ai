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
    description: "Create a new deal when the agent mentions a new listing, buyer, or transaction.",
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
  // Content tools
  {
    name: "draft_social_post",
    description: "Draft a social media post. Types: new_listing, just_sold, open_house, market_update, tip, testimonial. Always match the agent's brand voice. After drafting, ask: 'Want me to adjust anything, or is this good to go?'",
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
    description: "Draft an email. Types: follow_up, check_in, congratulations, introduction, status_update, vendor_coordination. Match brand voice. After drafting, ask: 'Want me to adjust anything, or is this good to go?'",
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
  // Contact tools
  {
    name: "search_contacts",
    description: "Search contacts by name, email, or company.",
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
      // Filter out undefined values
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
    // Content tools — return context for Claude to generate the actual content
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
    // Contact tools
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

    // Admin client for tool execution (bypasses RLS)
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch context in parallel
    const [profileRes, memoryRes, historyRes] = await Promise.all([
      userClient.from("business_profiles").select("*").eq("user_id", userId).maybeSingle(),
      userClient.from("memory_facts").select("fact").eq("user_id", userId).order("created_at", { ascending: false }).limit(25),
      userClient.from("messages").select("role, content").eq("conversation_id", conversation_id).order("created_at", { ascending: true }),
    ]);

    const profile = profileRes.data;
    const memoryFacts = memoryRes.data || [];
    const history = historyRes.data || [];

    // Build system prompt
    let systemPrompt = `You are Caselli, an AI coworker built specifically for real estate agents. You work alongside the agent every day, helping with communications, content, deal tracking, scheduling, and strategy.\n\n`;

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

    systemPrompt += `YOUR PERSONALITY:
- Professional but warm, like a sharp colleague who genuinely cares
- Proactive — suggest next steps, flag things the agent might miss
- Speak in real estate terminology naturally — don't explain basic terms like CMA, DOM, PSA, contingency, etc.
- When drafting content or communications, always match the agent's brand voice
- Keep responses concise and actionable — agents are busy

YOUR CAPABILITIES:
- Draft emails, follow-up messages, and client communications
- Write listing descriptions, social media posts, market updates
- Provide deal strategy advice and transaction timeline guidance
- Help with time management and task planning
- Answer real estate questions about contracts and processes
- Look up, create, and update deals in the agent's pipeline using your tools
- Search, add, and update contacts in the agent's CRM using your tools
- Draft content (social posts, listing descriptions, emails) using your tools — always present drafts formatted and ask "Want me to adjust anything, or is this good to go?"

RULES:
- Always follow Fair Housing guidelines — no references to protected classes in any content
- When writing listing descriptions, focus only on property features
- If asked for legal advice, recommend consulting a broker or attorney
- If asked something outside your expertise, say so honestly
- Use your tools proactively when the conversation is about deals, deadlines, contacts, or content`;

    const apiMessages = [
      ...history.map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initial API call with tools
    let anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250514",
        system: systemPrompt,
        messages: apiMessages,
        tools: TOOLS,
        max_tokens: 2048,
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic API error:", errText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let anthropicData = await anthropicRes.json();
    let currentMessages = [...apiMessages];

    // Tool use loop (handle up to 5 sequential tool calls)
    let iterations = 0;
    while (anthropicData.stop_reason === "tool_use" && iterations < 5) {
      iterations++;

      // Build the assistant message content (may contain text + tool_use blocks)
      const assistantContent = anthropicData.content;
      currentMessages.push({ role: "assistant", content: assistantContent });

      // Process all tool_use blocks
      const toolResults: { type: string; tool_use_id: string; content: string }[] = [];
      for (const block of assistantContent) {
        if (block.type === "tool_use") {
          const { result, taskType, taskDescription } = await executeTool(
            block.name,
            block.input,
            userId,
            adminClient
          );

          // Log to task_history
          await adminClient.from("task_history").insert({
            user_id: userId,
            task_type: taskType,
            description: taskDescription,
            metadata: { tool: block.name, input: block.input },
          });

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }
      }

      currentMessages.push({ role: "user", content: toolResults });

      // Follow-up API call
      anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250514",
          system: systemPrompt,
          messages: currentMessages,
          tools: TOOLS,
          max_tokens: 2048,
        }),
      });

      if (!anthropicRes.ok) {
        const errText = await anthropicRes.text();
        console.error("Anthropic follow-up error:", errText);
        break;
      }

      anthropicData = await anthropicRes.json();
    }

    // Extract final text response
    const textBlocks = (anthropicData.content || []).filter((b: { type: string }) => b.type === "text");
    const assistantContent = textBlocks.map((b: { text: string }) => b.text).join("\n\n") || "I wasn't able to generate a response.";

    // Save assistant message and update conversation
    await Promise.all([
      userClient.from("messages").insert({
        conversation_id,
        role: "assistant",
        content: assistantContent,
      }),
      userClient.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversation_id),
    ]);

    // Background memory extraction — don't block response
    const lastMessages = [...history.slice(-3), { role: "user", content: message }, { role: "assistant", content: assistantContent }].slice(-4);
    const memoryExtractionPromise = (async () => {
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
            model: "claude-sonnet-4-5-20250514",
            system: "You extract important facts from conversations. Return ONLY a JSON array.",
            messages: [{
              role: "user",
              content: `Extract important facts about this real estate agent's business, clients, deals, or preferences from the following conversation excerpt. Only extract facts worth remembering for future conversations. Return ONLY a valid JSON array of objects with 'fact' (string) and 'category' (string) fields. Categories: client_preference, deal_info, business_preference, vendor_info, personal, other. If nothing worth remembering, return [].\n\nConversation:\n${excerpt}`,
            }],
            max_tokens: 512,
          }),
        });

        if (!memRes.ok) {
          console.error("Memory extraction API error:", await memRes.text());
          return;
        }

        const memData = await memRes.json();
        const rawText = memData.content?.[0]?.text || "[]";
        // Extract JSON array from response (handle markdown code blocks)
        const jsonMatch = rawText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) return;

        const facts = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(facts) || facts.length === 0) return;

        const rows = facts
          .filter((f: { fact?: string; category?: string }) => f.fact && f.category)
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

    // Await memory extraction before returning to ensure it completes
    await memoryExtractionPromise;

    return new Response(JSON.stringify({ response: assistantContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Chat function error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
