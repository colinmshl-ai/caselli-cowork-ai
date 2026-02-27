import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Verify the user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type, entity_id, previous_values } = await req.json();

    if (!type || !entity_id) {
      return new Response(JSON.stringify({ error: "Missing type or entity_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result;

    switch (type) {
      case "delete_deal": {
        const { error } = await adminClient
          .from("deals")
          .delete()
          .eq("id", entity_id)
          .eq("user_id", user.id);
        if (error) throw error;
        result = { success: true, message: "Deal removed" };
        break;
      }
      case "delete_contact": {
        const { error } = await adminClient
          .from("contacts")
          .delete()
          .eq("id", entity_id)
          .eq("user_id", user.id);
        if (error) throw error;
        result = { success: true, message: "Contact removed" };
        break;
      }
      case "revert_deal": {
        if (!previous_values || Object.keys(previous_values).length === 0) {
          return new Response(JSON.stringify({ error: "No previous values to revert to" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const revertData = { ...previous_values, updated_at: new Date().toISOString() };
        const { error } = await adminClient
          .from("deals")
          .update(revertData)
          .eq("id", entity_id)
          .eq("user_id", user.id);
        if (error) throw error;
        result = { success: true, message: "Deal reverted" };
        break;
      }
      default:
        return new Response(JSON.stringify({ error: `Unknown undo type: ${type}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Undo action error:", err);
    return new Response(JSON.stringify({ error: "Failed to undo action" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
