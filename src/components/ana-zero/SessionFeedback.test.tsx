import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./diagnostics", () => ({ sendFeedback: vi.fn(async () => true) }));

import { sendFeedback } from "./diagnostics";
import SessionFeedback from "./SessionFeedback";

const SESSION_ID = "6f1d7a52-3b0e-4c53-9d0a-0b7f4f6e2a11";

describe("SessionFeedback", () => {
  it("exige nota, resolução e confiança antes de concluir", async () => {
    render(<SessionFeedback sessionId={SESSION_ID} onClose={vi.fn()} />);

    const submit = screen.getByRole("button", { name: "Concluir e enviar para análise" });
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByRole("radio", { name: "4 de 5" }));
    fireEvent.click(screen.getAllByRole("radio", { name: "Sim" })[0]);
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getAllByRole("radio", { name: "Sim" })[1]);
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    await waitFor(() =>
      expect(sendFeedback).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "session", sessionId: SESSION_ID, rating: 4, helped: true, trusted: true }),
      ),
    );
    expect(await screen.findByText("Teste concluído. Obrigado.")).toBeInTheDocument();
  });
});
