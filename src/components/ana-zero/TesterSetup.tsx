import { TEST_MISSIONS } from "@/lib/ana-zero/missions";

type Props = {
  tester: string;
  showName?: boolean;
  missionId: string;
  onTesterChange: (value: string) => void;
  onMissionChange: (value: string) => void;
  recommended?: boolean;
  onChooseOther?: () => void;
};

export default function TesterSetup({
  tester,
  showName = true,
  missionId,
  onTesterChange,
  onMissionChange,
  recommended = false,
  onChooseOther,
}: Props) {
  const mission = TEST_MISSIONS.find((item) => item.id === missionId) ?? TEST_MISSIONS[TEST_MISSIONS.length - 1];

  return (
    <section className="az-setup" aria-labelledby="az-setup-title">
      <h2 id="az-setup-title">Cenário desta conversa</h2>
      <p className="az-setup-context">
        {recommended
          ? "Seu perfil real já está salvo. Agora simule esta situação para testar como a Ana responde."
          : "Escolha a situação que você vai simular. Isso não altera o seu perfil real."}
      </p>
      {showName && (
        <label className="az-field">
          <span>Seu nome (opcional)</span>
          <input
            type="text"
            value={tester}
            maxLength={80}
            autoComplete="off"
            placeholder="Como devemos te chamar no relatório?"
            onChange={(event) => onTesterChange(event.target.value)}
          />
        </label>
      )}
      {recommended ? (
        <div className="az-recommended-mission">
          <strong>{mission.title}</strong>
          <span>{mission.brief}</span>
          <button type="button" onClick={onChooseOther}>Trocar cenário</button>
        </div>
      ) : (
        <fieldset className="az-missions">
          <legend>Escolha um cenário de teste</legend>
          <div>
            {TEST_MISSIONS.map((item) => (
              <label key={item.id} className={item.id === missionId ? "is-selected" : undefined}>
                <input
                  type="radio"
                  name="mission"
                  value={item.id}
                  checked={item.id === missionId}
                  onChange={() => onMissionChange(item.id)}
                />
                <strong>{item.title}</strong>
                <span>{item.brief}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </section>
  );
}
