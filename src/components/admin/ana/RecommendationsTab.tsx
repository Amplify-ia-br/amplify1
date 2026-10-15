import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { RecommendationRow, RecommendationStatus } from "@/lib/ana-zero/admin/types";
import { adminGet, adminPost, dateTime, errorMessage, usd, type DecideInput, type RecommendationsResponse } from "./api";
import { SessionSheet } from "./SessionSheet";
import { Empty, Panel } from "./shared";

const STATUS_LABELS: Record<RecommendationStatus, string> = {
  nova: "Nova",
  aceita: "Aceita",
  rejeitada: "Rejeitada",
  implementada: "Implementada",
};

function RecommendationCard({
  item,
  onOpenEvidence,
  onDecide,
  pending,
}: {
  item: RecommendationRow;
  onOpenEvidence: (sessionId: string, turnIndex: number) => void;
  onDecide: (input: DecideInput) => void;
  pending: boolean;
}) {
  const [note, setNote] = useState(item.decision_note ?? "");
  const [commit, setCommit] = useState(item.implemented_commit ?? "");

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="font-medium">{item.title}</h3>
          <Badge variant={item.status === "nova" ? "default" : "secondary"}>{STATUS_LABELS[item.status]}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{item.rationale}</p>

        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Mudança proposta</p>
          <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{item.proposed_change}</p>
        </div>
        {item.regression_scenario ? (
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Cenário de regressão</p>
            <p className="text-sm">{item.regression_scenario}</p>
          </div>
        ) : null}

        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Evidências</p>
          <ul className="mt-1 space-y-1">
            {item.evidence.map((evidence) => (
              <li key={`${evidence.sessionId}:${evidence.turnIndex}`} className="text-sm">
                <button
                  type="button"
                  className="text-left underline-offset-2 hover:underline"
                  onClick={() => onOpenEvidence(evidence.sessionId, evidence.turnIndex)}
                >
                  Turno {evidence.turnIndex}
                </button>
                <span className="text-muted-foreground"> — {evidence.note}</span>
              </li>
            ))}
          </ul>
        </div>

        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Nota da decisão (opcional)"
          aria-label="Nota da decisão"
          rows={2}
          maxLength={1000}
        />
        {item.status === "aceita" || item.status === "implementada" ? (
          <Input
            value={commit}
            onChange={(event) => setCommit(event.target.value)}
            placeholder="Commit ou PR da implementação (opcional)"
            aria-label="Commit ou PR da implementação"
            maxLength={80}
          />
        ) : null}

        <div className="flex flex-wrap gap-2">
          {item.status !== "aceita" ? (
            <Button size="sm" disabled={pending} onClick={() => onDecide({ id: item.id, status: "aceita", note })}>
              Aceitar
            </Button>
          ) : null}
          {item.status === "aceita" ? (
            <Button
              size="sm"
              disabled={pending}
              onClick={() => onDecide({ id: item.id, status: "implementada", note, implementedCommit: commit })}
            >
              Marcar como implementada
            </Button>
          ) : null}
          {item.status !== "rejeitada" ? (
            <Button size="sm" variant="outline" disabled={pending} onClick={() => onDecide({ id: item.id, status: "rejeitada", note })}>
              Rejeitar
            </Button>
          ) : null}
          {item.status !== "nova" ? (
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => onDecide({ id: item.id, status: "nova" })}>
              Reabrir
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function RecommendationsTab() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<{ sessionId: string; turnIndex: number } | null>(null);
  const [statusFilter, setStatusFilter] = useState<RecommendationStatus | "">("");

  const query = useQuery({
    queryKey: ["ana-admin", "recommendations"],
    queryFn: () => adminGet<RecommendationsResponse>("recommendations"),
  });

  const generate = useMutation({
    mutationFn: () => adminPost<{ created: number; discarded: number; costUsd: number }>({ action: "recommend" }),
    onSuccess: (result) => {
      toast.success(
        result.created
          ? `${result.created} recomendação(ões) nova(s).`
          : "A IA não encontrou mudanças novas sustentadas pelos dados.",
      );
      queryClient.invalidateQueries({ queryKey: ["ana-admin", "recommendations"] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const decide = useMutation({
    mutationFn: (input: DecideInput) => adminPost({ action: "decide", ...input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ana-admin", "recommendations"] }),
    onError: (error) => toast.error(errorMessage(error)),
  });

  const items = (query.data?.recommendations ?? []).filter((item) => !statusFilter || item.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por status">
          <Button size="sm" variant={statusFilter === "" ? "default" : "outline"} onClick={() => setStatusFilter("")}>
            Todas
          </Button>
          {(Object.keys(STATUS_LABELS) as RecommendationStatus[]).map((status) => (
            <Button key={status} size="sm" variant={statusFilter === status ? "default" : "outline"} onClick={() => setStatusFilter(status)}>
              {STATUS_LABELS[status]}
            </Button>
          ))}
        </div>
        <Button disabled={generate.isPending} onClick={() => generate.mutate()}>
          {generate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {generate.isPending ? "Analisando (até 1 min)" : "Gerar recomendações"}
        </Button>
      </div>

      {query.isError ? <p className="text-sm text-destructive">{errorMessage(query.error)}</p> : null}
      {query.data && !items.length ? (
        <Empty>Nenhuma recomendação aqui. Gere novas a partir das conversas e avaliações já registradas.</Empty>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((item) => (
          <RecommendationCard
            key={item.id}
            item={item}
            pending={decide.isPending}
            onDecide={(input) => decide.mutate(input)}
            onOpenEvidence={(sessionId, turnIndex) => setOpen({ sessionId, turnIndex })}
          />
        ))}
      </div>

      {query.data?.runs.length ? (
        <Panel title="Histórico de análises">
          <ul className="space-y-1 text-sm">
            {query.data.runs.map((run) => (
              <li key={run.id} className="flex flex-wrap justify-between gap-2 text-muted-foreground">
                <span>
                  {dateTime(run.created_at)} · {run.kind === "sessions" ? "conversas" : "recomendações"} · {run.model}
                </span>
                <span className="tabular-nums">
                  {run.status === "failed"
                    ? "falhou"
                    : run.kind === "sessions"
                      ? `${run.sessions_analyzed} conversas`
                      : `${run.recommendations_created} recomendações`}{" "}
                  · {usd(run.cost_usd, 3)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <SessionSheet sessionId={open?.sessionId ?? null} highlightTurn={open?.turnIndex} onClose={() => setOpen(null)} />
    </div>
  );
}
