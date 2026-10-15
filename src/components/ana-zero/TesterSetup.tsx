import { TEST_MISSIONS } from "@/lib/ana-zero/missions";

type Props = {
  tester: string;
  showName?: boolean;
  missionId: string;
  onTesterChange: (value: string) => void;
  onMissionChange: (value: string) => void;
};

export default function TesterSetup({ tester, showName = true, missionId, onTesterChange, onMissionChange }: Props) {
  return (
    <section className="az-setup" aria-labelledby="az-setup-title">
      <h2 id="az-setup-title">Antes de começar</h2>
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
      <fieldset className="az-missions">
        <legend>Escolha uma missão</legend>
        <div>
          {TEST_MISSIONS.map((mission) => (
            <label key={mission.id} className={mission.id === missionId ? "is-selected" : undefined}>
              <input
                type="radio"
                name="mission"
                value={mission.id}
                checked={mission.id === missionId}
                onChange={() => onMissionChange(mission.id)}
              />
              <strong>{mission.title}</strong>
              <span>{mission.brief}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
