const KIT_API_BASE_URL = "https://api.kit.com/v4";
const REQUEST_TIMEOUT_MS = 8000;

const LEIA_FIELDS = [
  "leia_name",
  "leia_school",
  "leia_role",
  "leia_interest",
  "leia_masterclass_format",
  "leia_students",
  "leia_city_state",
  "leia_phone",
  "leia_signup_path",
  "leia_consent_ts",
];

function clean(value) {
  return String(value || "").trim();
}

function getApiKey() {
  return clean(process.env.KIT_API_KEY)
    .replace(/^Bearer\s+/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

async function kitRequest(path, { method = "GET", body } = {}) {
  const apiKey = getApiKey();
  if (!apiKey) return { ok: false, skipped: true, reason: "KIT_API_KEY ausente" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${KIT_API_BASE_URL}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Kit-Api-Key": apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    let payload = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch (_error) {
      payload = { raw: text };
    }
    return { ok: response.ok, status: response.status, body: payload };
  } finally {
    clearTimeout(timeout);
  }
}

function extractTagId(result) {
  return result?.body?.tag?.id || result?.body?.id || result?.body?.data?.id || null;
}

async function resolveTag(label) {
  const list = await kitRequest("/tags?per_page=1000");
  if (!list.ok) return list;

  const existing = (list.body?.tags || []).find(
    (tag) => clean(tag?.name).toLowerCase() === label.toLowerCase(),
  );
  if (existing?.id) return { ok: true, id: existing.id };

  const created = await kitRequest("/tags", { method: "POST", body: { name: label } });
  const id = extractTagId(created);
  return id ? { ok: true, id } : created;
}

async function applyTag(email, label) {
  const tag = await resolveTag(label);
  if (!tag.ok || !tag.id) return { ok: false, label, detail: tag };
  const result = await kitRequest(`/tags/${encodeURIComponent(tag.id)}/subscribers`, {
    method: "POST",
    body: { email_address: email },
  });
  return { ok: result.ok, label, status: result.status };
}

export async function captureLeiaLead(lead) {
  if (!getApiKey()) return { ok: false, reason: "KIT_API_KEY ausente" };

  await Promise.all(
    LEIA_FIELDS.map((label) => kitRequest("/custom_fields", { method: "POST", body: { label } })),
  );

  const fields = Object.fromEntries(
    Object.entries({
      leia_name: lead.name,
      leia_school: lead.school,
      leia_role: lead.role,
      leia_interest: lead.interest,
      leia_masterclass_format: lead.masterclassFormat,
      leia_students: lead.students,
      leia_city_state: lead.cityState,
      leia_phone: lead.phone,
      leia_signup_path: lead.path,
      leia_consent_ts: lead.consentAt,
    }).filter(([, value]) => clean(value)),
  );

  const subscriber = await kitRequest("/subscribers", {
    method: "POST",
    body: {
      email_address: lead.email,
      first_name: clean(lead.name).split(/\s+/)[0],
      fields,
    },
  });
  if (!subscriber.ok) return { ok: false, reason: "subscriber", detail: subscriber };

  const interestTag = lead.interest === "implantacao" ? "leia-implantacao" : "leia-masterclass";
  const tags = await Promise.all([
    applyTag(lead.email, "leia-lead"),
    applyTag(lead.email, interestTag),
  ]);

  return { ok: tags.every((tag) => tag.ok), tags };
}
