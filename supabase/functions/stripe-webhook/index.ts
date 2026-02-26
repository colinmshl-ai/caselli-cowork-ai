import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRICE_TO_TIER: Record<string, string> = {
  price_1T4t1qF9b6Nn9gJr0a0oJFQW: "solo",
  price_1T4t1tF9b6Nn9gJrOjhiztez: "top_producer",
  price_1T4t1wF9b6Nn9gJrYd9hR7Iz: "team",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      logStep("ERROR", "STRIPE_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(JSON.stringify({ error: "No signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      logStep("Signature verification failed", { error: String(err) });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Event received", { type: event.type, id: event.id });

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        if (!userId) {
          logStep("No user_id in session metadata", { sessionId: session.id });
          break;
        }

        // Get subscription to find price/tier
        let planTier = "solo";
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const priceId = subscription.items.data[0]?.price?.id;
          if (priceId && PRICE_TO_TIER[priceId]) {
            planTier = PRICE_TO_TIER[priceId];
          }
        }

        const { error } = await adminClient
          .from("profiles")
          .update({
            subscription_status: "active",
            plan_tier: planTier,
          })
          .eq("id", userId);

        logStep("checkout.session.completed", { userId, planTier, error: error?.message });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerEmail = await getCustomerEmail(stripe, subscription.customer as string);
        if (customerEmail) {
          const { data: user } = await adminClient
            .from("profiles")
            .select("id")
            .eq("id", (await findUserByEmail(adminClient, customerEmail)) || "")
            .single();

          if (user) {
            await adminClient
              .from("profiles")
              .update({ subscription_status: "cancelled" })
              .eq("id", user.id);
            logStep("subscription.deleted", { userId: user.id });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerEmail = await getCustomerEmail(stripe, invoice.customer as string);
        if (customerEmail) {
          const userId = await findUserByEmail(adminClient, customerEmail);
          if (userId) {
            await adminClient
              .from("profiles")
              .update({ subscription_status: "past_due" })
              .eq("id", userId);
            logStep("invoice.payment_failed", { userId });
          }
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    logStep("ERROR", { message: String(err) });
    return new Response(JSON.stringify({ error: "Webhook handler error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function getCustomerEmail(stripe: Stripe, customerId: string): Promise<string | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if ("deleted" in customer && customer.deleted) return null;
    return (customer as Stripe.Customer).email || null;
  } catch {
    return null;
  }
}

async function findUserByEmail(
  adminClient: ReturnType<typeof createClient>,
  email: string
): Promise<string | null> {
  const { data } = await adminClient.auth.admin.listUsers();
  const user = data?.users?.find((u) => u.email === email);
  return user?.id || null;
}
