import {
  ANA_HANDOFF_READY_TAG,
  GHL_API_BASE_URL,
  GHL_API_VERSION,
  type AnaHandoffInput,
  type AnaHandoffResult,
  type FetchLike,
  type GhlClient,
  type GhlClientDependencies,
  type GhlConfig,
  type GhlContact,
  type GhlContactInput,
  type GhlNote,
  type GhlOpportunity,
  type GhlWarning,
  type OpportunitySyncResult,
} from "./types.js";
import {
  MANAGED_ANA_REGION_TAGS,
  normalizeBrazilianState,
  regionalTagForState,
} from "./regions.js";
import {
  buildHandoffNote,
  HANDOFF_NOTE_TITLE,
  handoffNoteMarker,
} from "./note.js";

type JsonRecord = Record<string, unknown>;

export class GhlApiError extends Error {
  readonly status?: number;
  readonly endpoint: string;

  constructor(message: string, endpoint: string, status?: number) {
    super(message);
    this.name = "GhlApiError";
    this.endpoint = endpoint;
    this.status = status;
  }
}

function required(value: string | undefined, name: string): string {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`${name} is not configured`);
  return normalized;
}

function optional(value: string | undefined): string | undefined {
  const normalized = String(value || "").trim();
  return normalized || undefined;
}

function pipelineRoutesFromEnv(raw: string | undefined): GhlConfig["pipelineRoutes"] {
  if (!optional(raw)) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw));
  } catch {
    throw new Error("GHL_ANA_PIPELINE_ROUTES must contain valid JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("GHL_ANA_PIPELINE_ROUTES must contain a JSON object");
  }

  const routes: NonNullable<GhlConfig["pipelineRoutes"]> = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const entry = value as Record<string, unknown>;
    const pipelineId = optional(String(entry.pipelineId ?? ""));
    const pipelineStageId = optional(String(entry.pipelineStageId ?? ""));
    if (!pipelineId || !pipelineStageId) {
      throw new Error(`GHL_ANA_PIPELINE_ROUTES entry ${key} is incomplete`);
    }
    routes[comparableText(key)] = { pipelineId, pipelineStageId };
  }
  return Object.keys(routes).length ? routes : undefined;
}

