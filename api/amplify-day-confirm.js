import { readJsonBody, sendJson } from "../src/lib/amplify-day/http.js";
import { getAmplifyDayServerClient, resolveInvitation } from "../src/lib/amplify-day/invitations.js";
import { buildIntegrationStatusUpdate, runAmplifyDayIntegrations } from "../src/lib/amplify-day/integrations.js";

function clean(value) {
  return String(value || "").trim();
}

export default async function handler(request, response) {
  if (String(request.method || "POST").toUpperCase() !== "POST") {
    return sendJson(response, { error: "Método não permitido." }, 405);
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (_error) {
    return sendJson(response, { error: "Payload JSON inválido." }, 400);
  }

  const token = clean(body.token);
  const company = clean(body.company);
  const role = clean(body.role);
  if (!token || company.length < 2 || role.length < 2) {
    return sendJson(response, { error: "Empresa e cargo são obrigatórios." }, 400);
  }

  try {
    const resolved = await resolveInvitation(token);
    if (!resolved.ok) return sendJson(response, { error: "Convite inválido, revogado ou expirado." }, 404);
    if (resolved.invitation.status === "confirmed") {
      return sendJson(response, { ok: true, alreadyConfirmed: true, code: resolved.invitation.code });
    }

    const supabase = getAmplifyDayServerClient();
    const { data: confirmed, error: updateError } = await supabase
      .from("amplify_day_invitations")
      .update({
        guest_company: company,
        guest_role: role,
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", resolved.invitation.id)
      .in("status", ["ready", "copied", "visited"])
      .select("*")
      .maybeSingle();

    if (updateError) return sendJson(response, { error: "Não foi possível confirmar a presença." }, 500);
    if (!confirmed) return sendJson(response, { ok: true, alreadyConfirmed: true, code: resolved.invitation.code });

    const integrations = await runAmplifyDayIntegrations({
      ...confirmed,
      inviter: resolved.invitation.inviter,
    });

    await supabase
      .from("amplify_day_invitations")
      .update(buildIntegrationStatusUpdate(integrations))
      .eq("id", confirmed.id);

    return sendJson(response, {
      ok: true,
      code: confirmed.code,
      integrations: { email: integrations.email.ok, kit: integrations.kit.ok },
    });
  } catch (error) {
    console.error("Amplify Day confirmação:", error);
    return sendJson(response, { error: "Não foi possível confirmar agora. Tente novamente." }, 500);
  }
}
