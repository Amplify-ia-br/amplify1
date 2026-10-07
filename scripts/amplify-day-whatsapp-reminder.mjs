import {
  assertExpectedCounts,
  buildReminderRecipients,
  countRecipientsByAudience,
  getReminderMedia,
  maskPhone,
  sendZapiMediaSequence,
} from "../src/lib/amplify-day/whatsapp-reminder.js";

const KIT_BASE_URL = "https://api.kit.com/v4";
const TEST_TAG = "amplify-day:2026:interesse:teste";
const SENT_TAG = "amplify-day-2026-whatsapp-logistica-23-set-enviado";
const STAGE_TAGS = {
  amplify: "amplify-day-2026-palco-amplify",
  teia: "amplify-day-2026-palco-teia",
  streaming: "amplify-day-2026-streaming",
};

function clean(value) {
  return String(value || "").trim();
}

function parseArguments(argv) {
  const options = { send: false, audiences: ["amplify", "teia"], expected: {} };
  for (const argument of argv) {
    if (argument === "--send") options.send = true;
    else if (argument.startsWith("--audiences=")) options.audiences = argument.split("=")[1].split(",").map(clean).filter(Boolean);
    else if (argument.startsWith("--expected-amplify=")) options.expected.amplify = Number(argument.split("=")[1]);
    else if (argument.startsWith("--expected-teia=")) options.expected.teia = Number(argument.split("=")[1]);
    else if (argument.startsWith("--expected-streaming=")) options.expected.streaming = Number(argument.split("=")[1]);
    else throw new Error(`Argumento desconhecido: ${argument}`);
  }
  const invalidAudience = options.audiences.find((audience) => !["amplify", "teia"].includes(audience));
  if (invalidAudience) throw new Error(`Este pacote de mídias é apenas presencial; público inválido: ${invalidAudience}`);
  return options;
}

