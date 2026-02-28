import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const lastExtractionMap = new Map<string, number>();

const shouldExtractMemoryCheck = (text: string, toolResults: Array<{tool: string}>): boolean => {
  if (text.length < 150) return false;
  const displayOnlyTools = ['get_active_deals', 'get_deal_details', 'check_upcoming_deadlines', 'search_contacts'];
  const toolsUsed = toolResults.map(t => t.tool);
  if (toolsUsed.length > 0 && toolsUsed.every(t => displayOnlyTools.includes(t))) return false;
  const specialCharRatio = (text.match(/[📍📊📅✅$|•\-\d]/g) || []).length / text.length;
  if (specialCharRatio > 0.15) return false;
  return true;
};

const wordSimilarity = (a: string, b: string): number => {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) { if (wordsB.has(w)) overlap++; }
  return overlap / Math.max(wordsA.size, wordsB.size);
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getMimeType(format: string): string {
  switch (format) {
    case "md": return "text/markdown";
    case "html": return "text/html";
    case "csv": return "text/csv";
    case "txt": return "text/plain";
    default: return "text/plain";
  }
}

function summarizeToolInput(toolName: string, input: Record<string, unknown>): string {
  switch (toolName) {
    case "search_contacts": return `Searching for "${input.query || input.name || "contacts"}"`;
    case "add_contact": return `Adding contact: ${input.full_name || "new contact"}`;
    case "update_contact": return `Updating contact`;
    case "create_deal": return `Creating deal: ${input.property_address || "new deal"}`;
    case "update_deal": return `Updating deal`;
    case "get_active_deals": return "Reviewing your pipeline";
    case "get_deal_details": return "Looking up deal details";
    case "check_upcoming_deadlines": return "Checking upcoming deadlines";
    case "draft_email": return `Drafting ${input.email_type || "email"}${input.recipient_name ? ` to ${input.recipient_name}` : ""}`;
    case "draft_social_post": return `Drafting ${input.post_type || "post"} for ${input.platform || "social"}`;
    case "draft_listing_description": return `Writing listing description`;
    case "create_file": return `Creating ${input.filename || "file"}`;
    case "enrich_property": return `Looking up property: ${input.address || "property"}`;
    default: return "Working...";
  }
}

function summarizeToolResult(toolName: string, result: unknown, taskDescription: string): string {
  if (Array.isArray(result)) {
    const n = result.length;
    switch (toolName) {
      case "search_contacts": return n > 0 ? `Found ${n} contact${n > 1 ? "s" : ""}` : "No contacts found";
      case "get_active_deals": return `Found ${n} active deal${n > 1 ? "s" : ""}`;
      case "check_upcoming_deadlines": return n > 0 ? `${n} upcoming deadline${n > 1 ? "s" : ""}` : "No upcoming deadlines";
      default: return taskDescription || "Done";
    }
  }
  if (result && typeof result === "object" && (result as Record<string, unknown>).id) {
    switch (toolName) {
      case "create_deal": return `Deal created: ${(result as Record<string, unknown>).property_address || ""}`;
      case "add_contact": return `Contact added: ${(result as Record<string, unknown>).full_name || ""}`;
      case "enrich_property": {
        const prop = (result as Record<string, unknown>).property;
        if (prop && typeof prop === "object") {
          const p = prop as Record<string, unknown>;
          return `Property: ${p.bedrooms || "?"}bd/${p.bathrooms || "?"}ba, ${p.squareFootage || "?"} sqft, built ${p.yearBuilt || "?"}`;
        }
        return taskDescription || "Done";
      }
      default: return taskDescription || "Done";
    }
  }
  return taskDescription || "Done";
}

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
    description: "Draft a social media post. FIRST verify the deal stage matches the post type (new_listing/open_house only for active listings, just_sold only for closed deals). ALWAYS use specific property data (price, beds/baths, sqft, features) from the deal - never write generic posts. Output format: Start with a brief 1-sentence intro, then on a new line write [Platform] Post: as a header, then the post content with 5-8 relevant local hashtags. Do NOT include next steps or suggestions in the post content itself - those go after the post. Keep posts under 200 words. After the post, on separate lines, ask if they want adjustments.",
    input_schema: {
      type: "object",
      properties: {
        post_type: { type: "string" },
        property_address: { type: "string" },
        details: { type: "string" },
        platform: { type: "string", enum: ["instagram", "facebook", "linkedin"] },
        deal_id: { type: "string", description: "The deal UUID from get_active_deals" },
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
        deal_id: { type: "string", description: "The deal UUID from get_active_deals" },
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
        contact_type: { type: "string", enum: ["client", "lead", "vendor", "agent", "lender", "other"] },
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
  {
    name: "create_todos",
    description: "Create a task list to track progress on a multi-step request. Use this when the user asks for something that requires 3+ steps. Each item should describe a concrete action you will take.",
    input_schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              content: { type: "string", description: "What needs to be done" },
              active_form: { type: "string", description: "Present tense version shown during execution, e.g. 'Searching for market data'" },
            },
            required: ["content", "active_form"],
          },
        },
      },
      required: ["items"],
    },
  },
  {
    name: "update_todo",
    description: "Update a task's status. Mark as in_progress when starting it, completed when done. Only one task should be in_progress at a time.",
    input_schema: {
      type: "object",
      properties: {
        index: { type: "number", description: "Zero-based index of the task to update" },
        status: { type: "string", enum: ["in_progress", "completed"] },
      },
      required: ["index", "status"],
    },
  },
  {
    name: "create_file",
    description: "Create a downloadable file for the user. Use this when the user asks you to write a document, report, spreadsheet export, or any deliverable they'd want to download. Supports markdown, HTML, CSV, and plain text formats.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Filename with extension, e.g. 'market-report.md'" },
        content: { type: "string", description: "The full content of the file" },
        format: { type: "string", enum: ["md", "html", "csv", "txt"], description: "File format" },
      },
      required: ["filename", "content", "format"],
    },
  },
  {
    name: "enrich_property",
    description: "Look up property details by address using public records. Returns beds, baths, square footage, lot size, year built, property type, last sale price, and photo URLs. Use this whenever a user adds a new listing or asks about property details.",
    input_schema: {
      type: "object",
      properties: {
        address: { type: "string", description: "Full street address" },
        city: { type: "string", description: "City name" },
        state: { type: "string", description: "Two-letter state code" },
        deal_id: { type: "string", description: "Optional deal ID to attach enrichment data to" },
      },
      required: ["address", "city", "state"],
    },
  },
];

