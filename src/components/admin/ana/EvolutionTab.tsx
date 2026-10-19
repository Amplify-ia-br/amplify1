import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Filters } from "@/lib/ana-zero/admin/types";
import { adminGet, dateTime, errorMessage, ms, pct, usd, type EvolutionResponse, type RecommendationsResponse } from "./api";
import { Empty, Panel } from "./shared";

export function EvolutionTab({ filters }: { filters: Filters }) {
  const { promptVersion: _ignored, ...rest } = filters;
  const evolution = useQuery({
    queryKey: ["ana-admin", "evolution", rest],
    queryFn: () => adminGet<EvolutionResponse>("evolution", rest),
  });
  const recommendations = useQuery({
    queryKey: ["ana-admin", "recommendations"],
    queryFn: () => adminGet<RecommendationsResponse>("recommendations"),
  });

  if (evolution.isError) return <p className="text-sm text-destructive">{errorMessage(evolution.error)}</p>;
  if (!evolution.data) return null;
  const { versions, currentVersion } = evolution.data;
  const implemented = (recommendations.data?.recommendations ?? []).filter((r) => r.status === "implementada");

  if (!versions.length) return <Empty>Sem turnos registrados para comparar versões.</Empty>;

  const chart = versions.map((v) => ({
    version: v.version,
    aprovacao: v.positiveRate === null ? null : Math.round(v.positiveRate * 100),
    alertas: v.issueRate === null ? null : Math.round(v.issueRate * 100),
  }));

  return (
    <div className="space-y-6">
      <Panel title="Aprovação e alertas por versão do prompt (%)">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="version" fontSize={12} />
              <YAxis domain={[0, 100]} fontSize={12} width={32} />
              <Tooltip />
              <Bar dataKey="aprovacao" name="Aprovação" fill="hsl(var(--primary))" />
              <Bar dataKey="alertas" name="Alertas" fill="hsl(var(--destructive))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Versão do prompt</TableHead>
              <TableHead className="text-right">Conversas</TableHead>
              <TableHead className="text-right">Turnos</TableHead>
              <TableHead className="text-right">Avaliados</TableHead>
              <TableHead className="text-right">Aprovação</TableHead>
              <TableHead className="text-right">Nota final</TableHead>
              <TableHead className="text-right">Alertas</TableHead>
              <TableHead className="text-right">Regeneração</TableHead>
              <TableHead className="text-right">Latência</TableHead>
              <TableHead className="text-right">Custo/turno</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.map((v) => (
              <TableRow key={v.version}>
                <TableCell className="whitespace-nowrap">
                  {v.version}
                  {v.version === currentVersion ? <Badge className="ml-2">atual</Badge> : null}
                </TableCell>
                <TableCell className="text-right tabular-nums">{v.sessions}</TableCell>
                <TableCell className="text-right tabular-nums">{v.turns}</TableCell>
                <TableCell className="text-right tabular-nums">{v.ratedTurns}</TableCell>
                <TableCell className="text-right tabular-nums">{pct(v.positiveRate)}</TableCell>
                <TableCell className="text-right tabular-nums">{v.avgRating ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{pct(v.issueRate)}</TableCell>
                <TableCell className="text-right tabular-nums">{pct(v.regenerationRate)}</TableCell>
                <TableCell className="text-right tabular-nums">{ms(v.latencyP50)}</TableCell>
                <TableCell className="text-right tabular-nums">{usd(v.costPerTurnUsd, 4)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Panel title="Mudanças implementadas">
        {implemented.length ? (
          <ul className="space-y-2 text-sm">
            {implemented.map((item) => (
              <li key={item.id}>
                <span className="font-medium">{item.title}</span>
                <span className="text-muted-foreground">
                  {" "}
                  — {item.decided_at ? dateTime(item.decided_at) : ""}
                  {item.prompt_version ? ` · prompt ${item.prompt_version}` : ""}
                  {item.implemented_commit ? ` · ${item.implemented_commit}` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhuma ainda. Marque uma recomendação como implementada para relacioná-la à versão do prompt.
          </p>
        )}
      </Panel>
    </div>
  );
}