function getKitApiKey() {
  return clean(process.env.KIT_API_KEY).replace(/^Bearer\s+/i, "").replace(/^['"]|['"]$/g, "");
}

async function kitRequest(path, { method = "GET", body } = {}) {
  const apiKey = getKitApiKey();
  if (!apiKey) throw new Error("KIT_API_KEY não configurada.");
  const response = await fetch(`${KIT_BASE_URL}${path}`, {
    method,
    headers: { Accept: "application/json", "Content-Type": "application/json", "X-Kit-Api-Key": apiKey },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Kit HTTP ${response.status}: ${JSON.stringify(payload)}`);
  return payload;
}

async function listAll(path, key) {
  const values = [];
  let after = "";
  do {
    const separator = path.includes("?") ? "&" : "?";
    const payload = await kitRequest(`${path}${separator}per_page=1000${after ? `&after=${encodeURIComponent(after)}` : ""}`);
    values.push(...(payload[key] || []));
    after = payload.pagination?.has_next_page ? payload.pagination.end_cursor : "";
  } while (after);
  return values;
}

async function listTags() {
  return listAll("/tags?include=subscriber_count", "tags");
}

async function listSubscribersForTag(tagId) {
  return listAll(`/tags/${encodeURIComponent(tagId)}/subscribers?status=active`, "subscribers");
}

async function ensureTag(tags, name) {
  const existing = tags.find((tag) => clean(tag.name).toLowerCase() === name.toLowerCase());
  if (existing) return existing;
  const created = await kitRequest("/tags", { method: "POST", body: { name } });
  return created.tag || created;
}

async function tagSubscriber(tagId, email) {
  await kitRequest(`/tags/${encodeURIComponent(tagId)}/subscribers`, { method: "POST", body: { email_address: email } });
}

function tagByName(tags, name, required = true) {
  const tag = tags.find((candidate) => clean(candidate.name).toLowerCase() === name.toLowerCase());
  if (!tag && required) throw new Error(`Tag obrigatória não encontrada no Kit: ${name}`);
  return tag || null;
}

async function loadAudience() {
  const tags = await listTags();
  const testTag = tagByName(tags, TEST_TAG, false);
  const sentTag = tagByName(tags, SENT_TAG, false);
  const stageTags = Object.fromEntries(Object.entries(STAGE_TAGS).map(([audience, name]) => [audience, tagByName(tags, name)]));

  const [testSubscribers, sentSubscribers, ...stageLists] = await Promise.all([
    testTag ? listSubscribersForTag(testTag.id) : [],
    sentTag ? listSubscribersForTag(sentTag.id) : [],
    ...Object.values(stageTags).map((tag) => listSubscribersForTag(tag.id)),
  ]);
  const sentExclusions = process.env.WHATSAPP_IGNORE_SENT === "1" ? [] : sentSubscribers;
  const excludedIds = new Set([...testSubscribers, ...sentExclusions].map((subscriber) => String(subscriber.id)));
  const byId = new Map();

  Object.keys(stageTags).forEach((audience, index) => {
    for (const subscriber of stageLists[index]) {
      const id = String(subscriber.id);
      if (excludedIds.has(id)) continue;
      const current = byId.get(id) || { ...subscriber, tag_names: [] };
      current.tag_names = [...new Set([...current.tag_names, STAGE_TAGS[audience]])];
      byId.set(id, current);
    }
  });

  return { subscribers: [...byId.values()], tags, sentTag };
}

function assertSendApproval(options, counts) {
  if (!options.send) return;
  if (process.env.WHATSAPP_REMINDER_APPROVAL !== "SEND") {
    throw new Error("Envio bloqueado: defina WHATSAPP_REMINDER_APPROVAL=SEND somente após revisar a prévia.");
  }
  for (const audience of options.audiences) {
    if (!Number.isInteger(options.expected[audience])) {
      throw new Error(`Envio bloqueado: informe --expected-${audience}=N.`);
    }
  }
  assertExpectedCounts(counts, {
    amplify: options.audiences.includes("amplify") ? options.expected.amplify : 0,
    teia: options.audiences.includes("teia") ? options.expected.teia : 0,
    streaming: options.audiences.includes("streaming") ? options.expected.streaming : 0,
  });
}

function printPreview(recipients, skipped, counts) {
  const mediaBaseUrl = process.env.AMPLIFY_DAY_PUBLIC_URL || "https://amplify.ia.br";
  console.log(JSON.stringify({
    mode: "preview",
    counts,
    skipped,
    sample: recipients.slice(0, 12).map((recipient) => ({
      name: recipient.name,
      phone: maskPhone(recipient.phone),
      audience: recipient.audience,
      hasCode: Boolean(recipient.code),
      message: recipient.message,
      media: [
        getReminderMedia(recipient.audience, mediaBaseUrl).stagePost,
        getReminderMedia(recipient.audience, mediaBaseUrl).map,
        getReminderMedia(recipient.audience, mediaBaseUrl).video,
      ],
    })),
  }, null, 2));
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const { subscribers, tags, sentTag: existingSentTag } = await loadAudience();
  const { recipients, skipped } = buildReminderRecipients(subscribers, { audiences: options.audiences });
  const counts = countRecipientsByAudience(recipients);
  printPreview(recipients, skipped, counts);
  assertSendApproval(options, counts);
  if (!options.send) return;

  const sentTag = existingSentTag || await ensureTag(tags, SENT_TAG);
  const intervalMs = Math.max(1_000, Number(process.env.ZAPI_INTERVAL_MS || 300_000));
  const results = [];
  for (let index = 0; index < recipients.length; index += 1) {
    const recipient = recipients[index];
    try {
      const result = await sendZapiMediaSequence({
        phone: recipient.phone,
        audience: recipient.audience,
        message: recipient.message,
        mediaIntervalMs: Number(process.env.ZAPI_MEDIA_INTERVAL_MS || 5_000),
      });
      await tagSubscriber(sentTag.id, recipient.email);
      results.push({ ok: true, audience: recipient.audience, phone: maskPhone(recipient.phone), messageIds: result.map((item) => item.messageId) });
    } catch (error) {
      results.push({ ok: false, audience: recipient.audience, phone: maskPhone(recipient.phone), error: error.message });
    }
    console.log(JSON.stringify({ progress: `${index + 1}/${recipients.length}`, ...results.at(-1) }));
    if (index < recipients.length - 1) await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  const failed = results.filter((result) => !result.ok);
  console.log(JSON.stringify({ sent: results.length - failed.length, failed: failed.length }, null, 2));
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
