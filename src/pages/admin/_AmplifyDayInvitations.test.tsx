import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AmplifyDayInvitations from "./_AmplifyDayInvitations";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession } },
}));

const inviter = {
  id: "inviter-1",
  name: "Binho",
  email: "binho@amplify.ia.br",
  role: "Sócio",
  company: "Amplify",
  signature: "Binho | Amplify",
  base_message: "Olá, {convidado}.",
  additional_cc_emails: [],
};

const invitation = {
  id: "invite-1",
  inviter_id: inviter.id,
  target_stage: "teia" as const,
  guest_name: "Leo Teste",
  guest_email: "hello@example.com",
  guest_company: "Test & Co",
  guest_role: "Tester",
  personal_message: null,
  code: "AMP-V7NJVJ",
  status: "confirmed" as const,
  first_visited_at: "2026-09-03T12:00:00Z",
  link: "https://amplify.ia.br/amplify-day/convite/token",
  subject: "Convite",
  message: "Mensagem",
  confirmation_email_status: "sent",
  confirmation_email_error: null,
  kit_sync_status: "failed",
  kit_sync_error: '{"status":401,"body":{"errors":["The API key is invalid"]}}',
  invite_email_status: "sent" as const,
  invite_email_id: "email-1",
  invite_email_cc: [],
  invite_email_error: null,
};

describe("Amplify Day invitations integration status", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    getSession.mockResolvedValue({ data: { session: { access_token: "session-token" } } });
  });

  it("shows the actual Kit error and retries only failed confirmation integrations", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      integrations: { email: null, kit: { ok: false, error: "Credencial do Kit inválida (HTTP 401)." } },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    render(<AmplifyDayInvitations initialData={{ inviters: [inviter], invitations: [invitation] }} />);

    expect(screen.getByText("Kit: Credencial do Kit inválida.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const request = fetchMock.mock.calls[0][1];
    expect(JSON.parse(String(request?.body))).toEqual({
      action: "retry_confirmation_integrations",
      invitationId: "invite-1",
    });
  });

  it("shows the destination stage as a dedicated column and filters invitations by stage", () => {
    render(<AmplifyDayInvitations initialData={{ inviters: [inviter], invitations: [invitation] }} />);

    expect(screen.getByText("Confirmados · Palco TEIA").previousElementSibling).toHaveTextContent("1");
    expect(screen.getByText("Confirmados · Palco Amplify").previousElementSibling).toHaveTextContent("0");
    expect(screen.getAllByText("Palco TEIA").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("columnheader", { name: "Palco" })).toHaveLength(2);

    fireEvent.click(screen.getByRole("combobox", { name: "Filtrar convites por palco" }));
    fireEvent.click(screen.getByRole("option", { name: "Palco Amplify" }));

    expect(screen.queryByText("Leo Teste")).not.toBeInTheDocument();
    expect(screen.getByText("Nenhum convite encontrado.")).toBeInTheDocument();
  });

  it("changes an invited person's stage from the stage column", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      invitation: { ...invitation, target_stage: "amplify" },
      kit: { ok: true },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    render(<AmplifyDayInvitations initialData={{ inviters: [inviter], invitations: [invitation] }} />);
    fireEvent.click(screen.getByRole("combobox", { name: "Alterar palco de Leo Teste" }));
    fireEvent.click(screen.getByRole("option", { name: "Palco Amplify" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      action: "update_target_stage",
      invitationId: "invite-1",
      targetStage: "amplify",
    });
  });
});
