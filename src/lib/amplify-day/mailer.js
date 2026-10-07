import {
  AMPLIFY_DAY_EVENT_DATE,
  AMPLIFY_DAY_EVENT_LOCATION,
} from "./invitations.js";
import { getPreferredName } from "./personalization.js";
import { normalizeAmplifyDayStage } from "./stages.js";

function clean(value) {
  return String(value || "").trim();
}

function cleanSecret(value) {
  return clean(value).replace(/^['"]|['"]$/g, "");
}

function extractEmailAddress(value) {
  const configuredFrom = cleanSecret(value);
  const bracketedAddress = configuredFrom.match(/<([^<>\s]+@[^<>\s]+)>/);
  if (bracketedAddress) return bracketedAddress[1];
  const plainAddress = configuredFrom.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return plainAddress?.[0] || configuredFrom;
}

export function buildInvitationFrom(configuredFrom, inviter) {
  const address = extractEmailAddress(configuredFrom);
  const inviterName = clean(inviter?.name).replace(/[\r\n<>"]/g, "");
  return inviterName ? `${inviterName} | Ampl_IA Day by X-Via <${address}>` : cleanSecret(configuredFrom);
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getStageContent(targetStage) {
  const isTeia = normalizeAmplifyDayStage(targetStage) === "teia";
  return isTeia
    ? {
        label: "Palco TEIA",
        time: "14h às 16h30",
        title: "IA para gestão pública",
        subtitle: "Como otimizar a gestão e o atendimento ao cidadão com IA.",
        secondaryLabel: "Palco Amplify",
        secondaryTime: "15h às 16h30",
        secondaryTitle: "O impacto da adoção de IA na educação",
        secondarySubtitle: "Como a IA está transformando a forma como aprendemos e ensinamos.",
      }
    : {
        label: "Palco Amplify",
        time: "15h às 16h30",
        title: "O impacto da adoção de IA na educação",
        subtitle: "Como a IA está transformando a forma como aprendemos e ensinamos.",
        secondaryLabel: "Palco TEIA",
        secondaryTime: "14h às 16h30",
        secondaryTitle: "IA para gestão pública",
        secondarySubtitle: "Como otimizar a gestão e o atendimento ao cidadão com IA.",
      };
}

export function renderConfirmationEmail(invitation, inviter = invitation?.inviter) {
  const firstName = getPreferredName(invitation.guest_name);
  const senderName = clean(inviter?.name) || "Equipe Ampl_IA Day by X-Via";
  const senderRole = clean(inviter?.role);
  const senderCompany = clean(inviter?.company);
  const senderDescription = [senderRole, senderCompany].filter(Boolean).join(" · ");
  const subject = "Presença confirmada — Ampl_IA Day by X-Via 2026";
  const text = [
    `${firstName}, sua presença está confirmada.`,
    `Nos encontramos em ${AMPLIFY_DAY_EVENT_LOCATION}, no dia ${AMPLIFY_DAY_EVENT_DATE}.`,
    `Seu código pessoal e intransferível de inscrição é ${invitation.code}.`,
    "Guarde este email. Enviaremos as orientações finais antes do evento.",
    [senderName, senderDescription].filter(Boolean).join("\n"),
  ].join("\n\n");
  const html = `<!doctype html>
<html lang="pt-BR">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
  <body style="margin:0;background:#080a0c;font-family:Inter,Arial,sans-serif;color:#f5f7f8;">
    <main style="max-width:620px;margin:0 auto;padding:40px 20px;">
      <p style="margin:0 0 32px;color:#27d8dc;font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;">Ampl_IA Day by X-Via · 2026</p>
      <h1 style="margin:0 0 20px;font-size:34px;line-height:1.1;">${escapeHtml(firstName)}, sua presença está confirmada.</h1>
      <p style="margin:0 0 18px;color:#aeb5bb;font-size:17px;line-height:1.6;">Nos encontramos em ${AMPLIFY_DAY_EVENT_LOCATION}, no dia ${AMPLIFY_DAY_EVENT_DATE}.</p>
      <div style="margin:30px 0;padding:22px;border:1px solid #32383d;background:#111519;">
        <span style="display:block;margin-bottom:8px;color:#7f878e;font-size:12px;text-transform:uppercase;letter-spacing:.1em;">Código pessoal e intransferível</span>
        <strong style="color:#27d8dc;font-size:25px;letter-spacing:.08em;">${escapeHtml(invitation.code)}</strong>
      </div>
      <p style="margin:0 0 36px;color:#aeb5bb;font-size:15px;line-height:1.6;">Guarde este email. Enviaremos as orientações finais antes do evento.</p>
      <p style="margin:0;color:#f5f7f8;font-size:15px;line-height:1.5;">${escapeHtml(senderName)}${senderDescription ? `<br><span style="color:#7f878e;">${escapeHtml(senderDescription)}</span>` : ""}</p>
    </main>
  </body>
</html>`;
  return { subject, text, html };
}

export function renderInvitationEmail(invitation, inviter, link) {
  const firstName = getPreferredName(invitation.guest_name);
  const personal = clean(invitation.personal_message);
  const baseMessage = clean(inviter.base_message).replaceAll("{convidado}", firstName);
  const note = personal || baseMessage;
  const subject = `${inviter.name} reservou um convite para você — Ampl_IA Day by X-Via`;
  const stage = getStageContent(invitation.target_stage);
  const text = [
    `${firstName}, seu convite para o Ampl_IA Day by X-Via está reservado.`,
    `${inviter.name} convidou você para participar desta conversa.`,
    "Você é nosso convidado para o Ampl_IA Day by X-Via, um encontro que reúne pessoas que estão discutindo, aplicando e liderando transformações com Inteligência Artificial.",
    `${AMPLIFY_DAY_EVENT_DATE}. Centro de Convenções Ulysses Guimarães — Piso 1, Acesso 1A, Brasília.`,
    `ESTE CONVITE É ESPECIALMENTE PARA O ${stage.label.toUpperCase()}.`,
    `${stage.label} — ${stage.time}`,
    stage.title.toUpperCase(),
    stage.subtitle,
    `O evento também terá o ${stage.secondaryLabel} — ${stage.secondaryTime}`,
    stage.secondaryTitle.toUpperCase(),
    stage.secondarySubtitle,
    "16h40 às 17h10 — Coffee Break",
    "17h15 às 17h45 — Encerramento",
    "18h — Happy Hour",
    "Uma tarde de conteúdo, troca de experiências e conexões reais sobre os impactos da IA na educação, no trabalho e na gestão pública.",
    note,
    `Espero você lá!\n${inviter.name}\n${inviter.role} da ${inviter.company}`,
    `Confirme sua presença: ${link}`,
  ].filter(Boolean).join("\n\n");
  const noteHtml = note
    ? `<div style="margin:28px 0;padding:18px 20px;border-left:4px solid #12b7c6;background:#e7f4f2;color:#17201f;font-size:16px;line-height:1.5;white-space:pre-line;">${escapeHtml(note)}</div>`
    : "";
  const html = `<!doctype html>
<html lang="pt-BR">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
  <body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#0b0e0c;">
    <main style="max-width:720px;margin:0 auto;background:#f2efe6;padding:42px 40px 52px;box-sizing:border-box;">
      <p style="margin:0 0 34px;color:#058a99;font-size:12px;font-weight:700;line-height:1.5;letter-spacing:.16em;text-transform:uppercase;">Ampl<span style="color:#08b7c7">_IA</span> Day by X-Via · 23 set 2026 · Brasília<br>A partir das 14h</p>
      <h1 style="margin:0 0 18px;font-size:38px;line-height:1.08;letter-spacing:-.035em;">${escapeHtml(firstName)}, seu convite para o Ampl_IA Day by X-Via está reservado.</h1>
      <p style="margin:0 0 30px;color:#33403e;font-size:17px;line-height:1.5;"><strong>${escapeHtml(inviter.name)}</strong> convidou você para participar desta conversa.</p>
      <p style="margin:0 0 28px;font-size:17px;line-height:1.55;">Você é nosso convidado para o <strong>Ampl_IA Day by X-Via</strong>, um encontro que reúne pessoas que estão discutindo, aplicando e liderando transformações com Inteligência Artificial.</p>
      <p style="margin:0 0 30px;font-size:17px;line-height:1.55;"><strong>📅 23 de setembro de 2026</strong><br><strong>📍 Centro de Convenções Ulysses Guimarães</strong><br>Piso 1 · Acesso 1A · Brasília</p>
      <p style="margin:0 0 18px;font-size:17px;line-height:1.5;"><strong>Este convite é especialmente para o ${escapeHtml(stage.label)}.</strong></p>
      <section style="margin:0 0 20px;padding:24px 22px;border:2px solid #12b7c6;background:#ffffff;">
        <p style="margin:0 0 6px;color:#058a99;font-size:18px;font-weight:700;text-transform:uppercase;">${escapeHtml(stage.label)}</p>
        <p style="margin:0 0 20px;font-size:17px;">🕘 ${escapeHtml(stage.time)}</p>
        <h2 style="margin:0 0 8px;font-size:26px;line-height:1.12;text-transform:uppercase;">${escapeHtml(stage.title)}</h2>
        <p style="margin:0;font-size:17px;line-height:1.5;">${escapeHtml(stage.subtitle)}</p>
      </section>
      <section style="padding:18px 0;border-top:1px solid #c7c5bc;">
        <p style="margin:0 0 12px;color:#59615f;font-size:14px;line-height:1.5;">O evento também terá outro palco simultâneo:</p>
        <p style="margin:0 0 5px;font-size:15px;font-weight:700;text-transform:uppercase;">${escapeHtml(stage.secondaryLabel)} <span style="font-weight:400;text-transform:none;">· ${escapeHtml(stage.secondaryTime)}</span></p>
        <p style="margin:0 0 4px;font-size:17px;font-weight:700;line-height:1.25;text-transform:uppercase;">${escapeHtml(stage.secondaryTitle)}</p>
        <p style="margin:0;color:#59615f;font-size:14px;line-height:1.45;">${escapeHtml(stage.secondarySubtitle)}</p>
      </section>
      <div style="padding:22px 0;border-top:1px solid #c7c5bc;font-size:16px;line-height:1.85;">
        ☕ 16h40 às 17h10 — <strong>Coffee Break</strong><br>
        🎤 17h15 às 17h45 — <strong>Encerramento</strong><br>
        🥂 18h — <strong>Happy Hour</strong>
      </div>
      <p style="margin:8px 0 0;font-size:17px;line-height:1.55;">Uma tarde de conteúdo, troca de experiências e conexões reais sobre os impactos da IA na educação, no trabalho e na gestão pública.</p>
      ${noteHtml}
      <p style="margin:30px 0;font-size:16px;line-height:1.5;">Espero você lá!<br><strong>${escapeHtml(inviter.name)}</strong><br>${escapeHtml(inviter.role)} da ${escapeHtml(inviter.company)}</p>
      <a href="${escapeHtml(link)}" style="display:block;margin:30px 0 34px;padding:19px 20px;background:#12b7c6;border:1px solid #0b0e0c;color:#0b0e0c;font-size:14px;font-weight:700;letter-spacing:.12em;text-align:center;text-decoration:none;text-transform:uppercase;">Confirme sua presença</a>
      <div style="padding-top:22px;border-top:1px solid #c7c5bc;">
        <p style="margin:0;color:#33403e;font-size:14px;line-height:1.55;"><strong>Centro de Convenções Ulysses Guimarães</strong><br>Piso 1 · Acesso 1A · Brasília<br>23 de setembro de 2026 · A partir das 14h</p>
      </div>
    </main>
  </body>
</html>`;
  return { subject, text, html };
}

export function renderInstitutionalInvitationEmail(recipient, inviter, publicLink) {
  const subject = "Convite para a liderança da sua instituição — Ampl_IA Day by X-Via";
  const text = [
    "Ampl_IA Day by X-Via · 2026",
    "O IMPACTO DA ADOÇÃO DE IA NA EDUCAÇÃO",
    "No dia 23 de setembro, de 14h às 18h, Brasília recebe um encontro presencial e por convite com gestores públicos e privados, educadores, normatizadores e especialistas que já estão aplicando a IA em sala e descobrindo suas potencialidades, impactos e limites no ensino.",
    "Mais do que falar sobre tendências, será uma conversa entre quem decide, implementa e transforma.",
    "PALCO AMPLIFY",
    "O IMPACTO DA ADOÇÃO DE IA NA EDUCAÇÃO",
    "A programação reunirá palestras, painéis, debates e experiências reais — criando conexões entre escolas, governo e especialistas em IA.",
    "HAPPY HOUR · 18h, na Shock Wave Academy",
    "Queremos você nessa conversa.",
    `CONFIRME SUA PARTICIPAÇÃO: ${publicLink}`,
    "23 de setembro de 2026",
    "Centro de Convenções Ulysses Guimarães",
    `${inviter.name}\n${inviter.role} da ${inviter.company}`,
  ].join("\n\n");
  const html = `<!doctype html>
<html lang="pt-BR">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
  <body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#0b0e0c;">
    <main style="max-width:720px;margin:0 auto;background:#f2efe6;padding:42px 40px 52px;box-sizing:border-box;">
      <p style="margin:0 0 12px;color:#058a99;font-size:12px;font-weight:700;line-height:1.5;letter-spacing:.16em;text-transform:uppercase;">Ampl<span style="color:#08b7c7">_IA</span> Day by X-Via · 2026</p>
      <h1 style="margin:0 0 28px;font-size:38px;line-height:1.08;letter-spacing:-.035em;text-transform:uppercase;">O impacto da adoção de IA na educação</h1>
      <p style="margin:0 0 20px;font-size:17px;line-height:1.55;">No dia <strong>23 de setembro, de 14h às 18h</strong>, Brasília recebe um encontro presencial e por convite com gestores públicos e privados, educadores, normatizadores e especialistas que já estão aplicando a IA em sala e descobrindo suas potencialidades, impactos e limites no ensino.</p>
      <p style="margin:0 0 28px;font-size:17px;line-height:1.55;">Mais do que falar sobre tendências, será uma conversa entre quem decide, implementa e transforma.</p>
      <section style="margin:0 0 24px;padding:24px 22px;border:2px solid #12b7c6;background:#ffffff;">
        <p style="margin:0 0 16px;color:#058a99;font-size:16px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Palco Amplify</p>
        <h2 style="margin:0 0 12px;font-size:26px;line-height:1.12;text-transform:uppercase;">O impacto da adoção de IA na educação</h2>
        <p style="margin:0;font-size:17px;line-height:1.5;">A programação reunirá palestras, painéis, debates e experiências reais — criando conexões entre escolas, governo e especialistas em IA.</p>
      </section>
      <p style="margin:0 0 28px;font-size:17px;line-height:1.55;"><strong>Happy Hour · 18h</strong><br>Shock Wave Academy</p>
      <p style="margin:0 0 24px;font-size:22px;font-weight:700;line-height:1.35;">Queremos você nessa conversa.</p>
      <a href="${escapeHtml(publicLink)}" style="display:block;margin:30px 0 34px;padding:19px 20px;background:#12b7c6;border:1px solid #0b0e0c;color:#0b0e0c;font-size:14px;font-weight:700;letter-spacing:.09em;text-align:center;text-decoration:none;text-transform:uppercase;">Confirme sua participação</a>
      <p style="margin:0 0 28px;font-size:17px;line-height:1.55;"><strong>23 de setembro de 2026</strong><br>Centro de Convenções Ulysses Guimarães</p>
      <p style="margin:0;font-size:16px;line-height:1.5;"><strong>${escapeHtml(inviter.name)}</strong><br>${escapeHtml(inviter.role)} da ${escapeHtml(inviter.company)}</p>
    </main>
  </body>
</html>`;
  return { subject, text, html };
}

export function buildInstitutionalCampaignLink(publicLink, recipientId, targetStage = "amplify") {
  const url = new URL(publicLink);
  url.searchParams.set("palco", normalizeAmplifyDayStage(targetStage));
  url.searchParams.set("utm_source", "email");
  url.searchParams.set("utm_medium", "invite");
  url.searchParams.set("utm_campaign", "amplify_day_2026_educacao");
  url.searchParams.set("utm_content", "institutional");
  if (recipientId) url.searchParams.set("crid", String(recipientId));
  return url.toString();
}

export function buildOpenInvitationLink(publicLink, targetStage = "teia") {
  const stage = normalizeAmplifyDayStage(targetStage);
  const url = new URL(publicLink);
  url.searchParams.set("palco", stage);
  url.searchParams.set("utm_source", "convite_aberto");
  url.searchParams.set("utm_medium", "link");
  url.searchParams.set("utm_campaign", "amplify_day_2026");
  url.searchParams.set("utm_content", `palco_${stage}`);
  return url.toString();
}

async function sendResendEmail({ payload, idempotencyKey }) {
  const apiKey = cleanSecret(process.env.RESEND_API_KEY);
  if (!apiKey) return { ok: false, skipped: true, reason: "Configuração do Resend ausente." };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(payload),
  });
  const responseText = await response.text();
  let responsePayload = {};
  try {
    responsePayload = responseText ? JSON.parse(responseText) : {};
  } catch (_error) {
    responsePayload = { raw: responseText };
  }
  return response.ok
    ? { ok: true, id: responsePayload.id, status: response.status }
    : { ok: false, status: response.status, error: responsePayload };
}

export async function sendAmplifyDayInvitation(invitation, inviter, link, cc = [], options = {}) {
  const configuredFrom = cleanSecret(process.env.AMPLIFY_DAY_EMAIL_FROM);
  const replyTo = clean(inviter?.email) || cleanSecret(process.env.AMPLIFY_DAY_EMAIL_REPLY_TO);
  if (!configuredFrom || !replyTo) {
    return { ok: false, skipped: true, reason: "Remetente do Amplify Day não configurado." };
  }
  const from = buildInvitationFrom(configuredFrom, inviter);
  const email = renderInvitationEmail(invitation, inviter, link);
  return sendResendEmail({
    idempotencyKey: `amplify-day-invite-${invitation.id}`,
    payload: {
      from,
      to: [invitation.guest_email],
      cc,
      reply_to: replyTo,
      subject: email.subject,
      html: email.html,
      text: email.text,
      tags: [
        { name: "event", value: "amplify-day-2026" },
        { name: "invitation", value: String(invitation.id).replaceAll("-", "_") },
      ],
      ...(options.scheduledAt ? { scheduled_at: options.scheduledAt } : {}),
    },
  });
}

export async function sendAmplifyDayInstitutionalInvitation(recipient, inviter, link, cc = [], options = {}) {
  const configuredFrom = cleanSecret(process.env.AMPLIFY_DAY_EMAIL_FROM);
  const replyTo = clean(inviter?.email) || cleanSecret(process.env.AMPLIFY_DAY_EMAIL_REPLY_TO);
  if (!configuredFrom || !replyTo) {
    return { ok: false, skipped: true, reason: "Remetente do Amplify Day não configurado." };
  }
  const email = renderInstitutionalInvitationEmail(recipient, inviter, link);
  return sendResendEmail({
    idempotencyKey: `amplify-day-campaign-${recipient.id}`,
    payload: {
      from: buildInvitationFrom(configuredFrom, inviter),
      to: [recipient.recipient_email],
      cc,
      reply_to: replyTo,
      subject: email.subject,
      html: email.html,
      text: email.text,
      tags: [
        { name: "event", value: "amplify-day-2026" },
        { name: "campaign_recipient", value: String(recipient.id).replaceAll("-", "_") },
        { name: "audience", value: "institutional" },
      ],
      ...(options.scheduledAt ? { scheduled_at: options.scheduledAt } : {}),
    },
  });
}

export async function sendAmplifyDayConfirmation(invitation) {
  const apiKey = cleanSecret(process.env.RESEND_API_KEY);
  const from = cleanSecret(process.env.AMPLIFY_DAY_EMAIL_FROM);
  const replyTo = clean(invitation?.inviter?.email) || cleanSecret(process.env.AMPLIFY_DAY_EMAIL_REPLY_TO);
  if (!apiKey || !from || !replyTo) {
    return { ok: false, skipped: true, reason: "Configuração do Resend ausente." };
  }

  const email = renderConfirmationEmail(invitation, invitation.inviter);
  return sendResendEmail({
    idempotencyKey: `amplify-day-confirmation-${invitation.id}`,
    payload: {
      from: buildInvitationFrom(from, invitation.inviter),
      to: [invitation.guest_email],
      reply_to: replyTo,
      subject: email.subject,
      html: email.html,
      text: email.text,
    },
  });
}
