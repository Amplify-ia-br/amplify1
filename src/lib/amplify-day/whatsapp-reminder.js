const STAGE_LABELS = {
  amplify: "Palco Amplify",
  teia: "Palco TEIA",
  streaming: "Streaming",
};

function clean(value) {
  return String(value || "").trim();
}

export function normalizeBrazilianWhatsapp(value) {
  let digits = clean(value).replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (!/^55\d{10,11}$/.test(digits)) return null;
  return digits;
}

export function getReminderAudience(tags = []) {
  const names = new Set(tags.map((tag) => clean(tag).toLowerCase()));
  const matches = [
    names.has("amplify-day-2026-palco-amplify") ? "amplify" : null,
    names.has("amplify-day-2026-palco-teia") ? "teia" : null,
    names.has("amplify-day-2026-streaming") ? "streaming" : null,
  ].filter(Boolean);
  return matches.length === 1 ? matches[0] : null;
}

export function getSubscriberWhatsapp(subscriber = {}) {
  return normalizeBrazilianWhatsapp(
    subscriber.fields?.phone_number ||
    subscriber.fields?.whatsapp ||
    subscriber.fields?.phone ||
    subscriber.phone_number,
  );
}

export function getSubscriberCode(subscriber = {}) {
  return clean(subscriber.fields?.amplify_day_registration_code);
}

function firstName(value) {
  return clean(value).split(/\s+/)[0] || "tudo bem";
}

