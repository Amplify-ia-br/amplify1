import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { adminGet, adminPost, dateTime, errorMessage, ms, REASON_LABELS, type SessionDetailResponse } from "./api";

type Props = { sessionId: string | null; highlightTurn?: number; onClose: () => void };

function Scores({ analysis }: { analysis: NonNullable<SessionDetailResponse["turns"][number]["analysis"]> }) {
  const items = [
    ["Naturalidade", analysis.naturalness],
    ["Relevância", analysis.relevance],
    ["Factualidade", analysis.factuality],
    ["Avanço", analysis.commercial_progress],
    ["Concisão", analysis.conciseness],
  ] as const;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {items.map(([label, value]) => (
        <Badge key={label} variant={value !== null && value <= 2 ? "destructive" : "secondary"} className="font-normal">
          {label} {value ?? "—"}/5
        </Badge>
      ))}
      {analysis.failure_category && analysis.failure_category !== "nenhuma" ? (
        <Badge variant="outline">{analysis.failure_category}</Badge>
      ) : null}
    </div>
  );
}

export function SessionSheet({ sessionId, highlightTurn, onClose }: Props) {
  const queryClient = useQueryClient();
  const detail = useQuery({
    queryKey: ["ana-admin", "session", sessionId],
    queryFn: () => adminGet<SessionDetailResponse>("session", {}, { id: sessionId ?? "" }),
    enabled: Boolean(sessionId),
  });

  const analyze = useMutation({
    mutationFn: () => adminPost<{ analyzed: number; failures: number }>({ action: "analyze", sessionIds: [sessionId], force: true }),
    onSuccess: (result) => {
      toast[result.analyzed ? "success" : "error"](result.analyzed ? "Conversa analisada." : "A análise falhou.");
      queryClient.invalidateQueries({ queryKey: ["ana-admin"] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const data = detail.data;

  return (
    <Sheet open={Boolean(sessionId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{data ? `${data.session.tester_name} — ${data.session.mission}` : "Conversa"}</SheetTitle>
          <SheetDescription>
            {data ? `${dateTime(data.session.created_at)} · ${data.session.model}` : "Carregando conversa"}
          </SheetDescription>
        </SheetHeader>

        {detail.isLoading ? <Loader2 className="mx-auto mt-10 h-5 w-5 animate-spin" aria-label="Carregando" /> : null}
        {detail.isError ? <p className="mt-6 text-sm text-destructive">{errorMessage(detail.error)}</p> : null}

        {data ? (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {data.session.overall_rating !== null ? <Badge>Nota {data.session.overall_rating}/5</Badge> : null}
              {data.session.helped !== null ? (
                <Badge variant="secondary">{data.session.helped ? "Ajudou" : "Não ajudou"}</Badge>
              ) : null}
              <Button size="sm" variant="outline" className="ml-auto" disabled={analyze.isPending} onClick={() => analyze.mutate()}>
                {analyze.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {data.analysis ? "Reanalisar com IA" : "Analisar com IA"}
              </Button>
            </div>

            {data.session.closing_comment ? (
              <p className="rounded-md bg-muted p-3 text-sm">Comentário final: {data.session.closing_comment}</p>
            ) : null}

            {data.analysis ? (
              <div className="rounded-md border p-3 text-sm">
                <p className="font-medium">Análise da IA</p>
                <p className="mt-1 text-muted-foreground">{data.analysis.summary}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="secondary">{data.analysis.goal_reached ? "Objetivo atingido" : "Objetivo não atingido"}</Badge>
                  {data.analysis.stage_reached ? <Badge variant="outline">{data.analysis.stage_reached}</Badge> : null}
                  {(data.analysis.topics ?? []).map((topic) => (
                    <Badge key={topic} variant="outline" className="font-normal">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            <ol className="space-y-4">
              {data.turns.map((turn) => (
                <li
                  key={turn.turn_index}
                  className={`rounded-md border p-3 ${highlightTurn === turn.turn_index ? "border-primary ring-1 ring-primary" : ""}`}
                >
                  <p className="text-xs text-muted-foreground">Turno {turn.turn_index}</p>
                  <p className="mt-2 text-xs font-medium uppercase text-muted-foreground">Usuário</p>
                  <p className="whitespace-pre-wrap text-sm">{turn.user_text}</p>
                  <p className="mt-3 text-xs font-medium uppercase text-muted-foreground">Ana</p>
                  <p className="whitespace-pre-wrap text-sm">{turn.assistant_text}</p>

                  {turn.feedback ? (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-sm">
                      {turn.feedback.verdict === 1 ? (
                        <ThumbsUp className="h-4 w-4 text-primary" aria-label="Avaliação positiva" />
                      ) : (
                        <ThumbsDown className="h-4 w-4 text-destructive" aria-label="Avaliação negativa" />
                      )}
                      {(turn.feedback.reasons ?? []).map((reason) => (
                        <Badge key={reason} variant="outline" className="font-normal">
                          {REASON_LABELS[reason] ?? reason}
                        </Badge>
                      ))}
                      {turn.feedback.comment ? <span className="text-muted-foreground">“{turn.feedback.comment}”</span> : null}
                    </div>
                  ) : null}

                  {turn.analysis ? <Scores analysis={turn.analysis} /> : null}
                  {turn.analysis?.summary ? <p className="mt-1 text-xs text-muted-foreground">{turn.analysis.summary}</p> : null}

                  <p className="mt-2 text-xs text-muted-foreground">
                    {ms(turn.latency_ms)}
                    {turn.tool_calls?.length ? ` · ferramentas: ${turn.tool_calls.join(", ")}` : ""}
                    {turn.regenerated ? " · regenerada" : ""}
                    {turn.prompt_version ? ` · prompt ${turn.prompt_version}` : ""}
                  </p>
                  {turn.issues?.length ? <p className="text-xs text-destructive">Alertas: {turn.issues.join(", ")}</p> : null}
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
