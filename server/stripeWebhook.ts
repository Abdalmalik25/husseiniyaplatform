import { TRPCError } from "@trpc/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-15",
});

/**
 * Verifies the raw request body and signature from Stripe, then returns the
 * deserialized event. Throws (never auto-responds) so the caller controls HTTP
 * semantics — this keeps it testable in isolation.
 */
export function verifyStripeSignature(
  rawBody: string | Buffer,
  signature: string
): Stripe.Event {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Stripe secret key is not configured.",
    });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
  if (!webhookSecret) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Stripe webhook secret is not configured.",
    });
  }

  try {
    return stripe.webhooks.constructEvent(
      Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, "utf8"),
      signature,
      webhookSecret
    );
  } catch (err: unknown) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Webhook signature verification failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}

/**
 * Processes a `checkout.session.completed` event by granting the paid credits
 * that correspond to the purchased plan. Only events with a valid signature
 * (guaranteed by `verifyStripeSignature`) reach here, so we trust the payload.
 *
 * Credits are added to the `paidCredits` bucket. The amount is derived from
 * the plan mapping inside `payments.ts` — keeping all pricing knowledge in one
 * place avoids drift between the UI and the server.
 */
export async function handleStripeWebhookEvent(
  event: Stripe.Event
): Promise<{ granted: number; userId: number } | null> {
  if (event.type !== "checkout.session.completed") {
    return null; // Non-relevant event type — safely ignored.
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // client_reference_id is set by us when creating the Checkout Session and
  // maps to our internal user.id. Its absence means the session wasn't tied
  // to a user — reject rather than silently dropping credits.
  const clientRef = session.client_reference_id;
  if (!clientRef) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Webhook session is missing client_reference_id (user id).",
    });
  }

  const userId = Number(clientRef);
  if (!Number.isFinite(userId) || userId <= 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid user id in webhook session." });
  }

  // Look up which plan the customer bought so we can grant the right amount
  // of credits. We store `planId` in the Checkout Session's `metadata`.
  const planId = session.metadata?.planId;
  const creditsToGrant = resolveCreditsForPlan(planId);
  if (creditsToGrant > 0) {
    const { grantPaidCredits } = await import("./db");
    await grantPaidCredits(userId, creditsToGrant, `stripe-${session.id}`);
  }

  return { granted: creditsToGrant, userId };
}

/**
 * Maps a planId to the number of paid credits to grant.
 * Keep this in sync with `shared/config.ts` `plans` and `payments.ts`.
 */
function resolveCreditsForPlan(planId: string | undefined): number {
  switch (planId) {
    case "business":
      return 10;
    case "enterprise":
      return 100;
    case "trial":
      return 0; // Trials never grant paid credits via webhook.
    default:
      return 0; // Unknown plan — do not credit (safe-by-default).
  }
}
