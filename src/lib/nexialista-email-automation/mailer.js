function clean(value) {
  return String(value || "").trim();
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function cleanSecret(value) {
  return clean(value).replace(/^['"]|['"]$/g, "");
}

export function personalizeStep(step, lead = {}) {
  const name = clean(lead.name).split(" ")[0] || "tudo bem";
  const text = step.body.replaceAll("[NOME]", name);
  return {
    ...step,
    text,
    html: renderEmailHtml({ ...step, text }),
  };
}

export function renderEmailHtml(step) {
  const paragraphs = clean(step.text)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => {
      if (paragraph.startsWith("[BOTÃO:")) return "";
      return `<p style="margin:0 0 18px;color:#1f2933;font-size:16px;line-height:1.65;">${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`;
    })
    .join("\n");

  const button = step.ctaUrl
    ? `<p style="margin:28px 0;"><a href="${escapeHtml(step.ctaUrl)}" style="display:inline-block;background:#111827;color:#2dd4bf;border:1px solid rgba(45,212,191,.55);border-radius:999px;padding:14px 22px;text-decoration:none;font-weight:700;">${escapeHtml(step.ctaLabel || "Acessar")}</a></p>`
    : "";

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(step.subject)}</title>
  </head>
  <body style="margin:0;background:#f5f5f2;font-family:Inter,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(step.preview)}</div>
    <main style="max-width:640px;margin:0 auto;padding:32px 18px;">
      <section style="background:#ffffff;border:1px solid #e5e7eb;border-radius:20px;padding:32px;">
        ${paragraphs}
        ${button}
      </section>
    </main>
  </body>
</html>`;
}

export async function sendAutomationEmail({ to, subject, html, text }) {
  const apiKey = cleanSecret(process.env.RESEND_API_KEY);
  const from = cleanSecret(process.env.NEXIALISTA_EMAIL_FROM) || "Leonardo Camacho | Amplify <onboarding@resend.dev>";

  if (!apiKey) {
    return { ok: false, skipped: true, reason: "RESEND_API_KEY ausente" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text,
    }),
  });

  const responseText = await response.text();
  let payload = {};

  try {
    payload = responseText ? JSON.parse(responseText) : {};
  } catch (_error) {
    payload = { raw: responseText };
  }

  if (!response.ok) {
    return { ok: false, status: response.status, error: payload };
  }

  return { ok: true, status: response.status, id: payload.id, payload };
}
