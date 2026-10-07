import { captureLeiaLead } from "./kit.js";
import { sendLeiaLeadNotification } from "./mailer.js";

function settledResult(result) {
  if (result.status === "fulfilled") return result.value;
  return {
    ok: false,
    reason: result.reason instanceof Error ? result.reason.message : String(result.reason || "Falha desconhecida"),
  };
}

export async function captureLeiaLeadConversion(lead) {
  const [kitResult, emailResult] = await Promise.allSettled([
    captureLeiaLead(lead),
    sendLeiaLeadNotification(lead),
  ]);
  const kit = settledResult(kitResult);
  const email = settledResult(emailResult);
  return { ok: Boolean(kit.ok && email.ok), kit, email };
}

