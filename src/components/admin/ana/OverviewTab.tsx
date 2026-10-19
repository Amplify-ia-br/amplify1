import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminPost, errorMessage, ms, pct, REASON_LABELS, usd, type OverviewResponse } from "./api";
import { Empty, Kpi, Panel, RankList } from "./shared";

export function OverviewTab({ data }: { data: OverviewResponse }) {
  const queryClient = useQueryClient();
  const { overview, pendingAnalysis } = data;

  const analyze = useMutation({
    mutationFn: () => adminPost<{ analyzed: number; failures: number; remaining: number; costUsd: number }>({ action: "analyze" }),
    onSuccess: (result) => {
      const message = `${result.analyzed} conversa(s) analisada(s)` +
        `${result.failures ? `, ${result.failures} falharam e continuam na fila` : ""}` +
        `${result.remaining ? `. Restam ${result.remaining}.` : "."}`;
      if (!result.analyzed && result.failures) toast.error(message);
      else if (result.failures) toast.warning(message);
      else toast.success(message);
      queryClient.invalidateQueries({ queryKey: ["ana-admin"] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (!overview.sessions) return <Empty>Nenhuma conversa neste filtro ainda.</Empty>;

  return (
    <div className="space-y-6">
      {pendingAnalysis > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/40 p-3 text-sm">
          <span>{pendingAnalysis} conversa(s) aguardando análise automática. Use o botão apenas para processar a fila agora.</span>
          <Button size="sm" disabled={analyze.isPending} onClick={() => analyze.mutate()}>
            {analyze.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {analyze.isPending ? "Processando fila..." : "Processar pendências agora"}
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Conversas" value={overview.sessions} hint={`${overview.testers} testador(es)`} />
        <Kpi label="Turnos" value={overview.turns} hint={`${overview.avgTurnsPerSession} por conversa`} />
        <Kpi
          label="Aprovação dos turnos"
          value={pct(overview.positiveRate)}
          hint={`${overview.ratedTurns} avaliados (${pct(overview.ratedShare)})${overview.ratedTurns < 30 ? " · amostra pequena" : ""}`}
        />
        <Kpi label="Nota média final" value={overview.avgRating ?? "—"} hint={`Resolveu: ${pct(overview.helpedRate)} · confiança: ${pct(overview.trustedRate)}`} />
        <Kpi label="Turnos com alerta" value={pct(overview.issueRate)} />
        <Kpi label="Regeneração" value={pct(overview.regenerationRate)} hint={`Erros: ${pct(overview.errorRate)}`} />
        <Kpi label="Latência" value={ms(overview.latencyP50)} hint={`p95 ${ms(overview.latencyP95)}`} />
        <Kpi label="Custo" value={usd(overview.totalCostUsd)} hint={`${usd(overview.costPerSessionUsd, 3)} por conversa`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="Avaliações por dia">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview.byDay}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tickFormatter={(d: string) => d.slice(5)} fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} width={28} />
                  <Tooltip />
                  <Bar dataKey="positive" name="Positivas" stackId="a" fill="hsl(var(--primary))" />
                  <Bar dataKey="negative" name="Negativas" stackId="a" fill="hsl(var(--destructive))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
        <Panel title="Motivos das avaliações negativas">
          <RankList
            items={overview.topReasons}
            format={(name) => REASON_LABELS[name] ?? name}
            empty="Nenhuma avaliação negativa com motivo."
          />
        </Panel>
      </div>
    </div>
  );
}
