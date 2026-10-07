const RESEND_URL = "https://api.resend.com/emails";

const LEIA_NOTIFICATION_RECIPIENTS = [
  "adriano.lima@amplify.ia.br",
  "mike@shockwave.academy",
  "samuel.figueiredo@amplify.ia.br",
];

const DEFAULT_BCC = "leonardo.camacho@amplify.ia.br";
const DEFAULT_FROM = "L.E.I.A. | Amplify <comercial@amplify.ia.br>";

function clean(value) {
  return String(value || "").trim();
}

function cleanSecret(value) {
  return clean(value).replace(/^["']|["']$/g, "");
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function interestLabel(value) {
  return value === "implantacao" ? "Implantação e orçamento" : "Masterclass";
}

function formatLabel(value) {
  if (value === "presencial") return "Presencial";
  if (value === "online") return "Online";
  return "Não informado";
}

function renderRow(label, value) {
  if (!clean(value)) return "";
  return `<tr><th align="left" style="padding:10px 14px;border-bottom:1px solid #eadbc8;color:#482080;font-size:13px;vertical-align:top;">${escapeHtml(label)}</th><td style="padding:10px 14px;border-bottom:1px solid #eadbc8;color:#301654;font-size:14px;">${escapeHtml(value)}</td></tr>`;
}

export function renderLeiaLeadNotification(lead) {
  const interest = interestLabel(lead.interest);
  const format = lead.interest === "masterclass" ? formatLabel(lead.masterclassFormat) : "";
  const subject = `Novo lead L.E.I.A. — ${interest} — ${lead.school}`;
  const rows = [
    ["Nome", lead.name],
    ["E-mail", lead.email],
    ["Escola ou rede", lead.school],
    ["Papel", lead.role],
    ["Interesse", interest],
    ["Formato da masterclass", format],
    ["Número de estudantes", lead.students],
    ["Cidade/UF", lead.cityState],
    ["Telefone", lead.phone],
    ["Página de origem", lead.path],
    ["Recebido em", lead.consentAt],
  ];
  const text = rows
    .filter(([, value]) => clean(value))
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
  const html = `<!doctype html>
<html lang="pt-BR">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
  <body style="margin:0;background:#fff3e4;font-family:Arial,Helvetica,sans-serif;color:#301654;">
    <main style="max-width:680px;margin:0 auto;padding:32px 18px;">
      <p style="margin:0 0 10px;color:#c4432c;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">Novo contato pelo site</p>
      <h1 style="margin:0 0 24px;font-size:28px;line-height:1.2;">Novo lead L.E.I.A.</h1>
      <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border:1px solid #eadbc8;border-radius:14px;background:#fff;overflow:hidden;border-collapse:separate;border-spacing:0;">
        ${rows.map(([label, value]) => renderRow(label, value)).join("")}
      </table>
      <p style="margin:24px 0 0;color:#5e4a7e;font-size:13px;line-height:1.5;">O lead também foi registrado no Kit.</p>
    </main>
  </body>
</html>`;
  return { subject, text, html };
}

export async function sendLeiaLeadNotification(lead) {
  const apiKey = cleanSecret(process.env.RESEND_API_KEY);
  if (!apiKey) return { ok: false, skipped: true, reason: "RESEND_API_KEY ausente" };

  const email = renderLeiaLeadNotification(lead);
  const bcc = cleanSecret(process.env.LEIA_EMAIL_BCC) || DEFAULT_BCC;
  const from = cleanSecret(process.env.LEIA_EMAIL_FROM) || DEFAULT_FROM;
  const idempotencySuffix = `${lead.interest}-${lead.email}`
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .slice(0, 180);

  try {
    const response = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "Idempotency-Key": `leia-lead-${idempotencySuffix}`,
      },
      body: JSON.stringify({
        from,
        to: LEIA_NOTIFICATION_RECIPIENTS,
        bcc: [bcc],
        reply_to: lead.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    });
    const responseText = await response.text();
    let payload = {};
    try {
      payload = responseText ? JSON.parse(responseText) : {};
    } catch (_error) {
      payload = { raw: responseText };
    }
    return response.ok
      ? { ok: true, id: payload.id, status: response.status }
      : { ok: false, status: response.status, error: payload };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "Falha ao enviar o e-mail" };
  }
}