interface UndoAction {
  type: "delete_deal" | "delete_contact" | "revert_deal";
  entity_id: string;
  previous_values?: Record<string, unknown>;
  label: string;
}

async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  userId: string,
  adminClient: ReturnType<typeof createClient>
): Promise<{ result: unknown; taskType: string; taskDescription: string; undoAction?: UndoAction }> {
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
        taskDescription: `Reviewed ${(data || []).length} active deal${(data || []).length === 1 ? "" : "s"}`,
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
        taskDescription: data?.property_address ? `Reviewed deal at ${data.property_address}` : "Looked up deal details",
      };
    }
    case "update_deal": {
      const { deal_id, ...updates } = toolInput;
      const cleanUpdates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(updates)) {
        if (v !== undefined && v !== null) cleanUpdates[k] = v;
      }

      // Coerce numeric fields
      if (cleanUpdates.contract_price) cleanUpdates.contract_price = Number(cleanUpdates.contract_price);
      if (cleanUpdates.list_price) cleanUpdates.list_price = Number(cleanUpdates.list_price);

      // Validate stage
      const VALID_STAGES = ["lead", "active_client", "under_contract", "due_diligence", "clear_to_close", "closed", "fell_through"];
      if (cleanUpdates.stage && !VALID_STAGES.includes(cleanUpdates.stage as string)) {
        return {
          result: { error: `Invalid stage: ${cleanUpdates.stage}. Valid values: ${VALID_STAGES.join(", ")}` },
          taskType: "deal_update",
          taskDescription: `Failed to update deal: invalid stage`,
        };
      }

      // Capture previous values for undo
      const fieldsToCapture = Object.keys(cleanUpdates).filter(k => k !== "updated_at");
      const { data: previousDeal } = await adminClient
        .from("deals")
        .select(fieldsToCapture.join(", "))
        .eq("id", deal_id as string)
        .eq("user_id", userId)
        .single();

      cleanUpdates.updated_at = new Date().toISOString();
      const { data, error } = await adminClient
        .from("deals")
        .update(cleanUpdates)
        .eq("id", deal_id as string)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) console.error("update_deal failed:", error.message, { deal_id, cleanUpdates });

      if (!data && !error) {
        return {
          result: { error: "Deal not found or no changes applied" },
          taskType: "deal_update",
          taskDescription: `Failed to update deal ${deal_id}`,
        };
      }

      // Build human-friendly update description
      const fieldLabels: Record<string, string> = {
        stage: data?.stage ? `stage to ${(data.stage as string).replace(/_/g, " ")}` : "stage",
        contract_price: data?.contract_price ? `price to $${Number(data.contract_price).toLocaleString()}` : "contract price",
        list_price: data?.list_price ? `list price to $${Number(data.list_price).toLocaleString()}` : "list price",
        closing_date: "closing date",
        inspection_deadline: "inspection deadline",
        financing_deadline: "financing deadline",
        appraisal_deadline: "appraisal deadline",
        client_name: "client info",
        client_email: "client email",
        client_phone: "client phone",
        notes: "notes",
        deal_type: "deal type",
      };
      const changedFields = Object.keys(cleanUpdates)
        .filter(k => k !== "updated_at")
        .map(k => fieldLabels[k] || k);
      const address = data?.property_address || "deal";
      const changesSummary = changedFields.length > 0 ? ` — ${changedFields.join(", ")}` : "";
      return {
        result: error ? { error: error.message } : data,
        taskType: "deal_update",
        taskDescription: `Updated ${address}${changesSummary}`,
        undoAction: !error && data ? {
          type: "revert_deal",
          entity_id: deal_id as string,
          previous_values: previousDeal || {},
          label: `Undo update to ${address}`,
        } : undefined,
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
        taskDescription: deadlines.length === 0 ? "Checked deadlines — all clear" : `Found ${deadlines.length} upcoming deadline${deadlines.length === 1 ? "" : "s"}`,
      };
    }
    case "create_deal": {
      const dealData = {
        user_id: userId,
        property_address: toolInput.property_address as string,
        client_name: (toolInput.client_name as string) || null,
        client_email: (toolInput.client_email as string) || null,
        deal_type: (toolInput.deal_type as string) || null,
        stage: (toolInput.stage as string) || "lead",
        list_price: toolInput.list_price ? Number(toolInput.list_price) : null,
        notes: (toolInput.notes as string) || null,
      };
      const { data, error } = await adminClient
        .from("deals")
        .insert(dealData)
        .select()
        .single();
      const price = toolInput.list_price ? ` at $${Number(toolInput.list_price).toLocaleString()}` : "";

      // Auto-enrich property if deal was created successfully
      let enrichmentResult: Record<string, unknown> | null = null;
      if (!error && data) {
        try {
          // Try to parse city/state from the address
          const addressStr = toolInput.property_address as string;
          const parts = addressStr.split(/[,\s]+/).filter(Boolean);
          // Common pattern: "123 Street Name City ST" or "123 Street, City, ST"
          const stateMatch = addressStr.match(/\b([A-Z]{2})\b(?:\s*\d{5})?$/);
          const state = stateMatch?.[1];
          // City is typically before the state
          const commaparts = addressStr.split(",").map(s => s.trim());
          let city = "";
          if (commaparts.length >= 2) {
            // "123 Street, City, ST 12345" or "123 Street, City ST"
            const lastPart = commaparts[commaparts.length - 1];
            if (lastPart.match(/^[A-Z]{2}/)) {
              city = commaparts.length >= 3 ? commaparts[commaparts.length - 2] : "";
            } else {
              city = commaparts[commaparts.length - 1].replace(/\s*[A-Z]{2}\s*\d{0,5}\s*$/, "").trim();
            }
          } else if (state) {
            // No commas — try to extract city as the word(s) before state
            const beforeState = addressStr.substring(0, addressStr.lastIndexOf(state)).trim();
            const words = beforeState.split(/\s+/);
            // Take last 1-2 words as city (heuristic)
            city = words.slice(-2).join(" ").replace(/^\d+\s+/, "");
          }

          if (state && city) {
            console.log(`[create_deal] Auto-enriching: city="${city}", state="${state}"`);
            const enrichResult = await executeTool("enrich_property", {
              address: addressStr,
              city,
              state,
              deal_id: (data as any).id,
            }, userId, adminClient);
            enrichmentResult = enrichResult.result as Record<string, unknown>;
          } else {
            console.log(`[create_deal] Could not parse city/state from "${addressStr}" — skipping auto-enrichment`);
          }
        } catch (enrichErr) {
          console.error("[create_deal] Auto-enrichment error:", enrichErr);
          // Non-blocking — deal is still created
        }
      }

      const resultWithEnrichment = !error && data ? {
        ...data,
        enrichment: enrichmentResult,
      } : (error ? { error: error.message } : data);

      return {
        result: resultWithEnrichment,
        taskType: "deal_create",
        taskDescription: `New deal added: ${toolInput.property_address}${price}`,
        undoAction: !error && data ? {
          type: "delete_deal" as const,
          entity_id: (data as any).id,
          label: `Undo creating ${toolInput.property_address}`,
        } : undefined,
      };
    }
    case "draft_social_post":
    case "draft_listing_description":
    case "draft_email": {
      console.log(`[${toolName}] Input:`, JSON.stringify(toolInput));
      let context: Record<string, unknown> = { success: true, ...toolInput };
      
      // Try deal_id first, then fall back to address search
      if (toolInput.deal_id) {
        const { data: deal } = await adminClient
          .from("deals")
          .select("*")
          .eq("id", toolInput.deal_id as string)
          .eq("user_id", userId)
          .maybeSingle();
        if (deal) {
          context.deal = deal;
          console.log(`[${toolName}] Found deal by ID: ${deal.property_address}`);
        } else {
          console.warn(`[${toolName}] deal_id ${toolInput.deal_id} not found`);
        }
      } else if (toolInput.property_address) {
        const { data: deals } = await adminClient
          .from("deals")
          .select("*")
          .eq("user_id", userId)
          .ilike("property_address", `%${toolInput.property_address}%`)
          .limit(1);
        if (deals && deals.length > 0) {
          context.deal = deals[0];
          console.log(`[${toolName}] Found deal by address: ${deals[0].property_address}`);
        } else {
          console.warn(`[${toolName}] No deal found for address: ${toolInput.property_address}`);
        }
      }
      
      if (!context.deal) {
        console.warn(`[${toolName}] No deal data available. Input:`, JSON.stringify(toolInput));
        context.no_deal_found = true;
        context.message = "No matching deal found. Draft using available context from the conversation.";
      }
      // Build human-friendly content description
      const contentLabels: Record<string, string> = {
        draft_social_post: "social post",
        draft_email: "email",
        draft_listing_description: "listing description",
      };
      const contentLabel = contentLabels[toolName] || toolName.replace("draft_", "");
      const dealAddress = (context.deal as Record<string, unknown>)?.property_address as string | undefined;
      const qualifier = toolInput.platform || toolInput.post_type || toolInput.style || toolInput.email_type || "";
      const forDeal = dealAddress ? ` for ${dealAddress}` : "";
      const qualifierStr = qualifier ? ` (${qualifier})` : "";
      return {
        result: context,
        taskType: "content_drafted",
        taskDescription: `Drafted ${contentLabel}${forDeal}${qualifierStr}`,
      };
    }
    case "search_contacts": {
      const q = `%${toolInput.query as string}%`;
      const { data } = await adminClient
        .from("contacts")
        .select("*")
        .eq("user_id", userId)
        .or(`full_name.ilike.${q},email.ilike.${q},company.ilike.${q}`);
      const matchCount = (data || []).length;
      return {
        result: data || [],
        taskType: "contact_lookup",
        taskDescription: matchCount > 0
          ? `Found ${matchCount} contact${matchCount === 1 ? "" : "s"} matching "${toolInput.query}"`
          : `No contacts found for "${toolInput.query}"`,
      };
    }
    case "add_contact": {
      if (!toolInput.full_name) {
        return { result: { error: "Contact name is required" }, taskType: "contact_updated", taskDescription: "Failed to add contact: no name provided" };
      }
      const contactData = {
        user_id: userId,
        full_name: toolInput.full_name,
        email: toolInput.email || null,
        phone: toolInput.phone || null,
        contact_type: toolInput.contact_type || "client",
        company: toolInput.company || null,
        notes: toolInput.notes || null,
      };
      const { data, error } = await adminClient
        .from("contacts")
        .insert(contactData)
        .select()
        .single();
      if (error) console.error("add_contact failed:", error.message, { toolInput });
      const contactType = (toolInput.contact_type as string) || "client";
      return {
        result: error ? { error: error.message, success: false } : { ...data, success: true },
        taskType: "contact_added",
        taskDescription: error ? `Failed to add contact` : `Added new ${contactType}: ${toolInput.full_name}`,
        undoAction: !error && data ? {
          type: "delete_contact" as const,
          entity_id: (data as any).id,
          label: `Undo adding ${toolInput.full_name}`,
        } : undefined,
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
      const contactName = data?.full_name || "contact";
      const updatedFields = Object.keys(cleanUpdates).join(", ");
      return {
        result: error ? { error: error.message } : data,
        taskType: "contact_updated",
        taskDescription: error ? `Failed to update ${contactName}` : `Updated ${contactName}'s ${updatedFields}`,
      };
    }
    case "enrich_property": {
      const address = toolInput.address as string;
      const city = toolInput.city as string;
      const state = toolInput.state as string;
      const dealId = toolInput.deal_id as string | undefined;

      console.log(`[enrich_property] Input: address="${address}", city="${city}", state="${state}", deal_id="${dealId || "none"}"`);

      const RENTCAST_API_KEY = Deno.env.get("RENTCAST_API_KEY");
      if (!RENTCAST_API_KEY) {
        console.warn("[enrich_property] RENTCAST_API_KEY not configured");
        return {
          result: { success: false, error: "Property lookup is not configured. Add a RENTCAST_API_KEY to enable automatic property enrichment." },
          taskType: "property_enrichment",
          taskDescription: "Property enrichment unavailable — API key not configured",
        };
      }

      try {
        const url = `https://api.rentcast.io/v1/properties?address=${encodeURIComponent(address)}&city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`;
        console.log(`[enrich_property] Calling RentCast: ${url}`);
        const resp = await fetch(url, { headers: { "X-Api-Key": RENTCAST_API_KEY, "Accept": "application/json" } });

        if (!resp.ok) {
          const errText = await resp.text();
          console.error(`[enrich_property] RentCast API error ${resp.status}: ${errText}`);
          return {
            result: { success: false, error: `Property lookup failed (${resp.status}). The deal was still created with the info you provided.` },
            taskType: "property_enrichment",
            taskDescription: `Property lookup failed for ${address}`,
          };
        }

        const apiData = await resp.json();
        console.log(`[enrich_property] RentCast returned ${Array.isArray(apiData) ? apiData.length : 0} results`);

        const property = Array.isArray(apiData) && apiData.length > 0 ? apiData[0] : null;
        if (!property) {
          return {
            result: { success: false, error: "No property records found for this address. The deal was created with the info you provided." },
            taskType: "property_enrichment",
            taskDescription: `No property records found for ${address}`,
          };
        }

        const enriched = {
          bedrooms: property.bedrooms ?? null,
          bathrooms: property.bathrooms ?? null,
          squareFootage: property.squareFootage ?? null,
          lotSize: property.lotSize ?? null,
          yearBuilt: property.yearBuilt ?? null,
          propertyType: property.propertyType ?? null,
          lastSalePrice: property.lastSalePrice ?? null,
          lastSaleDate: property.lastSaleDate ?? null,
          photos: property.photos || [],
        };

        // If deal_id provided, update the deal with enrichment data
        if (dealId) {
          const updateData: Record<string, unknown> = {
            bedrooms: enriched.bedrooms,
            bathrooms: enriched.bathrooms,
            square_footage: enriched.squareFootage,
            lot_size: enriched.lotSize,
            year_built: enriched.yearBuilt,
            property_type: enriched.propertyType,
            last_sale_price: enriched.lastSalePrice,
            last_sale_date: enriched.lastSaleDate,
            property_photos: enriched.photos.length > 0 ? enriched.photos : null,
            enrichment_data: property,
            updated_at: new Date().toISOString(),
          };
          const { error: updateError } = await adminClient
            .from("deals")
            .update(updateData)
            .eq("id", dealId)
            .eq("user_id", userId);
          if (updateError) {
            console.error(`[enrich_property] Failed to update deal ${dealId}:`, updateError.message);
          } else {
            console.log(`[enrich_property] Updated deal ${dealId} with enrichment data`);
          }
        }

        const photoCount = enriched.photos.length;
        const summary = [
          enriched.bedrooms ? `${enriched.bedrooms}bd` : null,
          enriched.bathrooms ? `${enriched.bathrooms}ba` : null,
          enriched.squareFootage ? `${enriched.squareFootage.toLocaleString()} sqft` : null,
          enriched.yearBuilt ? `built ${enriched.yearBuilt}` : null,
        ].filter(Boolean).join(" / ");

        return {
          result: { success: true, property: enriched, summary, photos_count: photoCount },
          taskType: "property_enrichment",
          taskDescription: `Property details: ${summary || address}${photoCount > 0 ? ` • ${photoCount} photos` : ""}`,
        };
      } catch (err) {
        console.error("[enrich_property] Unexpected error:", err);
        return {
          result: { success: false, error: "Property lookup encountered an unexpected error. The deal was still created." },
          taskType: "property_enrichment",
          taskDescription: `Property lookup error for ${address}`,
        };
      }
    }
    case "create_file": {
      const filename = toolInput.filename as string;
      const content = toolInput.content as string;
      const format = toolInput.format as string;
      const storagePath = `${userId}/${filename}`;

      const { error: uploadError } = await adminClient.storage
        .from("user-files")
        .upload(storagePath, new Blob([content], { type: getMimeType(format) }), {
          contentType: getMimeType(format),
          upsert: true,
        });

      if (uploadError) {
        return { result: { error: uploadError.message }, taskType: "file_creation", taskDescription: `Failed to create ${filename}` };
      }

      const { data: signedUrl } = await adminClient.storage
        .from("user-files")
        .createSignedUrl(storagePath, 86400);

      return {
        result: { filename, url: signedUrl?.signedUrl, format, size: content.length },
        taskType: "file_creation",
        taskDescription: `Created ${filename}`,
      };
    }
    case "create_todos":
    case "update_todo":
      // Handled inline in the agentic loop, not here
      return { result: { success: true }, taskType: "todo", taskDescription: "Task list updated" };
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
  web_search: "Searching the web...",
  create_todos: "Setting up task list...",
  update_todo: "Updating task...",
  create_file: "Creating file...",
  enrich_property: "Looking up property details...",
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
): Promise<{ stopReason: string; inputTokens: number; outputTokens: number }> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentToolId = "";
  let currentToolName = "";
  let currentToolInput = "";
  let stopReason: "end_turn" | "tool_use" = "end_turn";
  let inputTokens = 0;
  let outputTokens = 0;

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
          } else if (event.content_block?.type === "web_search_tool_result") {
            // Server-side web search completed — collect sources and stream to frontend
            const searchResults = event.content_block.search_results || [];
            const collectedSources = searchResults.map((r: { title?: string; url?: string }) => {
              const url = r.url || "";
              let domain = "";
              try { domain = new URL(url).hostname.replace("www.", ""); } catch { /* ignore */ }
              return { title: r.title || url, url, domain };
            }).filter((s: { url: string }) => s.url);
            // Store sources on the function-level for the done event
            if (typeof (controller as any).__sources === "undefined") (controller as any).__sources = [];
            (controller as any).__sources.push(...collectedSources);
            const sourceNames = collectedSources.map((s: { title: string }) => s.title).slice(0, 5);
            sendSSE(controller, "web_search_result", {
              query: event.content_block.content?.query || "",
              results_count: searchResults.length,
              sources: sourceNames,
            });
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

        case "message_start":
          if (event.message?.usage?.input_tokens) {
            inputTokens = event.message.usage.input_tokens;
          }
          break;

        case "message_delta":
          if (event.delta?.stop_reason) {
            stopReason = event.delta.stop_reason;
          }
          if (event.usage?.output_tokens) {
            outputTokens = event.usage.output_tokens;
          }
          break;
      }
    }
  }

  return { stopReason, inputTokens, outputTokens };
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

    // === SYSTEM PROMPT: Split into static (cacheable) + profile (cacheable) + dynamic (not cached) ===

    const STATIC_SYSTEM_PROMPT = `You are Caselli, a sharp, proactive real estate AI coworker. You anticipate needs, not just respond to requests. When an agent mentions a listing, you automatically think about what marketing materials they'll need, what deadlines to track, and who to notify. You speak in the agent's chosen brand tone at all times.

YOUR PERSONALITY AND BEHAVIOR:
- You are a sharp, proactive coworker, not a chatbot. Think two steps ahead.
- When you check deadlines, proactively flag anything within 48 hours as urgent and suggest action items.
- If a deal has been in the same stage for a long time, mention it.
- Speak in real estate terminology naturally. Do not explain basic terms like CMA, DOM, PSA, contingency.
- Keep responses concise and actionable. Agents are busy.
- When drafting content or communications, always match the agent's brand voice.

RESPONSE FORMAT RULES (follow these exactly):

1. ACTION CONFIRMATIONS: When you complete an action (create deal, add contact, update anything), ALWAYS use the ✅ format:
   ✅ [Action verb past tense]: [specific details]
   Examples:
   ✅ Created listing: 123 Main St, Arlington VA - $525,000
   ✅ Added contact: Mike Johnson (Seller)
   ✅ Updated deal stage: Under Contract → Closing
   ✅ Drafted Instagram post (187 chars)
   NEVER say "I'll create the listing" or "I'm going to add the contact." By the time you respond, the action is ALREADY DONE. Confirm it as completed.

2. MULTIPLE ACTIONS: Stack confirmations, then add context:
   ✅ Created listing: 123 Main St - $525,000
   ✅ Property enriched: 4 bed / 3 bath / 2,400 sqft / Built 2010
   ✅ Added contact: Sarah Chen (Buyer's Agent)
   This listing is now active in your Deals dashboard.

3. CONTENT DRAFTS: When drafting content (posts, emails, descriptions), present the content directly. Don't narrate what you're about to do.

4. FAILURES: If a tool fails, be direct:
   ⚠️ Couldn't enrich property data for 123 Main St (API unavailable)
   ✅ Created listing with the details you provided instead

5. NEVER use these patterns:
   ❌ "I'll go ahead and create..."
   ❌ "Let me create that for you..."
   ❌ "I'm creating the listing now..."
   ❌ "Sure! I can help with that."
   ❌ "I've gone ahead and..."
   Instead, just confirm the completed action with ✅.

ADDITIONAL STYLE RULES:
- Be warm and friendly but concise. Every sentence should add value.
- Use the user's brand voice for DRAFTED content (social posts, emails) but use a professional, efficient tone for conversational responses.
- Avoid filler phrases like "Chef's kiss!", "absolutely perfect!", "gorgeous property!". Use specific, useful language instead.
- Do not repeat information the user already knows.

PROACTIVE WORKFLOW CHAINING (CRITICAL — this is what makes you an agent, not a chatbot):
- After completing ANY task, ALWAYS end with a "Next steps:" section containing exactly 2-3 numbered options.
- Options MUST be specific — reference the actual property address, contact name, price, or content you just created. Never generic.
- Use numbered list format (1. 2. 3.) so the user can reply "1" or "2" to pick one.
- If the user's original request implied multiple steps, execute ALL of them first, THEN offer the next logical actions.
- NEVER use generic closers like "Is there anything else I can help with?" or "Let me know if you need anything else." Always offer concrete next actions.
- Keep suggestion text short and action-oriented — one line each, no bold formatting.

Examples of correct chaining format:

After creating a listing:
✅ Created listing: 123 Main St - $450,000
✅ Property details: 3 bed / 2 bath / 1,800 sqft

Next steps:
1. Draft an Instagram post featuring 123 Main St
2. Write a listing description for MLS
3. Email your buyer list about this new listing

After drafting content:
Next steps:
1. Adapt this for Facebook and LinkedIn
2. Draft a matching email to your client list
3. Create a different angle focusing on the neighborhood

After adding a contact:
✅ Added Sarah Chen as a new lead

Next steps:
1. Draft a welcome email to Sarah
2. Create a deal for Sarah Chen
3. Set a follow-up reminder for next week

After updating a deal stage:
Next steps:
1. Draft a status update email to the client
2. Check upcoming deadlines for this deal
3. Draft a "just sold" post (if closed)

After checking deadlines:
Next steps:
1. Draft reminder emails for the upcoming deadlines
2. Update deal stages for any that have progressed
3. Show my full active pipeline

CONTENT DRAFTING QUALITY RULES:
- When drafting social posts, emails, or listing descriptions, write like a real agent would. No corporate marketing speak.
- NEVER use these phrases in drafted content: "Don't miss out", "Mark your calendars", "Your dream home awaits", "This won't last long", "Act now", "Stunning", "Breathtaking", "One-of-a-kind"
- Social posts should feel authentic and local. Reference the specific neighborhood, not generic "amazing location" language.
- If the deal data includes specific features (sqft, beds, baths, price), USE THEM in the post. Don't write vague posts when you have real data.
- Open house posts must include: address, date/time (ask if not provided), 2-3 specific property highlights from deal data, and relevant hashtags including the city/neighborhood.
- If you don't have enough data to write a good post (no features, no price, no neighborhood), say so and ask for the missing details instead of writing a generic post.
- Keep social posts to 150-200 words max. Quality over quantity.
- Emails should be short and direct. No more than 3 short paragraphs.

WEB SEARCH FOR CONTEXT:
You have access to web_search. Use it PROACTIVELY — don't wait to be asked.

WHEN TO SEARCH AUTOMATICALLY:
- Before drafting listing content: search "[neighborhood] [city] amenities schools parks restaurants" to add local color
- Before discussing pricing or market conditions: search "[city] [state] real estate market 2026" or "[zip code] median home price"
- Before creating social posts about an area: search "upcoming events [city] [month] 2026" or "[neighborhood] things to do"
- When a user shares a property address and asks you to research it

WHEN NOT TO SEARCH:
- Basic CRUD operations (create deal, add contact, update stage)
- When you already have all the data you need from deal details and enrichment
- When the user is asking a simple question you can answer from conversation context

SEARCH RULES:
- Use 1-2 focused searches per content request, not 5+ scattered ones
- Weave search results naturally into your content — don't list raw search results
- Credit specific data points: "The median home price in Haymarket is $X (source: Realtor.com)"
- Combine web search results with deal data and enrichment for the most compelling content
- For market reports, always search for the latest data rather than relying on training data

EXAMPLE WORKFLOW for "draft an Instagram post for my listing at 123 Main St, Haymarket VA":
1. get_deal_details → get property features
2. web_search "Haymarket VA neighborhood highlights amenities 2026" → get local context
3. Draft the post weaving property features WITH neighborhood highlights
   Instead of: "Beautiful 4-bed home in a great location!"
   Write: "4 bed / 3 bath on a quiet cul-de-sac in Haymarket — 5 min from the Saturday farmers market and Old Town restaurants"

YOUR CAPABILITIES AND HOW TO USE THEM:
- You have tools to manage deals, contacts, draft content, and search the web. USE THEM PROACTIVELY.
- When the agent mentions a person by name, automatically search contacts to see if they exist before asking.
- When the agent mentions a property address, check if there is already a deal for it.
- When creating a deal, also offer to add the client as a contact if they are not already in the system.
- When drafting an email, always populate the To field with the recipient's name and pull their email from contacts if possible.
- Chain related actions: if the user says "I just got a new listing at 123 Main St from Sarah Chen", you should create the deal AND search/add the contact AND offer to draft a social post, all in one flow.
- Always present drafted content in a clean format and ask "Want me to adjust anything, or is this good to go?"
- IMPORTANT: When drafting social media posts, NEVER use email-style headers like "To:", "Subject:", "From:", or "Caption:". Start with a brief intro sentence, then put the post content on its own lines with hashtags. Format the header as **[Platform] Post:** only.
- When providing next steps or recommendations after completing a task, use plain conversational language. Do NOT format recommendations as a numbered list with property details, bed/bath counts, or addresses that could be confused with a listing description. Keep next steps as simple action items.
- When confirming tool actions (deal created, contact added, etc.), keep confirmations brief on a single line with a ✅ prefix. Put any follow-up suggestions in a separate paragraph below.
- Do NOT prefix conversational responses, clarification questions, or recommendations with badge headers like "📋 Listing Description", "📱 Social Post", or "📧 Email". Only use content-type headers when you are actually delivering drafted content that the user requested.

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

IMPORTANT - Pre-action validation:
Before using draft_social_post, draft_email, or draft_listing_description for a specific property, FIRST check the deal's current stage using get_deal_details or your conversation memory. If the action conflicts with the stage, warn the user BEFORE drafting:
- Do not draft "new listing" or "open house" posts for properties that are under contract, pending, or closed
- Do not draft "just sold" posts for properties that are not in the "closed" stage
- Do not draft listing descriptions for properties that are closed or fell through
If the user insists after the warning, proceed with the draft.

TASK TRACKING:
- ONLY create a task list for genuinely complex multi-step requests (5+ steps involving different tools).
- Do NOT create todos for simple requests like "draft a social post" or "update this deal" — just do it.
- Simple flows like: look up deal → draft content → suggest next steps do NOT need task tracking.
- Examples that DO need todos: "Set up everything for my new listing" (create deal + add contact + draft social post + draft email + check deadlines).
- Examples that do NOT need todos: "Draft an open house post for 123 Main St" (just look up the deal and draft it).
- Update each task to "in_progress" when you start it and "completed" when you finish.
- Keep only ONE task as "in_progress" at a time.

MULTI-ACTION BEHAVIOR:
- When a user request involves multiple related actions, execute them all in sequence using your tools.
- Example: "Add a new listing at 123 Oak Ave for buyer Mike Torres, list price 450k" should trigger: create_deal, then search_contacts for Mike Torres, then add_contact if not found. Suggest drafting marketing materials as a follow-up but don't create them unless asked.
- For simple requests like "draft a post for my listing", just call get_active_deals or get_deal_details and draft_social_post. Two tool calls, done. No todos needed.
- You have up to 5 tool calls per message. Use them.
- After completing a chain of actions, summarize everything you did in a clear list.

PROPERTY ENRICHMENT:
- When a user adds a new listing via create_deal, the system automatically looks up property details (beds, baths, sqft, year built, photos) via the enrich_property tool. This happens within create_deal itself — you do NOT need to call enrich_property separately after creating a deal.
- If auto-enrichment succeeded, the deal result will include an "enrichment" object with a "property" field. Present the enriched data in your confirmation format, e.g.:
  ✅ Created listing: [address] - $[price] [type]
  ✅ Property details: [beds] bed / [baths] bath / [sqft] sqft / Built [year]
  ✅ [N] property photos saved
- If auto-enrichment failed or the API key is not configured, still confirm the deal was created and mention that automatic property lookup was not available.
- If the user asks about a property details and the deal does not have enrichment data yet, use enrich_property with the deal_id to fetch and save the data.
- ENRICHMENT-AWARE CHAINING: When create_deal + enrichment succeeds, you have rich property data. USE IT in your follow-up suggestions. Don't offer generic "Draft a social post" — instead reference specific features from the enrichment data. Examples:
  - If the property has 4+ bedrooms: "Draft a post highlighting the spacious 4-bedroom layout"
  - If the property has large sqft: "Write a listing description showcasing the 3,200 sqft of living space"
  - If the property was recently built: "Draft a post featuring this newer construction (built 2021)"
  - If the property has multiple photos: "Create an Instagram carousel post using the 12 property photos"
  Pull from enrichment data (sqft, beds/baths, property type, year built, lot size, photos count) to make every suggestion feel informed and specific to THIS property.

FILE CREATION:
- When the user asks you to write a report, analysis, or any deliverable, create an actual file using create_file.
- Don't just output long content as chat text. Create a downloadable file instead.
- Use markdown format by default for reports and analyses.
- Use CSV for data exports and lists.
- Use HTML for formatted content that needs styling.
- Always mention the filename when you create a file.`;

    // Build profile context block (cacheable — changes rarely)
    let profileContext = "";
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
        profileContext = `ABOUT THE AGENT YOU WORK WITH:\n${agentLines.join("\n")}`;
      }
    }

    // Build dynamic context block (changes every request — NOT cached)
    let dynamicContext = "";
    if (memoryFacts.length > 0) {
      dynamicContext += `THINGS I REMEMBER FROM PAST CONVERSATIONS:\n${memoryFacts.map((m) => `- ${m.fact}`).join("\n")}\n\n`;
    }
    if (recentActivity.length > 0) {
      dynamicContext += `RECENT ACTIVITY (last actions across all conversations):\n`;
      for (const activity of recentActivity) {
        const meta = activity.metadata as Record<string, unknown> | null;
        const toolName = meta?.tool || activity.task_type;
        const inputSummary = meta?.input ? Object.entries(meta.input as Record<string, unknown>).filter(([, v]) => v).map(([k, v]) => `${k}="${v}"`).join(", ") : "";
        dynamicContext += `- ${activity.description || toolName}${inputSummary ? ` (${inputSummary})` : ""}\n`;
      }
      dynamicContext += `\n`;
    }
    if (lastConvo && lastConvo.id !== conversation_id && lastConvo.title) {
      dynamicContext += `LAST CONVERSATION CONTEXT: The user's most recent conversation was titled "${lastConvo.title}". Reference this naturally if relevant.\n\n`;
    }

    // Structure system prompt as array of content blocks for prompt caching
    const systemContent: { type: string; text: string; cache_control?: { type: string } }[] = [
      {
        type: "text",
        text: STATIC_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ];
    if (profileContext) {
      systemContent.push({
        type: "text",
        text: profileContext,
        cache_control: { type: "ephemeral" },
      });
    }
    if (dynamicContext) {
      systemContent.push({
        type: "text",
        text: dynamicContext,
      });
    }

    // Build tools array with cache_control on the last tool
    const toolDefs = TOOLS.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema,
    }));
    const toolsWithCache = [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 5,
      },
      ...toolDefs.slice(0, -1),
      {
        ...toolDefs[toolDefs.length - 1],
        cache_control: { type: "ephemeral" },
      },
    ];

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
        let clientDisconnected = false;
        req.signal.addEventListener("abort", () => { clientDisconnected = true; });

        try {
          let fullText = "";
          const toolsUsed: { tool: string; description: string }[] = [];
          const toolCallLog: { tool: string; input: Record<string, unknown>; result: unknown }[] = [];
          const undoActions: UndoAction[] = [];
          let currentMessages = [...apiMessages];
          let iterations = 0;
          let totalTokens = 0;
          let consecutiveEndTurns = 0;
          let lastCreatedDealId: string | null = null;
          let lastCreatedContactId: string | null = null;
          let todos: { content: string; active_form: string; status: "pending" | "in_progress" | "completed" }[] = [];

          while (iterations < 5) {
            if (clientDisconnected) break;
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
                  system: systemContent,
                  messages: currentMessages,
                  tools: toolsWithCache,
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

            const streamResult = await parseAnthropicStream(
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

            const { stopReason, inputTokens, outputTokens } = streamResult;
            totalTokens += inputTokens + outputTokens;

            // Emit iteration progress to frontend
            const lastToolName = iterationToolCalls.length > 0 ? iterationToolCalls[iterationToolCalls.length - 1].name : undefined;
            sendSSE(controller, "iteration", { current: iterations, max: 5, tool: lastToolName });

            // Cost guard
            if (totalTokens > 30000) {
              const costMsg = "\n\nI've completed what I could in this response. Want me to continue?";
              fullText += costMsg;
              sendSSE(controller, "text_delta", { text: costMsg });
              break;
            }

            if (stopReason === "tool_use" && iterationToolCalls.length > 0) {
              consecutiveEndTurns = 0;
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

              // Execute tools — parallel when safe, sequential as fallback
              const toolResults: { type: string; tool_use_id: string; content: string }[] = [];
              const customTools = iterationToolCalls.filter(t => t.name !== "web_search" && t.name !== "create_todos" && t.name !== "update_todo");
              const webSearchTools = iterationToolCalls.filter(t => t.name === "web_search");
              const todoTools = iterationToolCalls.filter(t => t.name === "create_todos" || t.name === "update_todo");

              // Handle todo tools immediately (no DB, just in-memory + SSE)
              for (const tool of todoTools) {
                if (tool.name === "create_todos") {
                  const items = (tool.input.items as { content: string; active_form: string }[]) || [];
                  todos = items.map(item => ({ content: item.content, active_form: item.active_form, status: "pending" as const }));
                  sendSSE(controller, "todo_update", { todos: todos.map((t, i) => ({ ...t, index: i })) });
                } else if (tool.name === "update_todo") {
                  const idx = tool.input.index as number;
                  const status = tool.input.status as "in_progress" | "completed";
                  if (todos[idx]) {
                    todos[idx].status = status;
                    sendSSE(controller, "todo_update", { todos: todos.map((t, i) => ({ ...t, index: i })) });
                  }
                }
                toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: JSON.stringify({ success: true }) });
              }

              // Add web_search results immediately
              for (const ws of webSearchTools) {
                toolResults.push({ type: "tool_result", tool_use_id: ws.id, content: "Server-side tool — results already provided." });
              }

              // Send all tool_start events immediately for parallel UX
              for (const tool of customTools) {
                const desc = TOOL_DESCRIPTIONS[tool.name] || "Working on it...";
                const toolEntry: { tool: string; description: string; deal_id?: string; contact_id?: string } = { tool: tool.name, description: desc };
                if (tool.input?.deal_id) toolEntry.deal_id = tool.input.deal_id;
                if (tool.input?.contact_id) toolEntry.contact_id = tool.input.contact_id;
                toolsUsed.push(toolEntry);
                sendSSE(controller, "tool_start", { tool: tool.name, status: desc, input_summary: summarizeToolInput(tool.name, tool.input) });
              }

              // Execute all custom tools in parallel
              const toolPromises = customTools.map(async (tool) => {
                const { result, taskType, taskDescription, undoAction } = await executeTool(
                  tool.name,
                  tool.input,
                  userId,
                  adminClient
                );

                sendSSE(controller, "tool_done", { tool: tool.name, result_summary: summarizeToolResult(tool.name, result, taskDescription), success: !(result as any)?.error });

                // Stream file_created event for create_file tool
                if (tool.name === "create_file" && result && typeof result === "object" && (result as any).url) {
                  sendSSE(controller, "file_created", {
                    filename: (result as any).filename,
                    url: (result as any).url,
                    format: (result as any).format,
                    size: (result as any).size,
                  });
                }

                // Log to task_history (fire and forget)
                adminClient.from("task_history").insert({
                  user_id: userId,
                  task_type: taskType,
                  description: taskDescription,
                  metadata: { tool: tool.name, input: tool.input },
                }).then(({ error }) => { if (error) console.error("task_history insert error:", error); });

                return { tool, result, taskType, taskDescription, undoAction };
              });

              const toolOutputs = await Promise.all(toolPromises);
              if (clientDisconnected) break;

              for (const output of toolOutputs) {
                if (output.undoAction) undoActions.push(output.undoAction);
                toolCallLog.push({ tool: output.tool.name, input: output.tool.input, result: output.result });

                // Track entity IDs from tool results
                const result = output.result;
                if (result && typeof result === "object" && !Array.isArray(result)) {
                  const r = result as Record<string, unknown>;
                  if (output.tool.name === "create_deal" && r.id) lastCreatedDealId = r.id as string;
                  if (output.tool.name === "add_contact" && r.id) lastCreatedContactId = r.id as string;
                  if (output.tool.name === "get_deal_details" && r.id) lastCreatedDealId = r.id as string;
                }
                if (output.tool.name === "search_contacts" && Array.isArray(result) && (result as unknown[]).length > 0) {
                  lastCreatedContactId = ((result as unknown[])[0] as Record<string, unknown>).id as string;
                }

                toolResults.push({
                  type: "tool_result",
                  tool_use_id: output.tool.id,
                  content: JSON.stringify(output.result),
                });
              }

              currentMessages.push({ role: "user", content: toolResults });

              // Smart early-exit: content generation tools with substantial text
              const CONTENT_TOOLS = ["draft_social_post", "draft_email", "draft_listing_description", "create_file"];
              const lastToolNames = iterationToolCalls.map(t => t.name);
              if (lastToolNames.some(t => CONTENT_TOOLS.includes(t)) && iterationText.trim().length > 50) {
                break; // Content is ready
              }
              // Loop continues — will make another streaming call
            } else {
              // end_turn — check consecutive exits
              consecutiveEndTurns++;
              if (consecutiveEndTurns >= 2) break;
              break;
            }
          }

          // Derive content_type from tools used
          const DRAFT_CONTENT_TYPE_MAP: Record<string, string> = {
            draft_social_post: "social_post",
            draft_email: "email",
            draft_listing_description: "listing_description",
            enrich_property: "property_enriched",
          };
          let contentType = "conversational";
          const toolNames = toolCallLog.map(t => t.tool);

          // Guard: force conversational if response is too short for a card
          if (!fullText || fullText.trim().length < 20) {
            contentType = "conversational";
          } else if (toolNames.includes("create_deal") && toolNames.includes("enrich_property")) {
            contentType = "property_enriched";
          } else {
            for (const t of toolCallLog) {
              if (DRAFT_CONTENT_TYPE_MAP[t.tool]) {
                contentType = DRAFT_CONTENT_TYPE_MAP[t.tool];
                break;
              }
            }
          }

          // Save assistant message with enriched tool metadata
          const assistantContent = fullText || (toolCallLog.length > 0
            ? "I ran into an issue generating content. Could you try again or provide more details?"
            : "I wasn't able to generate a response. Please try again.");
          const metadata: Record<string, unknown> = { content_type: contentType };
          if (undoActions.length > 0) metadata.undo_actions = undoActions;
          if (toolCallLog.length > 0) {
            metadata.tools = toolCallLog.map(t => {
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
            });
          }
          await Promise.all([
            userClient.from("messages").insert({
              conversation_id,
              role: "assistant",
              content: assistantContent,
              metadata,
            }),
            userClient.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversation_id),
          ]);

          // Auto-generate conversation title for first message (awaited so SSE arrives before close)
          const isFirstMessage = history.length <= 1;
          if (isFirstMessage) {
            try {
              const summarySnippet = assistantContent.slice(0, 100);
              const titleRes = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                  "x-api-key": ANTHROPIC_API_KEY,
                  "anthropic-version": "2023-06-01",
                  "content-type": "application/json",
                },
                body: JSON.stringify({
                  model: "claude-haiku-3-5-20241022",
                  messages: [{
                    role: "user",
                    content: `Generate a short (3-6 word) conversation title for this exchange. Return only the title, no quotes or punctuation. User: ${message}. Assistant summary: ${summarySnippet}`,
                  }],
                  max_tokens: 20,
                }),
              });
              if (titleRes.ok) {
                const titleData = await titleRes.json();
                const newTitle = (titleData.content?.[0]?.text || "").trim();
                if (newTitle) {
                  await adminClient.from("conversations").update({ title: newTitle }).eq("id", conversation_id);
                  sendSSE(controller, "title_update", { title: newTitle });
                }
              }
            } catch (err) {
              console.error("Title generation failed (non-blocking):", err);
            }
          }

          // Build chip context from tool results
          const chipContext: Record<string, unknown> = {};
          for (const t of toolCallLog) {
            if (t.tool === "get_active_deals" && Array.isArray(t.result)) {
              chipContext.activeDealsCount = t.result.length;
              const now = new Date();
              const weekOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
              const nowStr = now.toISOString().split("T")[0];
              const weekStr = weekOut.toISOString().split("T")[0];
              let deadlineCount = 0;
              for (const d of t.result as Record<string, unknown>[]) {
                for (const f of ["closing_date", "inspection_deadline", "financing_deadline", "appraisal_deadline"]) {
                  const v = d[f] as string | undefined;
                  if (v && v >= nowStr && v <= weekStr) deadlineCount++;
                }
              }
              chipContext.upcomingDeadlines = deadlineCount;
            }
            if (t.tool === "update_deal" && t.input?.stage) {
              chipContext.lastDealStage = t.input.stage;
            }
            if (t.tool === "create_deal" && t.input?.stage) {
              chipContext.lastDealStage = t.input.stage;
            }
            if (t.tool === "add_contact" && t.input?.contact_type) {
              chipContext.lastContactType = t.input.contact_type;
            }
          }

          // Collect web search sources
          const webSources = ((controller as any).__sources || []) as { title: string; url: string; domain: string }[];
          // Deduplicate by URL
          const uniqueSources = [...new Map(webSources.map((s: { title: string; url: string; domain: string }) => [s.url, s])).values()];

          // Send done event
          sendSSE(controller, "done", { tools_used: toolsUsed, last_deal_id: lastCreatedDealId, last_contact_id: lastCreatedContactId, chip_context: chipContext, content_type: contentType, undo_actions: undoActions.length > 0 ? undoActions : undefined, sources: uniqueSources.length > 0 ? uniqueSources : undefined });


           // Background memory extraction (fire and forget)
           const toolResults = toolCallLog.map(t => ({ tool: t.tool || t.name }));
           const doExtract = shouldExtractMemoryCheck(assistantContent, toolResults);
           const lastExtraction = lastExtractionMap.get(userId) || 0;
           const cooldownOk = Date.now() - lastExtraction > 5 * 60 * 1000;
           if (doExtract && cooldownOk) {
             const lastMessages = [...history.slice(-3), { role: "user", content: message }, { role: "assistant", content: assistantContent }].slice(-4);
             (async () => {
               lastExtractionMap.set(userId, Date.now());
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
                     return !existingTexts.some((existing: string) => wordSimilarity(existing, lower) > 0.8);
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
          const errMsg = (err as Error)?.message || 'Unknown error';
            const userMessage = errMsg.includes("429") || errMsg.includes("rate")
              ? "I'm being rate limited right now. Please try again in a moment."
              : errMsg.includes("context") || errMsg.includes("token")
              ? "The conversation is getting long. Try starting a new chat for this request."
              : "Something went wrong generating a response. Please try again.";
            sendSSE(controller, "error", { message: userMessage });
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
