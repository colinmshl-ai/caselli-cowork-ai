import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { conversation_id, message } = await req.json();
    if (!conversation_id || !message) {
      return new Response(JSON.stringify({ error: "Missing conversation_id or message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch business profile, memory facts, and conversation history in parallel
    const [profileRes, memoryRes, historyRes] = await Promise.all([
      supabase.from("business_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("memory_facts")
        .select("fact")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(25),
      supabase
        .from("messages")
        .select("role, content")
        .eq("conversation_id", conversation_id)
        .order("created_at", { ascending: true }),
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
      const agentLines = fields
        .filter(([, v]) => v && v.trim())
        .map(([label, v]) => `${label}: ${v}`);
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

RULES:
- Always follow Fair Housing guidelines — no references to protected classes in any content
- When writing listing descriptions, focus only on property features
- If asked for legal advice, recommend consulting a broker or attorney
- If asked something outside your expertise, say so honestly`;

    // Build messages array for Anthropic
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

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
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

    const anthropicData = await anthropicRes.json();
    const assistantContent =
      anthropicData.content?.[0]?.text || "I wasn't able to generate a response.";

    // Save assistant message and update conversation timestamp in parallel
    await Promise.all([
      supabase.from("messages").insert({
        conversation_id,
        role: "assistant",
        content: assistantContent,
      }),
      supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversation_id),
    ]);

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