export function ghlConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): GhlConfig {
  return {
    token: required(env.GHL_PRIVATE_INTEGRATION_TOKEN, "GHL_PRIVATE_INTEGRATION_TOKEN"),
    locationId: required(env.GHL_LOCATION_ID, "GHL_LOCATION_ID"),
    pipelineId: optional(env.GHL_ANA_PIPELINE_ID) || optional(env.GHL_PIPELINE_ID),
    pipelineStageId: optional(env.GHL_ANA_PIPELINE_STAGE_ID) || optional(env.GHL_PIPELINE_STAGE_ID),
    pipelineRoutes: pipelineRoutesFromEnv(env.GHL_ANA_PIPELINE_ROUTES),
  };
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function cleanText(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const normalized = String(value).trim();
  return normalized || undefined;
}

function contactPayload(input: GhlContactInput): JsonRecord {
  const payload: JsonRecord = {};
  const stringFields = [
    "firstName",
    "lastName",
    "name",
    "email",
    "phone",
    "companyName",
    "website",
    "city",
    "state",
    "country",
    "source",
  ] as const;

  for (const field of stringFields) {
    const value = cleanText(input[field]);
    if (value) payload[field] = value;
  }
  if (input.customFields?.length) payload.customFields = input.customFields;
  return payload;
}

function contactFromResponse(data: JsonRecord): GhlContact {
  const contact = (data.contact || data) as GhlContact;
  if (!contact?.id) throw new Error("GHL response did not include a contact id");
  return contact;
}

function opportunityFromResponse(data: JsonRecord): GhlOpportunity {
  const opportunity = (data.opportunity || data) as GhlOpportunity;
  if (!opportunity?.id) throw new Error("GHL response did not include an opportunity id");
  return opportunity;
}

function noteFromResponse(data: JsonRecord): GhlNote {
  const note = (data.note || data) as GhlNote;
  if (!note?.id) throw new Error("GHL response did not include a note id");
  return note;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function tagsFromContact(contact: GhlContact): string[] {
  return Array.isArray(contact.tags) ? unique(contact.tags.map(String)) : [];
}

function comparableText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function comparablePhone(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function customFieldValue(contact: GhlContact, expected: { id?: string; key?: string }): unknown {
  if (!Array.isArray(contact.customFields)) return undefined;
  const match = contact.customFields.find((field) =>
    (expected.id && field.id === expected.id) || (expected.key && field.key === expected.key));
  return match?.value ?? match?.fieldValue;
}

function assertPersistedContact(
  expected: GhlContactInput,
  actual: GhlContact,
  expectedRegionTag: string | null,
): void {
  const failures: string[] = [];
  const expectedName = cleanText(expected.name) ||
    cleanText([expected.firstName, expected.lastName].filter(Boolean).join(" "));
  const actualName = cleanText(actual.name) ||
    cleanText([actual.firstName, actual.lastName].filter(Boolean).join(" "));

  if (expectedName && comparableText(actualName) !== comparableText(expectedName)) failures.push("name");
  if (expected.email && comparableText(actual.email) !== comparableText(expected.email)) failures.push("email");
  if (expected.phone && comparablePhone(actual.phone) !== comparablePhone(expected.phone)) failures.push("phone");
  if (
    expected.companyName &&
    comparableText(actual.companyName) !== comparableText(expected.companyName)
  ) failures.push("companyName");
  if (
    expected.state &&
    normalizeBrazilianState(actual.state) !== normalizeBrazilianState(expected.state)
  ) failures.push("state");

  for (const field of expected.customFields || []) {
    const identifier = cleanText(field.id) || cleanText(field.key);
    if (!identifier) continue;
    const persisted = customFieldValue(actual, field);
    if (comparableText(persisted) !== comparableText(field.fieldValue)) {
      failures.push(`customField:${identifier}`);
    }
  }

  const tags = tagsFromContact(actual);
  if (expectedRegionTag) {
    if (!tags.includes(expectedRegionTag)) failures.push(`tag:${expectedRegionTag}`);
  } else if (tags.some((tag) => (MANAGED_ANA_REGION_TAGS as readonly string[]).includes(tag))) {
    failures.push("regionalTag");
  }
  if (tags.includes(ANA_HANDOFF_READY_TAG)) failures.push("staleReadyTag");

  if (failures.length) {
    throw new Error(`GHL contact persistence validation failed: ${failures.join(", ")}`);
  }
}

function opportunityDestination(
  config: GhlConfig,
  routing?: Pick<AnaHandoffInput, "cluster" | "route">,
): Pick<GhlConfig, "pipelineId" | "pipelineStageId"> {
  const cluster = comparableText(routing?.cluster);
  const route = comparableText(routing?.route);
  const aliases = cluster === "educacao" ? ["school"] : [];
  const keys = [cluster, ...aliases, route].filter(Boolean);
  for (const key of keys) {
    const destination = config.pipelineRoutes?.[key];
    if (destination) return destination;
  }
  return { pipelineId: config.pipelineId, pipelineStageId: config.pipelineStageId };
}

function opportunityConfigurationWarning(
  destination: Pick<GhlConfig, "pipelineId" | "pipelineStageId">,
): GhlWarning | undefined {
  if (!destination.pipelineId && !destination.pipelineStageId) {
    return {
      code: "opportunity_config_missing",
      message:
        "Opportunity sync skipped: configure GHL_ANA_PIPELINE_ROUTES or the legacy pipeline variables.",
    };
  }
  if (!destination.pipelineId || !destination.pipelineStageId) {
    return {
      code: "opportunity_config_incomplete",
      message:
        "Opportunity sync skipped: both pipeline and stage ids must be configured.",
    };
  }
  return undefined;
}

function retryDelay(response: Response, attempt: number, baseDelayMs: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  }
  return baseDelayMs * 2 ** attempt;
}

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

function endpointName(path: string): string {
  return path.split("?")[0];
}

export function createGhlClient(
  rawConfig: GhlConfig,
  dependencies: GhlClientDependencies = {},
): GhlClient {
  const config: GhlConfig = {
    ...rawConfig,
    token: required(rawConfig.token, "GHL_PRIVATE_INTEGRATION_TOKEN"),
    locationId: required(rawConfig.locationId, "GHL_LOCATION_ID"),
    baseUrl: (rawConfig.baseUrl || GHL_API_BASE_URL).replace(/\/+$/, ""),
    timeoutMs: rawConfig.timeoutMs ?? 8_000,
    maxRetries: rawConfig.maxRetries ?? 2,
    retryBaseDelayMs: rawConfig.retryBaseDelayMs ?? 250,
  };
  const fetcher: FetchLike = dependencies.fetch || fetch;
  const wait = dependencies.sleep || sleep;

  async function request<T extends JsonRecord>(
    path: string,
    init: RequestInit = {},
    options: { retry?: boolean } = {},
  ): Promise<T> {
    const endpoint = endpointName(path);
    const attempts = options.retry === false ? 1 : (config.maxRetries || 0) + 1;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
      let response: Response;

      try {
        response = await fetcher(`${config.baseUrl}${path}`, {
          ...init,
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${config.token}`,
            Version: GHL_API_VERSION,
            ...(init.body ? { "Content-Type": "application/json" } : {}),
            ...init.headers,
          },
        });
      } catch (error) {
        if (controller.signal.aborted) {
          throw new GhlApiError(`GHL request timed out after ${config.timeoutMs}ms`, endpoint);
        }
        const remoteMessage = error instanceof Error ? error.message : "network error";
        const safeMessage = remoteMessage.split(config.token).join("[redacted]").slice(0, 300);
        throw new GhlApiError(
          `GHL request failed: ${safeMessage}`,
          endpoint,
        );
      } finally {
        clearTimeout(timeout);
      }

      const rawBody = await response.text();
      let data: JsonRecord = {};
      if (rawBody) {
        try {
          data = JSON.parse(rawBody) as JsonRecord;
        } catch {
          data = { message: rawBody };
        }
      }

      if (response.ok) return data as T;

      if (isRetryable(response.status) && attempt < attempts - 1) {
        await wait(retryDelay(response, attempt, config.retryBaseDelayMs || 0));
        continue;
      }

      const remoteMessage = cleanText(data.message || data.error) || "request rejected";
      const safeMessage = remoteMessage.split(config.token).join("[redacted]").slice(0, 300);
      throw new GhlApiError(`GHL ${response.status}: ${safeMessage}`, endpoint, response.status);
    }

    throw new GhlApiError("GHL request failed", endpoint);
  }

  async function lookupContact(query: "email" | "number", value: string): Promise<GhlContact | undefined> {
    const params = new URLSearchParams({ locationId: config.locationId, [query]: value });
    const data = await request<JsonRecord>(`/contacts/search/duplicate?${params}`);
    const contact = data.contact || (Array.isArray(data.contacts) ? data.contacts[0] : undefined);
    return contact as GhlContact | undefined;
  }

  async function findContact(input: Pick<GhlContactInput, "email" | "phone">): Promise<GhlContact | undefined> {
    const email = cleanText(input.email)?.toLowerCase();
    const phone = cleanText(input.phone);
    if (!email && !phone) throw new Error("An email or phone is required to find a GHL contact");

    const byPhone = phone ? await lookupContact("number", phone) : undefined;
    const byEmail = email ? await lookupContact("email", email) : undefined;
    if (byEmail && byPhone && byEmail.id !== byPhone.id) {
      throw new Error("GHL identity conflict: email and phone belong to different contacts");
    }
    return byEmail || byPhone;
  }

  async function getContact(contactId: string): Promise<GhlContact> {
    const id = required(contactId, "contactId");
    return contactFromResponse(await request<JsonRecord>(`/contacts/${encodeURIComponent(id)}`));
  }

  async function upsertContact(input: GhlContactInput): Promise<GhlContact> {
    const payload = contactPayload(input);
    if (input.id) {
      return contactFromResponse(
        await request<JsonRecord>(`/contacts/${encodeURIComponent(input.id)}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        }),
      );
    }

    if (!payload.email && !payload.phone) {
      throw new Error("An email or phone is required to upsert a GHL contact");
    }
    return contactFromResponse(
      await request<JsonRecord>("/contacts/upsert", {
        method: "POST",
        body: JSON.stringify({ ...payload, locationId: config.locationId }),
      }),
    );
  }

  async function addTags(contactId: string, tags: string[]): Promise<string[]> {
    const values = unique(tags);
    if (!values.length) return [];
    const data = await request<JsonRecord>(`/contacts/${encodeURIComponent(contactId)}/tags`, {
      method: "POST",
      body: JSON.stringify({ tags: values }),
    });
    return Array.isArray(data.tags) ? data.tags.map(String) : [];
  }

  async function removeTags(contactId: string, tags: string[]): Promise<string[]> {
    const values = unique(tags);
    if (!values.length) return [];
    const data = await request<JsonRecord>(`/contacts/${encodeURIComponent(contactId)}/tags`, {
      method: "DELETE",
      body: JSON.stringify({ tags: values }),
    });
    return Array.isArray(data.tags) ? data.tags.map(String) : [];
  }

  async function reconcileRegionalTags(contactId: string, currentTags: string[], uf?: string) {
    const regionTag = regionalTagForState(uf);
    const tags = unique(currentTags.map(String));
    const managed = new Set<string>(MANAGED_ANA_REGION_TAGS);
    const removed = tags.filter((tag) => managed.has(tag) && tag !== regionTag);
    const added = regionTag && !tags.includes(regionTag) ? [regionTag] : [];

    if (removed.length) await removeTags(contactId, removed);
    if (added.length) await addTags(contactId, added);

    return {
      tags: unique([...tags.filter((tag) => !removed.includes(tag)), ...added]),
      regionTag,
      added,
      removed,
    };
  }

  async function listContactNotes(contactId: string): Promise<GhlNote[]> {
    const data = await request<JsonRecord>(`/contacts/${encodeURIComponent(contactId)}/notes`);
    return Array.isArray(data.notes) ? (data.notes as GhlNote[]) : [];
  }

  async function createContactNote(contactId: string, body: string): Promise<GhlNote> {
    return noteFromResponse(
      await request<JsonRecord>(`/contacts/${encodeURIComponent(contactId)}/notes`, {
        method: "POST",
        body: JSON.stringify({ body, title: HANDOFF_NOTE_TITLE }),
      }, { retry: false }),
    );
  }

  async function findOpenOpportunity(
    contactId: string,
    routing?: Pick<AnaHandoffInput, "cluster" | "route">,
  ): Promise<GhlOpportunity | undefined> {
    const destination = opportunityDestination(config, routing);
    if (!destination.pipelineId || !destination.pipelineStageId) return undefined;
    const params = new URLSearchParams({
      locationId: config.locationId,
      pipelineId: destination.pipelineId,
      contactId,
      status: "open",
      limit: "100",
    });
    const search = await request<JsonRecord>(`/opportunities/search?${params}`);
    const opportunities = Array.isArray(search.opportunities)
      ? (search.opportunities as GhlOpportunity[])
      : [];
    return opportunities.find((item) => item.pipelineId === destination.pipelineId) || opportunities[0];
  }

  async function upsertOpportunity(
    contactId: string,
    name: string,
    routing?: Pick<AnaHandoffInput, "cluster" | "route">,
  ): Promise<OpportunitySyncResult> {
    const destination = opportunityDestination(config, routing);
    const warning = opportunityConfigurationWarning(destination);
    if (warning) return { status: "skipped", warnings: [warning] };

    const existing = await findOpenOpportunity(contactId, routing);
    const payload = {
      pipelineId: destination.pipelineId,
      pipelineStageId: destination.pipelineStageId,
      name: cleanText(name) || "Lead qualificado pela ANA",
      status: "open",
    };

    if (existing?.id) {
      const opportunity = opportunityFromResponse(
        await request<JsonRecord>(`/opportunities/${encodeURIComponent(existing.id)}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        }),
      );
      return { status: "updated", opportunity, warnings: [] };
    }

    const opportunity = opportunityFromResponse(
      await request<JsonRecord>("/opportunities/", {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          locationId: config.locationId,
          contactId,
        }),
      }, { retry: false }),
    );
    return { status: "created", opportunity, warnings: [] };
  }

  async function resolveContact(input: GhlContactInput): Promise<{
    contact: GhlContact;
    wasReady: boolean;
    wasExisting: boolean;
  }> {
    let existing: GhlContact | undefined;
    if (input.id) {
      existing = await getContact(input.id);
    } else {
      existing = await findContact(input);
      if (existing) existing = await getContact(existing.id);
    }

    if (existing) {
      return {
        contact: existing,
        wasReady: tagsFromContact(existing).includes(ANA_HANDOFF_READY_TAG),
        wasExisting: true,
      };
    }

    const contact = await upsertContact(input);
    const completeContact = await getContact(contact.id);
    return {
      contact: completeContact,
      wasReady: tagsFromContact(completeContact).includes(ANA_HANDOFF_READY_TAG),
      wasExisting: false,
    };
  }

  async function handoff(input: AnaHandoffInput): Promise<AnaHandoffResult> {
    if (!cleanText(input.handoffId)) throw new Error("handoffId is required");
    if (!cleanText(input.route)) throw new Error("route is required");
    if (!cleanText(input.qualificationSummary)) throw new Error("qualificationSummary is required");
    const state = normalizeBrazilianState(input.uf || input.contact.state);
    if (!state) throw new Error("A valid Brazilian UF is required for handoff");
    const destination = opportunityDestination(config, input);
    const opportunityWarning = opportunityConfigurationWarning(destination);
    if (opportunityWarning) {
      throw new Error(`GHL handoff blocked: ${opportunityWarning.message}`);
    }

    const resolved = await resolveContact(input.contact);
    const marker = handoffNoteMarker(input.handoffId);
    const notes = await listContactNotes(resolved.contact.id);
    const existingNote = notes.find((note) => String(note.body || "").includes(marker));

    // A ready tag only proves that some handoff happened. The marker proves that
    // this exact handoff already completed. A new session for the same contact
    // must refresh the CRM data and retrigger distribution.
    if (resolved.wasReady && existingNote) {
      let existingOpportunity: GhlOpportunity | undefined;
      try {
        existingOpportunity = await findOpenOpportunity(resolved.contact.id, input);
      } catch {
        // The handoff is already proven by tag + marker. Opportunity lookup is
        // best effort and must not turn an idempotent replay into a new write.
      }
      return {
        status: "already_handed_off",
        replayed: true,
        contactId: resolved.contact.id,
        opportunityId: existingOpportunity?.id,
        regionTag: regionalTagForState(state),
        readyTagAdded: false,
        warnings: [],
      };
    }

    const updatedContact = resolved.wasExisting
      ? await upsertContact({ ...input.contact, id: resolved.contact.id })
      : resolved.contact;
    let existingTags = tagsFromContact(resolved.contact);
    if (resolved.wasReady) {
      await removeTags(resolved.contact.id, [ANA_HANDOFF_READY_TAG]);
      existingTags = existingTags.filter((tag) => tag !== ANA_HANDOFF_READY_TAG);
    }

    const regional = await reconcileRegionalTags(
      updatedContact.id,
      existingTags,
      state,
    );

    let noteStatus: "created" | "existing" = "existing";
    if (!existingNote) {
      await createContactNote(updatedContact.id, buildHandoffNote(input));
      noteStatus = "created";
    }

    const opportunityName =
      cleanText(input.opportunityName) ||
      `${cleanText(input.contact.companyName) || cleanText(input.contact.name) || "Lead"} — ${input.route}`;
    const opportunity = await upsertOpportunity(updatedContact.id, opportunityName, input);

    const persistedContact = await getContact(updatedContact.id);
    assertPersistedContact(input.contact, persistedContact, regional.regionTag);

    // This must remain the final API mutation: it triggers the distribution workflow.
    await addTags(updatedContact.id, [ANA_HANDOFF_READY_TAG]);

    return {
      status: "handed_off",
      replayed: false,
      contactId: updatedContact.id,
      opportunityId: opportunity.opportunity?.id,
      regionTag: regional.regionTag,
      noteStatus,
      opportunityStatus: opportunity.status,
      readyTagAdded: true,
      warnings: opportunity.warnings,
    };
  }

  return {
    findContact,
    getContact,
    upsertContact,
    addTags,
    removeTags,
    reconcileRegionalTags,
    listContactNotes,
    createContactNote,
    upsertOpportunity,
    handoff,
  };
}
