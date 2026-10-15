import { useQuery } from "@tanstack/react-query";
import type { Filters } from "@/lib/ana-zero/admin/types";
import { adminGet, errorMessage, pct, type ContentResponse } from "./api";
import { Empty, Kpi, Panel, RankList } from "./shared";

const SCORE_LABELS: Record<string, string> = {
  naturalness: "Naturalidade",
  relevance: "Relevância",
  factuality: "Factualidade",
  commercial_progress: "Avanço comercial",
  conciseness: "Concisão",
};

export function ContentTab({ filters }: { filters: Filters }) {
  const query = useQuery({
    queryKey: ["ana-admin", "content", filters],
    queryFn: () => adminGet<ContentResponse>("content", filters),
  });

  if (query.isError) return <p className="text-sm text-destructive">{errorMessage(query.error)}</p>;
  if (!query.data) return null;
  const { content } = query.data;

  return (
    <div className="space-y-6">
      {!content.analyzedSessions ? (
        <Empty>Nenhuma conversa analisada ainda. Use “Analisar conversas” na Visão geral para gerar temas, objeções e notas.</Empty>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Conversas analisadas" value={`${content.analyzedSessions}/${content.totalSessions}`} />
        <Kpi label="Objetivo atingido" value={pct(content.goalReachedRate)} />
        <Kpi label="Handoffs para humano" value={content.handoffs} />
        <Kpi label="Turnos analisados" value={content.analyzedTurns} />
      </div>

      <Panel title="Nota média da Ana (1 a 5)">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {Object.entries(content.scores).map(([key, value]) => (
            <div key={key}>
              <dt className="text-xs text-muted-foreground">{SCORE_LABELS[key] ?? key}</dt>
              <dd className="text-xl font-semibold tabular-nums">{value ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Panel title="Temas">
          <RankList items={content.topics} />
        </Panel>
        <Panel title="Objeções">
          <RankList items={content.objections} />
        </Panel>
        <Panel title="Tipos de falha">
          <RankList items={content.failureCategories} empty="Nenhuma falha classificada." />
        </Panel>
        <Panel title="Etapa alcançada">
          <RankList items={content.stages} />
        </Panel>
        <Panel title="Intenções">
          <RankList items={content.intents} />
        </Panel>
        <Panel title="Ferramentas usadas">
          <RankList items={content.toolUsage} />
        </Panel>
        <Panel title="Fontes mais citadas">
          <RankList items={content.topSources} />
        </Panel>
        <Panel title="Memória capturada (conversas com o dado)">
          <RankList
            items={content.memoryCoverage.map((item) => ({ name: item.key, total: item.sessions }))}
            empty="Sem dados de memória."
          />
        </Panel>
      </div>
    </div>
  );
}