function hash(value) {
  return [...clean(value)].reduce((total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0, 0);
}

function codeLine(code) {
  return code ? `\nSeu código de inscrição é *${code}*.` : "";
}

const PRESENTIAL_VARIANTS = [
  ({ name, stage, schedule, code }) => `Olá, ${name}! Aqui é a equipe do Ampl_IA Day by X-Via.\n\nÉ hoje: seu acesso é para o *${stage}*. ${schedule}\n\nLocal: Centro de Convenções Ulysses Guimarães — Piso 1, Acesso 1A.${codeLine(code)}\n\nA entrada é a mesma do *CONAT*. Procure o pórtico laranja.\n\n☕ Coffee break às 17h\n🎤 Retorno às 17h30 para o anúncio final do lançamento.`,
  ({ name, stage, schedule, code }) => `Oi, ${name}! Passando para lembrar que o Ampl_IA Day acontece hoje.\n\nVocê está no *${stage}*. ${schedule}\n\nO encontro será no Centro de Convenções Ulysses Guimarães, Piso 1, Acesso 1A.${codeLine(code)}\n\nUse a mesma entrada do *CONAT*, identificada pelo pórtico laranja.\n\nÀs 17h teremos coffee break e, às 17h30, o anúncio final do lançamento.`,
  ({ name, stage, schedule, code }) => `${name}, esperamos você hoje no Ampl_IA Day by X-Via!\n\n📍 Centro de Convenções Ulysses Guimarães\nPiso 1 · Acesso 1A\n🎙️ *${stage}*\n${schedule}${codeLine(code)}\n\nA entrada do evento é a mesma do *CONAT*, identificada pelo pórtico laranja.\n\nCoffee break às 17h e retorno às 17h30 para o anúncio final do lançamento.`,
  ({ name, stage, schedule, code }) => `Olá, ${name}! Seu lembrete do Ampl_IA Day: hoje esperamos você no *${stage}*.\n\n${schedule}\nLocal: Centro de Convenções Ulysses Guimarães, Piso 1, Acesso 1A.${codeLine(code)}\n\nEntre pelo mesmo acesso do *CONAT* — o pórtico laranja.\n\nDepois da programação, teremos coffee break às 17h e anúncio final às 17h30.`,
  ({ name, stage, schedule, code }) => `Oi, ${name}! Está chegando a hora do Ampl_IA Day by X-Via.\n\nSeu palco: *${stage}*\n${schedule}\nLocal: Centro de Convenções Ulysses Guimarães, Piso 1, Acesso 1A.${codeLine(code)}\n\nA referência da entrada é o pórtico laranja do *CONAT*.\n\n17h — coffee break\n17h30 — anúncio final do lançamento.`,
];

const STREAMING_VARIANTS = [
  ({ name }) => `Olá, ${name}! Aqui é a equipe do Ampl_IA Day by X-Via. Temos uma atualização importante: a transmissão ao vivo não será realizada. A gravação será disponibilizada depois do evento e enviada por e-mail assim que estiver pronta.`,
  ({ name }) => `Oi, ${name}! Uma atualização sobre o Ampl_IA Day: não teremos transmissão ao vivo. Depois do evento, enviaremos por e-mail o acesso à gravação assim que ela estiver disponível.`,
  ({ name }) => `${name}, passando para avisar que o streaming ao vivo do Ampl_IA Day foi cancelado. A gravação do encontro será preparada e enviada por e-mail após o evento.`,
  ({ name }) => `Olá, ${name}! A transmissão do Ampl_IA Day não acontecerá ao vivo. Mas você receberá por e-mail a gravação completa assim que ela estiver pronta.`,
  ({ name }) => `Oi, ${name}! Mudança importante no Ampl_IA Day: não haverá streaming ao vivo. Vamos gravar o conteúdo e mandar o acesso por e-mail depois do evento.`,
];

export function renderWhatsappReminder(subscriber, audience) {
  if (!STAGE_LABELS[audience]) throw new Error(`Público inválido: ${audience}`);
  const name = firstName(subscriber.first_name || subscriber.name);
  const code = getSubscriberCode(subscriber);
  const variant = hash(`${subscriber.id || subscriber.email_address}:${audience}`) % 5;
  const message = audience === "streaming"
    ? STREAMING_VARIANTS[variant]({ name })
    : PRESENTIAL_VARIANTS[variant]({
        name,
        code,
        stage: STAGE_LABELS[audience],
        schedule: audience === "teia"
          ? "Credenciamento às 14h30; painéis das 15h às 16h30."
          : "Credenciamento às 14h30; debate das 15h às 16h30.",
      });

  return `${message}\n\nDúvidas? Fale com a Ana: +55 (61) 9 9925-0794.\n\nLeonardo Camacho\nDiretor de IA da Amplify\n\nSe não quiser receber outras mensagens, responda *SAIR*.`;
}

export function getReminderMedia(audience, baseUrl = "https://amplify.ia.br") {
  if (!['amplify', 'teia'].includes(audience)) {
    throw new Error(`Não há pacote de mídia presencial para o público: ${audience}`);
  }
  const origin = clean(baseUrl).replace(/\/$/, "");
  if (!/^https:\/\//i.test(origin)) throw new Error("A URL pública das mídias deve usar HTTPS.");
  return {
    stagePost: `${origin}/amplify-day/whatsapp/palco-${audience}.jpeg`,
    map: `${origin}/amplify-day/whatsapp/mapa-entrada.jpeg`,
    video: `${origin}/amplify-day/whatsapp/como-chegar.mp4`,
  };
}

export function buildReminderRecipients(subscribers, options = {}) {
  const allowedAudiences = new Set(options.audiences || ["amplify", "teia", "streaming"]);
  const seenPhones = new Set();
  const recipients = [];
  const skipped = { noPhone: 0, ambiguousAudience: 0, duplicatePhone: 0, audienceDisabled: 0 };

  for (const subscriber of subscribers) {
    const audience = subscriber.audience || getReminderAudience(subscriber.tag_names || []);
    if (!audience) {
      skipped.ambiguousAudience += 1;
      continue;
    }
    if (!allowedAudiences.has(audience)) {
      skipped.audienceDisabled += 1;
      continue;
    }
    const phone = getSubscriberWhatsapp(subscriber);
    if (!phone) {
      skipped.noPhone += 1;
      continue;
    }
    if (seenPhones.has(phone)) {
      skipped.duplicatePhone += 1;
      continue;
    }
    seenPhones.add(phone);
    recipients.push({
      id: String(subscriber.id),
      email: clean(subscriber.email_address).toLowerCase(),
      name: firstName(subscriber.first_name),
      phone,
      audience,
      code: getSubscriberCode(subscriber),
      message: renderWhatsappReminder(subscriber, audience),
    });
  }

  return { recipients, skipped };
}

export function countRecipientsByAudience(recipients = []) {
  return recipients.reduce((totals, recipient) => {
    totals[recipient.audience] = (totals[recipient.audience] || 0) + 1;
    totals.total += 1;
    return totals;
  }, { amplify: 0, teia: 0, streaming: 0, total: 0 });
}

export function assertExpectedCounts(actual, expected) {
  const keys = ["amplify", "teia", "streaming"];
  const mismatches = keys.filter((key) => Number(actual[key]) !== Number(expected[key]));
  if (mismatches.length) {
    throw new Error(`Trava de público acionada: ${mismatches.map((key) => `${key}=${actual[key]} (esperado ${expected[key]})`).join(", ")}.`);
  }
}

export function maskPhone(phone) {
  return `${phone.slice(0, 4)}•••••${phone.slice(-4)}`;
}

export async function sendZapiText({ phone, message, fetchImpl = fetch, delayMessage = 5 }) {
  return sendZapiRequest({ endpoint: "send-text", payload: { phone, message, delayMessage }, fetchImpl });
}

async function sendZapiRequest({ endpoint, payload, fetchImpl = fetch }) {
  const instanceId = clean(process.env.ZAPI_INSTANCE_ID);
  const instanceToken = clean(process.env.ZAPI_INSTANCE_TOKEN);
  const clientToken = clean(process.env.ZAPI_CLIENT_TOKEN);
  if (!instanceId || !instanceToken || !clientToken) throw new Error("Credenciais da Z-API não configuradas.");

  const headers = { "Client-Token": clientToken, "Content-Type": "application/json" };

  const response = await fetchImpl(`https://api.z-api.io/instances/${encodeURIComponent(instanceId)}/token/${encodeURIComponent(instanceToken)}/${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.messageId) {
    throw new Error(`Falha na Z-API (HTTP ${response.status}): ${clean(body.error || body.message || "resposta inválida")}`);
  }
  return { ok: true, messageId: body.messageId, zaapId: body.zaapId || null };
}

export async function sendZapiMediaSequence({
  phone,
  audience,
  message,
  baseUrl = process.env.AMPLIFY_DAY_PUBLIC_URL || "https://amplify.ia.br",
  fetchImpl = fetch,
  sleepImpl = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  mediaIntervalMs = 5_000,
}) {
  const proxyUrl = clean(process.env.ZAPI_PROXY_URL);
  const proxySecret = clean(process.env.WHATSAPP_DISPATCH_SECRET);
  if (proxyUrl) {
    if (!proxySecret) throw new Error("WHATSAPP_DISPATCH_SECRET não configurada.");
    const response = await fetchImpl(proxyUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${proxySecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone, audience, message }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.ok) {
      throw new Error(`Falha no proxy da Z-API (HTTP ${response.status}): ${clean(body.error || "resposta inválida")}`);
    }
    return (body.messageIds || []).map((messageId) => ({ ok: true, messageId, zaapId: null }));
  }

  const media = getReminderMedia(audience, baseUrl);
  const requests = [
    { endpoint: "send-image", payload: { phone, image: media.stagePost, caption: message, delayMessage: 5, viewOnce: false } },
    { endpoint: "send-image", payload: { phone, image: media.map, caption: "Mapa de acesso: procure a Entrada 1A, Ala Norte, identificada pelo pórtico do 47º CONAT.", delayMessage: 5, viewOnce: false } },
    { endpoint: "send-video", payload: { phone, video: media.video, caption: "Veja no vídeo como chegar à entrada do Ampl_IA Day.", delayMessage: 5, viewOnce: false, async: true } },
  ];
  const results = [];
  for (let index = 0; index < requests.length; index += 1) {
    results.push(await sendZapiRequest({ ...requests[index], fetchImpl }));
    if (index < requests.length - 1) await sleepImpl(Math.max(1_000, Number(mediaIntervalMs)));
  }
  return results;
}
