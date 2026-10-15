import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Filters } from "@/lib/ana-zero/admin/types";
import { adminGet, dateTime, errorMessage, type SessionsResponse, usd } from "./api";
import { SessionSheet } from "./SessionSheet";
import { Empty } from "./shared";

const CHIPS = [
  { id: "", label: "Todas" },
  { id: "negative", label: "Com avaliação negativa" },
  { id: "issues", label: "Com alertas" },
  { id: "unrated", label: "Sem avaliação" },
] as const;

export function SessionsTab({ filters }: { filters: Filters }) {
  const [only, setOnly] = useState<string>("");
  const [open, setOpen] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["ana-admin", "sessions", filters, only],
    queryFn: () => adminGet<SessionsResponse>("sessions", filters, only ? { only } : {}),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar conversas">
        {CHIPS.map((chip) => (
          <Button key={chip.id} size="sm" variant={only === chip.id ? "default" : "outline"} onClick={() => setOnly(chip.id)}>
            {chip.label}
          </Button>
        ))}
      </div>

      {query.isError ? <p className="text-sm text-destructive">{errorMessage(query.error)}</p> : null}
      {query.data && !query.data.sessions.length ? <Empty>Nenhuma conversa neste filtro.</Empty> : null}

      {query.data?.sessions.length ? (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Testador</TableHead>
                <TableHead>Missão</TableHead>
                <TableHead className="text-right">Turnos</TableHead>
                <TableHead>Avaliações</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead>IA</TableHead>
                <TableHead className="text-right">Custo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.sessions.map((session) => (
                <TableRow
                  key={session.id}
                  tabIndex={0}
                  role="button"
                  className="cursor-pointer"
                  onClick={() => setOpen(session.id)}
                  onKeyDown={(event) => event.key === "Enter" && setOpen(session.id)}
                >
                  <TableCell className="whitespace-nowrap">{dateTime(session.createdAt)}</TableCell>
                  <TableCell>{session.testerName}</TableCell>
                  <TableCell>{session.mission}</TableCell>
                  <TableCell className="text-right tabular-nums">{session.turns}</TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    +{session.positive} / -{session.negative}
                    {session.hasIssues || session.hasErrors ? <Badge variant="outline" className="ml-2">alerta</Badge> : null}
                  </TableCell>
                  <TableCell>{session.overallRating ?? "—"}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {session.analyzed ? (session.analysisSummary ?? "Analisada") : "Pendente"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{usd(session.costUsd, 3)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      <SessionSheet sessionId={open} onClose={() => setOpen(null)} />
    </div>
  );
}
