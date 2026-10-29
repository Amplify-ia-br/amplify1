import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TesterSetup from "./TesterSetup";

const base = {
  tester: "Leo",
  showName: false,
  missionId: "dono-escola",
  onTesterChange: vi.fn(),
  onMissionChange: vi.fn(),
};

describe("TesterSetup", () => {
  it("mostra apenas a missão recomendada na primeira entrada", () => {
    const onChooseOther = vi.fn();
    render(<TesterSetup {...base} recommended onChooseOther={onChooseOther} />);

    expect(screen.getByRole("heading", { name: "Sua primeira missão" })).toBeInTheDocument();
    expect(screen.getByText("Dono de escola")).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Escolher outro cenário" }));
    expect(onChooseOther).toHaveBeenCalledOnce();
  });

  it("mostra todos os cenários quando a pessoa decide trocar", () => {
    const onMissionChange = vi.fn();
    render(<TesterSetup {...base} recommended={false} onMissionChange={onMissionChange} />);

    expect(screen.getByRole("heading", { name: "Escolha o próximo cenário" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(8);
    fireEvent.click(screen.getByRole("radio", { name: /Cético/ }));
    expect(onMissionChange).toHaveBeenCalledWith("cetico");
  });
});
