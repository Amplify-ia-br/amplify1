import { Webhook } from "svix";
import { getAmplifyDayServerClient, normalizeEmail } from "../src/lib/amplify-day/invitations.js";
import { sendJson } from "../src/lib/amplify-day/http.js";

function clean(value) {
  return String(value || "").trim();
}

function header(request, name) {
  return request.headers?.get
    ? request.headers.get(name)
    : request.headers?.[name.toLowerCase()];
}

async function rawBody(request) {
  if (typeof request.text === "function") return request.text();
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

const STATUS_BY_EVENT = {
  "email.scheduled": "scheduled",
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.failed": "failed",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.suppressed": "suppressed",
};

function eventError(event) {
  if (!["email.failed", "email.bounced", "email.complained", "email.suppressed"].includes(event.type)) return null;
  const detail = event.data?.bounce?.message
    || event.data?.suppression?.reason
    || event.data?.reason
    || event.type;
  return clean(detail).slice(0, 2000);
}

export default async function handler(request, response) {
  if (String(request.method || "POST").toUpperCase() !== "POST") {
    return sendJson(response, { error: "Método não permitido." }, 405);
  }
  const secret = clean(process.env.RESEND_WEBHOOK_SECRET).replace(/^['"]|['"]$/g, "");
  if (!secret) return sendJson(response, { error: "Webhook não configurado." }, 503);

  let event;
  try {
    const payload = await rawBody(request);
    event = new Webhook(secret).verify(payload, {
      "svix-id": header(request, "svix-id"),
      "svix-timestamp": header(request, "svix-timestamp"),
      "svix-signature": header(request, "svix-signature"),
    });
  } catch (_error) {
    return sendJson(response, { error: "Assinatura inválida." }, 400);
  }

  const nextStatus = STATUS_BY_EVENT[event.type];
  const emailId = clean(event.data?.email_id);
  const isEngagementEvent = ["email.opened", "email.clicked", "email.delivery_delayed"].includes(event.type);
  if ((!nextStatus && !isEngagementEvent) || !emailId) return sendJson(response, { ok: true, ignored: true });

  try {
    const supabase = getAmplifyDayServerClient();
    const { data: invitation, error } = await supabase
      .from("amplify_day_invitations")
      .select("id, guest_email, invite_email_status")
      .eq("invite_email_id", emailId)
      .maybeSingle();
    if (error) throw error;

    let recipient = null;
    if (invitation) {
      const recipientResult = await supabase
        .from("amplify_day_campaign_recipients")
        .select("id, campaign_id, recipient_email, status")
        .eq("invitation_id", invitation.id)
        .maybeSingle();
      if (recipientResult.error) throw recipientResult.error;
      recipient = recipientResult.data;
    }
    if (!recipient) {
      const recipientResult = await supabase
        .from("amplify_day_campaign_recipients")
        .select("id, campaign_id, recipient_email, status")
        .eq("provider_email_id", emailId)
        .maybeSingle();
      if (recipientResult.error) throw recipientResult.error;
      recipient = recipientResult.data;
    }
    if (!invitation && !recipient) return sendJson(response, { ok: true, ignored: true });

    const eventRecipients = Array.isArray(event.data?.to)
      ? event.data.to.map(normalizeEmail)
      : [normalizeEmail(event.data?.to)].filter(Boolean);
    const expectedRecipient = normalizeEmail(invitation?.guest_email || recipient?.recipient_email);
    if (eventRecipients.length && !eventRecipients.includes(expectedRecipient)) {
      return sendJson(response, { ok: true, ignored: true });
    }

    const webhookEventId = clean(header(request, "svix-id"));
    if (recipient && webhookEventId) {
      const eventInsert = await supabase.from("amplify_day_campaign_email_events").insert({
        webhook_event_id: webhookEventId,
        provider_email_id: emailId,
        campaign_recipient_id: recipient.id,
        event_type: event.type,
        occurred_at: event.created_at || new Date().toISOString(),
      });
      if (eventInsert.error?.code === "23505") return sendJson(response, { ok: true, duplicate: true });
      if (eventInsert.error) throw eventInsert.error;
    }

    const occurredAt = event.created_at || new Date().toISOString();
    const terminalFailure = ["failed", "bounced", "complained", "suppressed"].includes(nextStatus);
    if (invitation && nextStatus) {
      const updates = {
        invite_email_status: nextStatus,
        invite_email_error: eventError(event),
        ...(nextStatus === "sent" ? { invite_email_sent_at: occurredAt } : {}),
        ...(nextStatus === "delivered" ? { invite_email_delivered_at: occurredAt } : {}),
      };
      let query = supabase.from("amplify_day_invitations").update(updates).eq("id", invitation.id);
      if (!terminalFailure && nextStatus === "scheduled") query = query.in("invite_email_status", ["sending", "scheduled"]);
      if (!terminalFailure && nextStatus === "sent") query = query.in("invite_email_status", ["scheduled", "sending", "sent"]);
      if (!terminalFailure && nextStatus === "delivered") query = query.in("invite_email_status", ["scheduled", "sending", "sent", "delivered"]);
      const { error: updateError } = await query;
      if (updateError) throw updateError;
    }

    if (recipient) {
      const recipientUpdates = {
        provider_email_id: emailId,
        ...(nextStatus === "scheduled" ? { status: "scheduled" } : {}),
        ...(nextStatus === "sent" ? { status: "sent", sent_at: occurredAt } : {}),
        ...(nextStatus === "delivered" ? { status: "sent", delivered_at: occurredAt } : {}),
        ...(event.type === "email.opened" ? { opened_at: occurredAt } : {}),
        ...(event.type === "email.clicked" ? { clicked_at: occurredAt } : {}),
        ...(event.type === "email.delivery_delayed" ? { delivery_delayed_at: occurredAt } : {}),
        ...(terminalFailure ? {
          status: "failed",
          delivery_error: eventError(event),
          ...(nextStatus === "bounced" ? { bounced_at: occurredAt } : {}),
          ...(nextStatus === "complained" ? { complained_at: occurredAt } : {}),
          ...(nextStatus === "suppressed" ? { suppressed_at: occurredAt } : {}),
        } : {}),
      };
      const { error: recipientUpdateError } = await supabase
        .from("amplify_day_campaign_recipients")
        .update(recipientUpdates)
        .eq("id", recipient.id);
      if (recipientUpdateError) throw recipientUpdateError;
    }
    return sendJson(response, { ok: true });
  } catch (error) {
    console.error("Amplify Day Resend webhook:", error);
    return sendJson(response, { error: "Não foi possível registrar o evento." }, 500);
  }
}
