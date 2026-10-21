import { describe, expect, it, vi } from "vitest";
import { createAnaLeadHandler } from "../../../api/ana-lead.js";
import { createAnaEnrichmentHandler } from "../../../api/ana-enrichment.js";
import { createAnaTurnHandler } from "../../../api/ana-turn.js";
import { createQualificationState } from "./qualification.js";

const SESSION_ID = "ana-session-123456";

function post(path: string, body: unknown) {
  return new Request(`https://example.test${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function bodyOf(response: Response) {
  return response.json() as Promise<Record<string, any>>;
}

function individualState() {
  return createQualificationState({
    fields: {
      need: "Quero aprender a aplicar IA no meu trabalho.",
      name: "Caio Silva",
      scope: "individual",
      experience_level: "beginner",
      timeline: "now",
      next_step: "commercial_conversation",
      preferred_contact: "email",
      email: "caio@example.com",
    },
  });
}

function leiaState() {
  return createQualificationState({
    createdAt: "2026-10-20T12:00:00.000Z",
    fields: {
      need: "Queremos formar os alunos em inteligência artificial aplicada.",
      name: "Marina Souza",
      scope: "organization",
      organization_type: "school",
      organization_name: "Colégio Horizonte",
      website: "https://colegio.example",
      school_type: "private",
      school_levels: ["9º ano", "Ensino Médio"],
      eligible_students: 240,
      tuition_band: "above_2000",
      reputacao_escola: "high",
      contact_role: "Diretora geral",
      target_year: 2027,
      uf: "DF",
      next_step: "commercial_conversation",
      preferred_contact: "email",
      email: "marina@colegio.example",
    },
  });
}

describe("POST /api/ana-turn", () => {
  it("starts a stateless development session with the stable public contract", async () => {
    const handler = createAnaTurnHandler({
      hasDatabaseUrl: () => false,
      env: { NODE_ENV: "test" },
    });
    const response = await handler(post("/api/ana-turn", { action: "start", sessionId: SESSION_ID }));
    const payload = await bodyOf(response);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      sessionId: SESSION_ID,
      done: false,
      question: {
        id: "need",
        field: "need",
        input: "text",
        canSkip: false,
      },
    });
    expect(payload.state.schemaVersion).toBe("ana-qualification-v1.0.0");
    expect(payload.evaluation.route).toBe("unknown");
  });

  it("rejects a stale question id without mutating the persisted state", async () => {
    const state = createQualificationState();
    const saveSession = vi.fn();
    const handler = createAnaTurnHandler({
      hasDatabaseUrl: () => true,
      loadSession: async () => ({ qualification_state: state }),
      saveSession,
      env: { NODE_ENV: "production" },
    });

    const response = await handler(
      post("/api/ana-turn", {
        action: "answer",
        sessionId: SESSION_ID,
        questionId: "email",
        answer: "teste@example.com",
        state: individualState(),
      }),
    );
    const payload = await bodyOf(response);

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({ code: "stale_question", question: { id: "need" } });
    expect(saveSession).not.toHaveBeenCalled();
  });

  it("uses the server state, advances one answer, and persists an event", async () => {
    const state = createQualificationState();
    const saveSession = vi.fn().mockResolvedValue({ ok: true });
    const handler = createAnaTurnHandler({
      hasDatabaseUrl: () => true,
      loadSession: async () => ({ qualification_state: state }),
      saveSession,
      env: { NODE_ENV: "production" },
    });

    const response = await handler(
      post("/api/ana-turn", {
        action: "answer",
        sessionId: SESSION_ID,
        questionId: "need",
        answer: "Quero capacitar a equipe para usar IA.",
        state: individualState(),
      }),
    );
    const payload = await bodyOf(response);

    expect(response.status).toBe(200);
    expect(payload.state.fields.need).toBe("Quero capacitar a equipe para usar IA.");
    expect(payload.state.fields.email).toBeUndefined();
    expect(payload.question.id).toBe("name");
    expect(saveSession).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionKey: SESSION_ID,
        eventName: "question_answered",
        payload: expect.objectContaining({ field: "need", action: "answered" }),
      }),
    );
  });

  it("accepts whitelisted contact context for a new WhatsApp session without exposing internal fields", async () => {
    const saveSession = vi.fn().mockResolvedValue({ ok: true });
    const handler = createAnaTurnHandler({
      hasDatabaseUrl: () => true,
      loadSession: async () => null,
      saveSession,
      env: { NODE_ENV: "production" },
    });

    const response = await handler(
      post("/api/ana-turn", {
        action: "start",
        sessionId: SESSION_ID,
        channel: "whatsapp",
        contact: {
          name: "Marina",
          phone: "(61) 99999-9999",
          reputacao_escola: "baixa",
          next_action: "forcar_handoff",
        },
      }),
    );
    const payload = await bodyOf(response);

    expect(response.status).toBe(200);
    expect(payload.state.channel).toBe("whatsapp");
    expect(payload.state.fields).toMatchObject({ name: "Marina", phone: "+5561999999999" });
    expect(payload.state.fields.reputacao_escola).toBeUndefined();
    expect(payload.state.fields.next_action).toBeUndefined();
    expect(payload.evaluation.fields).toBeUndefined();
    expect(payload.evaluation.evidence).toBeUndefined();
    expect(saveSession).toHaveBeenCalledWith(
      expect.objectContaining({
        state: expect.objectContaining({
          fields: expect.objectContaining({ name: "Marina", phone: "+5561999999999" }),
        }),
      }),
    );
  });

  it("rejects an unauthenticated outbound session", async () => {
    const handler = createAnaTurnHandler({
      hasDatabaseUrl: () => true,
      loadSession: async () => null,
      saveSession: vi.fn(),
      env: {
        NODE_ENV: "production",
        ANA_INTERNAL_ENRICHMENT_TOKEN: "internal-secret",
      },
    });

    const response = await handler(
      post("/api/ana-turn", {
        action: "start",
        sessionId: SESSION_ID,
        mode: "outbound",
        prequalification: { organization_type: "school" },
      }),
    );

    expect(response.status).toBe(401);
    await expect(bodyOf(response)).resolves.toMatchObject({ code: "outbound_auth_failed" });
  });

  it("accepts an authenticated outbound prequalification without allowing internal reputation", async () => {
    const saveSession = vi.fn().mockResolvedValue({ ok: true });
    const handler = createAnaTurnHandler({
      hasDatabaseUrl: () => true,
      loadSession: async () => null,
      saveSession,
      env: {
        NODE_ENV: "production",
        ANA_INTERNAL_ENRICHMENT_TOKEN: "internal-secret",
      },
    });
    const request = new Request("https://example.test/api/ana-turn", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer internal-secret",
      },
      body: JSON.stringify({
        action: "start",
        sessionId: SESSION_ID,
        mode: "outbound",
        contact: { name: "Marina", email: "marina@colegio.example" },
        prequalification: {
          need: "Programa de IA para estudantes",
          scope: "organization",
          organization_type: "school",
          organization_name: "Colégio Horizonte",
          school_type: "private",
          school_initiative_type: "students",
          school_levels: ["Ensino Médio"],
          uf: "Distrito Federal",
          reputacao_escola: "alta",
        },
      }),
    });

    const response = await handler(request);
    const payload = await bodyOf(response);
    expect(response.status).toBe(200);
    expect(payload.state).toMatchObject({
      mode: "outbound",
      fields: {
        organization_type: "school",
        organization_name: "Colégio Horizonte",
        school_type: "private",
        uf: "DF",
      },
    });
    expect(payload.state.fields.reputacao_escola).toBeUndefined();
    expect(saveSession).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "session_started",
        payload: expect.objectContaining({
          prefilledFields: expect.arrayContaining(["organization_type", "school_levels", "uf"]),
        }),
      }),
    );
  });
});

describe("POST /api/ana-lead", () => {
  it("hands off an eligible institutional lead using a deterministic id", async () => {
    const handoff = vi.fn().mockResolvedValue({
      status: "handed_off",
      replayed: false,
      contactId: "contact-1",
      opportunityId: "opportunity-1",
      regionTag: "ana-region-df",
      readyTagAdded: true,
      warnings: [],
    });
    const queueHandoff = vi.fn().mockResolvedValue({
      ok: true,
      claimed: true,
      claimVersion: 1,
      outbox: { attempt_count: 1 },
    });
    const completeHandoff = vi.fn().mockResolvedValue({ ok: true });
    const appendEvent = vi.fn().mockResolvedValue({ ok: true });
    const handler = createAnaLeadHandler({
      hasDatabaseUrl: () => true,
      loadSession: async () => ({ qualification_state: leiaState() }),
      queueHandoff,
      completeHandoff,
      appendEvent,
      failHandoff: vi.fn(),
      syncKit: vi.fn().mockResolvedValue({ ok: false, skipped: true, reason: "KIT_API_KEY ausente" }),
      ghlConfigFromEnv: () => ({ token: "test", locationId: "location" }),
      createGhlClient: () => ({ handoff }),
      env: {
        NODE_ENV: "production",
        ANA_GHL_SYNC_ENABLED: "true",
        ANA_GHL_HANDOFF_ENABLED: "true",
        GHL_ANA_CUSTOM_FIELD_IDS: JSON.stringify({
          ana_score_conta: "field-account",
          ana_score_icp: "field-icp-legacy",
        }),
      },
    });

    const response = await handler(post("/api/ana-lead", { sessionId: SESSION_ID }));
    const payload = await bodyOf(response);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      disposition: "sales_handoff",
      integrations: { ghl: { status: "handed_off", readyTagAdded: true } },
    });
    const expectedId = `ana:ana-qualification-v1.0.0:${SESSION_ID}:leia`;
    expect(queueHandoff).toHaveBeenCalledWith(expect.objectContaining({ handoffId: expectedId }));
    expect(handoff).toHaveBeenCalledWith(
      expect.objectContaining({
        handoffId: expectedId,
        route: "leia",
        uf: "DF",
        contact: expect.objectContaining({
          email: "marina@colegio.example",
          companyName: "Colégio Horizonte",
          customFields: expect.arrayContaining([
            { id: "field-account", fieldValue: 60 },
            { id: "field-icp-legacy", fieldValue: 60 },
          ]),
        }),
        scores: expect.objectContaining({ account: 60, icp: 60, opportunity: 40, total: 100 }),
      }),
    );
    expect(completeHandoff).toHaveBeenCalledWith(
      expect.objectContaining({
        handoffId: expectedId,
        claimVersion: 1,
        contactId: "contact-1",
      }),
    );
  });

  it("does not call GHL when another request already claimed the same handoff", async () => {
    const makeGhlClient = vi.fn();
    const handler = createAnaLeadHandler({
      hasDatabaseUrl: () => true,
      loadSession: async () => ({ qualification_state: leiaState() }),
      queueHandoff: vi.fn().mockResolvedValue({
        ok: true,
        claimed: false,
        outbox: { status: "processing" },
      }),
      appendEvent: vi.fn(),
      syncKit: vi.fn(),
      createGhlClient: makeGhlClient,
      ghlConfigFromEnv: () => ({ token: "test", locationId: "location" }),
      env: { NODE_ENV: "production", ANA_GHL_HANDOFF_ENABLED: "true" },
    });

    const response = await handler(post("/api/ana-lead", { sessionId: SESSION_ID }));
    expect(response.status).toBe(409);
    await expect(bodyOf(response)).resolves.toMatchObject({ code: "handoff_in_progress" });
    expect(makeGhlClient).not.toHaveBeenCalled();
  });

  it("keeps the browser session retryable when final handoff persistence fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failHandoff = vi.fn().mockResolvedValue({ ok: true });
    const handler = createAnaLeadHandler({
      hasDatabaseUrl: () => true,
      loadSession: async () => ({ qualification_state: leiaState() }),
      queueHandoff: vi.fn().mockResolvedValue({
        ok: true,
        claimed: true,
        claimVersion: 2,
        outbox: { attempt_count: 2 },
      }),
      completeHandoff: vi.fn().mockRejectedValue(new Error("database unavailable")),
      failHandoff,
      appendEvent: vi.fn().mockResolvedValue({ ok: true }),
      syncKit: vi.fn().mockResolvedValue({ ok: false, skipped: true }),
      ghlConfigFromEnv: () => ({ token: "test", locationId: "location" }),
      createGhlClient: () => ({
        handoff: vi.fn().mockResolvedValue({
          status: "handed_off",
          contactId: "contact-1",
          opportunityId: "opportunity-1",
          readyTagAdded: true,
          warnings: [],
        }),
      }),
      env: { NODE_ENV: "production", ANA_GHL_HANDOFF_ENABLED: "true" },
    });

    const response = await handler(post("/api/ana-lead", { sessionId: SESSION_ID }));
    expect(response.status).toBe(503);
    await expect(bodyOf(response)).resolves.toMatchObject({ code: "handoff_persistence_pending" });
    expect(failHandoff).toHaveBeenCalledWith(
      expect.objectContaining({
        handoffId: expect.stringContaining(SESSION_ID),
        claimVersion: 2,
      }),
    );
    consoleError.mockRestore();
  });

  it("syncs B2C without creating an institutional handoff or ready tag", async () => {
    const handoff = vi.fn();
    const upsertContact = vi.fn().mockResolvedValue({ id: "contact-b2c" });
    const recordCrmContact = vi.fn().mockResolvedValue({ ok: true });
    const handler = createAnaLeadHandler({
      hasDatabaseUrl: () => true,
      loadSession: async () => ({ qualification_state: individualState() }),
      appendEvent: vi.fn().mockResolvedValue({ ok: true }),
      recordCrmContact,
      syncKit: vi.fn().mockResolvedValue({ ok: true }),
      ghlConfigFromEnv: () => ({ token: "test", locationId: "location" }),
      createGhlClient: () => ({
        findContact: vi.fn().mockResolvedValue(undefined),
        upsertContact,
        getContact: vi.fn().mockResolvedValue({ id: "contact-b2c", tags: [] }),
        reconcileRegionalTags: vi.fn(),
        handoff,
      }),
      env: {
        NODE_ENV: "production",
        ANA_GHL_SYNC_ENABLED: "true",
        ANA_GHL_HANDOFF_ENABLED: "true",
        GHL_ANA_CUSTOM_FIELD_IDS: "{}",
      },
    });

    const response = await handler(post("/api/ana-lead", { sessionId: SESSION_ID }));
    const payload = await bodyOf(response);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      disposition: "nurture",
      integrations: { ghl: { status: "created", readyTagAdded: false } },
    });
    expect(upsertContact).toHaveBeenCalled();
    expect(recordCrmContact).toHaveBeenCalledWith({
      sessionKey: SESSION_ID,
      contactId: "contact-b2c",
    });
    expect(handoff).not.toHaveBeenCalled();
  });

  it("keeps a sync-only lead retryable when the GHL contact id cannot be persisted", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const appendEvent = vi.fn().mockResolvedValue({ ok: true });
    const handler = createAnaLeadHandler({
      hasDatabaseUrl: () => true,
      loadSession: async () => ({ qualification_state: individualState() }),
      appendEvent,
      recordCrmContact: vi.fn().mockRejectedValue(new Error("database unavailable")),
      syncKit: vi.fn().mockResolvedValue({ ok: true }),
      ghlConfigFromEnv: () => ({ token: "test", locationId: "location" }),
      createGhlClient: () => ({
        findContact: vi.fn().mockResolvedValue(undefined),
        upsertContact: vi.fn().mockResolvedValue({ id: "contact-b2c" }),
        getContact: vi.fn().mockResolvedValue({ id: "contact-b2c", tags: [] }),
        reconcileRegionalTags: vi.fn(),
      }),
      env: { NODE_ENV: "production", ANA_GHL_SYNC_ENABLED: "true" },
    });

    const response = await handler(post("/api/ana-lead", { sessionId: SESSION_ID }));
    const payload = await bodyOf(response);

    expect(response.status).toBe(503);
    expect(payload).toMatchObject({
      ok: false,
      code: "crm_contact_persistence_pending",
      captured: true,
      integrations: {
        ghl: {
          contactId: "contact-b2c",
          persistenceWarning: "crm_contact_id_not_persisted",
        },
      },
    });
    expect(appendEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: "crm_contact_persistence_pending" }),
    );
    consoleError.mockRestore();
  });

  it("replays a persisted handoff without mutating GoHighLevel again", async () => {
    const state = leiaState();
    const handoffId = `ana:ana-qualification-v1.0.0:${SESSION_ID}:leia`;
    const makeGhlClient = vi.fn();
    const queueHandoff = vi.fn();
    const handler = createAnaLeadHandler({
      hasDatabaseUrl: () => true,
      loadSession: async () => ({
        qualification_state: state,
        last_handoff_id: handoffId,
        ghl_contact_id: "contact-existing",
        ghl_opportunity_id: "opportunity-existing",
      }),
      queueHandoff,
      appendEvent: vi.fn().mockResolvedValue({ ok: true }),
      syncKit: vi.fn().mockResolvedValue({ ok: false, skipped: true }),
      createGhlClient: makeGhlClient,
      env: {
        NODE_ENV: "production",
        ANA_GHL_HANDOFF_ENABLED: "true",
      },
    });

    const response = await handler(post("/api/ana-lead", { sessionId: SESSION_ID }));
    const payload = await bodyOf(response);

    expect(response.status).toBe(200);
    expect(payload.integrations.ghl).toMatchObject({
      status: "already_handed_off",
      replayed: true,
      contactId: "contact-existing",
      readyTagAdded: false,
    });
    expect(queueHandoff).not.toHaveBeenCalled();
    expect(makeGhlClient).not.toHaveBeenCalled();
  });

  it("returns a non-2xx response when GoHighLevel fails, without making Kit authoritative", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failHandoff = vi.fn().mockResolvedValue({ ok: true });
    const syncKitEvent = vi.fn().mockResolvedValue({ ok: true });
    const handler = createAnaLeadHandler({
      hasDatabaseUrl: () => true,
      loadSession: async () => ({ qualification_state: leiaState() }),
      queueHandoff: vi.fn().mockResolvedValue({
        ok: true,
        claimed: true,
        claimVersion: 3,
        outbox: { attempt_count: 3 },
      }),
      completeHandoff: vi.fn(),
      failHandoff,
      appendEvent: vi.fn().mockResolvedValue({ ok: true }),
      syncKit: syncKitEvent,
      ghlConfigFromEnv: () => ({ token: "test", locationId: "location" }),
      createGhlClient: () => ({ handoff: vi.fn().mockRejectedValue(new Error("upstream offline")) }),
      env: {
        NODE_ENV: "production",
        ANA_GHL_HANDOFF_ENABLED: "true",
        GHL_ANA_CUSTOM_FIELD_IDS: "{}",
      },
    });

    const response = await handler(post("/api/ana-lead", { sessionId: SESSION_ID }));
    const payload = await bodyOf(response);

    expect(response.status).toBe(502);
    expect(payload).toMatchObject({ ok: false, code: "ghl_sync_failed", captured: true });
    expect(failHandoff).toHaveBeenCalledWith(
      expect.objectContaining({
        handoffId: expect.stringContaining(SESSION_ID),
        claimVersion: 3,
      }),
    );
    expect(syncKitEvent).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("refuses CRM mutation when only a client-side fallback state exists", async () => {
    const handler = createAnaLeadHandler({
      hasDatabaseUrl: () => false,
      env: {
        NODE_ENV: "test",
        ANA_GHL_SYNC_ENABLED: "true",
      },
    });

    const response = await handler(
      post("/api/ana-lead", { sessionId: SESSION_ID, state: leiaState() }),
    );
    expect(response.status).toBe(503);
    await expect(bodyOf(response)).resolves.toMatchObject({ code: "persisted_session_required" });
  });
});

describe("POST /api/ana-enrichment", () => {
  it("requires server authentication", async () => {
    const handler = createAnaEnrichmentHandler({
      hasDatabaseUrl: () => true,
      env: { ANA_INTERNAL_ENRICHMENT_TOKEN: "internal-secret" },
    });
    const response = await handler(post("/api/ana-enrichment", { sessionId: SESSION_ID }));
    expect(response.status).toBe(401);
  });

  it("stores evidence-backed reputation and recalculates the shadow score", async () => {
    const updateEnrichment = vi.fn(async ({ fields }) => ({
      ok: true,
      session: {
        qualification_state: createQualificationState({
          fields: { ...leiaState().fields, ...fields },
        }),
      },
    }));
    const handler = createAnaEnrichmentHandler({
      hasDatabaseUrl: () => true,
      updateEnrichment,
      env: { ANA_INTERNAL_ENRICHMENT_TOKEN: "internal-secret" },
    });
    const request = new Request("https://example.test/api/ana-enrichment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer internal-secret",
      },
      body: JSON.stringify({
        sessionId: SESSION_ID,
        reputacao_escola: "alta",
        reputacao_escola_justificativa: "Referência regional com reconhecimento público.",
        reputacao_escola_fonte: "https://colegio.example/reconhecimentos",
        reputacao_escola_responsavel: "Operações comerciais",
      }),
    });

    const response = await handler(request);
    const payload = await bodyOf(response);
    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      score: { account: 60, icp: 60, opportunity: 40, total: 100 },
    });
    expect(updateEnrichment).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionKey: SESSION_ID,
        fields: expect.objectContaining({ reputacao_escola: "alta" }),
      }),
    );
  });

  it("rejects a reputation label without justification, source and responsible owner", async () => {
    const handler = createAnaEnrichmentHandler({
      hasDatabaseUrl: () => true,
      updateEnrichment: vi.fn(),
      env: { ANA_INTERNAL_ENRICHMENT_TOKEN: "internal-secret" },
    });
    const request = new Request("https://example.test/api/ana-enrichment", {
      method: "POST",
      headers: { Authorization: "Bearer internal-secret", "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: SESSION_ID, reputacao_escola: "alta" }),
    });
    expect((await handler(request)).status).toBe(422);
  });

  it("syncs a post-handoff enrichment to GHL without reapplying the ready tag", async () => {
    const upsertContact = vi.fn().mockResolvedValue({ id: "contact-1" });
    const listContactNotes = vi.fn().mockResolvedValue([]);
    const createContactNote = vi.fn().mockResolvedValue({ id: "note-1" });
    const addTags = vi.fn();
    const completeEnrichment = vi.fn().mockResolvedValue({ ok: true });
    const handler = createAnaEnrichmentHandler({
      hasDatabaseUrl: () => true,
      updateEnrichment: vi.fn().mockResolvedValue({
        ok: true,
        session: {
          session_key: SESSION_ID,
          ghl_contact_id: "contact-1",
          qualification_state: leiaState(),
        },
      }),
      queueEnrichment: vi.fn().mockResolvedValue({
        ok: true,
        claimed: true,
        claimVersion: 1,
        outbox: { status: "processing", attempt_count: 1 },
      }),
      completeEnrichment,
      ghlConfigFromEnv: () => ({ token: "test", locationId: "location" }),
      createGhlClient: () => ({ upsertContact, listContactNotes, createContactNote, addTags }),
      env: {
        ANA_INTERNAL_ENRICHMENT_TOKEN: "internal-secret",
        ANA_GHL_SYNC_ENABLED: "true",
        GHL_ANA_CUSTOM_FIELD_IDS: JSON.stringify({ ana_reputacao_escola: "field-reputation" }),
      },
    });
    const request = new Request("https://example.test/api/ana-enrichment", {
      method: "POST",
      headers: { Authorization: "Bearer internal-secret", "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: SESSION_ID,
        reputacao_escola: "alta",
        reputacao_escola_justificativa: "Reconhecimento público verificável.",
        reputacao_escola_fonte: "https://example.test/fonte",
        reputacao_escola_responsavel: "Operações",
      }),
    });

    const response = await handler(request);
    const payload = await bodyOf(response);
    expect(response.status).toBe(200);
    expect(payload.integrations.ghl).toMatchObject({ status: "synced", contactId: "contact-1" });
    expect(upsertContact).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "contact-1",
        customFields: [{ id: "field-reputation", fieldValue: "alta" }],
      }),
    );
    expect(createContactNote).toHaveBeenCalledWith(
      "contact-1",
      expect.stringContaining("[ANA_ENRICHMENT_ID:"),
    );
    expect(completeEnrichment).toHaveBeenCalledWith(
      expect.objectContaining({ claimVersion: 1, contactId: "contact-1" }),
    );
    expect(addTags).not.toHaveBeenCalled();
  });

  it("keeps a failed CRM enrichment in the durable retry queue", async () => {
    const queueEnrichment = vi.fn().mockResolvedValue({
      ok: true,
      claimed: true,
      claimVersion: 2,
      outbox: { status: "processing", attempt_count: 2 },
    });
    const failEnrichment = vi.fn().mockResolvedValue({ ok: true });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = createAnaEnrichmentHandler({
      hasDatabaseUrl: () => true,
      updateEnrichment: vi.fn().mockResolvedValue({
        ok: true,
        session: {
          session_key: SESSION_ID,
          ghl_contact_id: "contact-1",
          qualification_state: leiaState(),
        },
      }),
      queueEnrichment,
      failEnrichment,
      ghlConfigFromEnv: () => ({ token: "test", locationId: "location" }),
      createGhlClient: () => ({
        listContactNotes: vi.fn().mockRejectedValue(new Error("CRM offline")),
      }),
      env: {
        ANA_INTERNAL_ENRICHMENT_TOKEN: "internal-secret",
        ANA_GHL_SYNC_ENABLED: "true",
      },
    });
    const request = new Request("https://example.test/api/ana-enrichment", {
      method: "POST",
      headers: { Authorization: "Bearer internal-secret", "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: SESSION_ID, next_action: "revisar conta" }),
    });

    const response = await handler(request);
    await expect(bodyOf(response)).resolves.toMatchObject({
      ok: false,
      code: "enrichment_crm_sync_failed",
      retryable: true,
    });
    expect(response.status).toBe(502);
    expect(failEnrichment).toHaveBeenCalledWith(
      expect.objectContaining({ claimVersion: 2, error: "CRM offline" }),
    );
    consoleError.mockRestore();
  });

  it("treats an already completed enrichment as an idempotent replay", async () => {
    const makeGhlClient = vi.fn();
    const handler = createAnaEnrichmentHandler({
      hasDatabaseUrl: () => true,
      updateEnrichment: vi.fn().mockResolvedValue({
        ok: true,
        session: {
          session_key: SESSION_ID,
          ghl_contact_id: "contact-1",
          qualification_state: leiaState(),
        },
      }),
      queueEnrichment: vi.fn().mockResolvedValue({
        ok: true,
        claimed: false,
        claimVersion: 1,
        outbox: { status: "completed", attempt_count: 1, ghl_contact_id: "contact-1" },
      }),
      createGhlClient: makeGhlClient,
      env: {
        ANA_INTERNAL_ENRICHMENT_TOKEN: "internal-secret",
        ANA_GHL_SYNC_ENABLED: "true",
      },
    });
    const request = new Request("https://example.test/api/ana-enrichment", {
      method: "POST",
      headers: { Authorization: "Bearer internal-secret", "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: SESSION_ID, next_action: "revisar conta" }),
    });

    const response = await handler(request);
    expect(response.status).toBe(200);
    await expect(bodyOf(response)).resolves.toMatchObject({
      ok: true,
      integrations: { ghl: { status: "already_synced", contactId: "contact-1" } },
    });
    expect(makeGhlClient).not.toHaveBeenCalled();
  });
});
