import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminGet, adminPost, dateTime, errorMessage, type InvitesResponse } from "@/components/admin/ana/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { profileLabel } from "@/lib/ana-zero/lab/profiles";
import type { InviteRow } from "@/lib/ana-zero/lab/types";

const QUERY_KEY = ["ana-admin", "invites"];

const inviteLink = (code: string) => `${window.location.origin}/ana-lab/convite/${code}`;

function inviteStatus(invite: InviteRow) {
  if (invite.revoked_at) return { label: "Revogado", variant: "destructive" as const };
  if (new Date(invite.expires_at).getTime() <= Date.now()) return { label: "Expirado", variant: "secondary" as const };
  if (invite.uses >= invite.max_uses) return { label: "Esgotado", variant: "secondary" as const };
  return { label: "Ativo", variant: "default" as const };
}

export function InvitesTab() {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");
  const [email, setEmail] = useState("");
  const [cohort, setCohort] = useState("");
  const [maxUses, setMaxUses] = useState(1);
  const [expiresInDays, setExpiresInDays] = useState(14);
  const [copied, setCopied] = useState<string | null>(null);

  const invites = useQuery({ queryKey: QUERY_KEY, queryFn: () => adminGet<InvitesResponse>("invites") });
  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const create = useMutation({
    mutationFn: () =>
      adminPost<{ invite: InviteRow }>({
        action: "create-invite",
        label,
        email: email || undefined,
        cohort: cohort || undefined,
        maxUses,
        expiresInDays,
      }),
    onSuccess: async ({ invite }) => {
      setLabel("");
      setEmail("");
      await copy(invite.code);
      refresh();
    },
  });
  const revokeInvite = useMutation({
    mutationFn: (id: string) => adminPost({ action: "revoke-invite", id }),
    onSuccess: refresh,
  });
  const revokeTester = useMutation({
    mutationFn: (id: string) => adminPost({ action: "revoke-tester", id }),
    onSuccess: refresh,
  });

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(inviteLink(code));
      setCopied(code);
      setTimeout(() => setCopied((current) => (current === code ? null : current)), 2_000);
    } catch {
      setCopied(null);
    }
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (label.trim()) create.mutate();
  };

  const error = invites.error ?? create.error ?? revokeInvite.error ?? revokeTester.error;

  return (
    <div className="space-y-8">
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
        <div className="space-y-1">
          <Label htmlFor="invite-label" className="text-xs text-muted-foreground">Nome do convidado</Label>
          <Input id="invite-label" className="w-52" value={label} maxLength={80} required onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="invite-email" className="text-xs text-muted-foreground">E-mail (opcional)</Label>
          <Input id="invite-email" type="email" className="w-56" value={email} maxLength={160} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="invite-cohort" className="text-xs text-muted-foreground">Turma (opcional)</Label>
          <Input id="invite-cohort" className="w-36" value={cohort} maxLength={40} onChange={(e) => setCohort(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="invite-uses" className="text-xs text-muted-foreground">Usos</Label>
          <Input id="invite-uses" type="number" min={1} max={500} className="w-20" value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value) || 1)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="invite-days" className="text-xs text-muted-foreground">Validade (dias)</Label>
          <Input id="invite-days" type="number" min={1} max={90} className="w-24" value={expiresInDays} onChange={(e) => setExpiresInDays(Number(e.target.value) || 14)} />
        </div>
        <Button type="submit" disabled={create.isPending || !label.trim()}>
          {create.isPending ? "Criando..." : "Criar e copiar link"}
        </Button>
        <p className="w-full text-xs text-muted-foreground">
          Use 1 uso para convite individual. Para uma turma, crie um convite com vários usos e uma turma em comum.
        </p>
      </form>

      {error ? <p className="text-sm text-destructive" role="alert">{errorMessage(error)}</p> : null}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Convites</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Convidado</TableHead>
              <TableHead>Turma</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Usos</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(invites.data?.invites ?? []).map((invite) => {
              const status = inviteStatus(invite);
              return (
                <TableRow key={invite.id}>
                  <TableCell>{invite.label}</TableCell>
                  <TableCell>{invite.cohort ?? "—"}</TableCell>
                  <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                  <TableCell>{invite.uses}/{invite.max_uses}</TableCell>
                  <TableCell>{dateTime(invite.expires_at)}</TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button type="button" size="sm" variant="outline" onClick={() => copy(invite.code)}>
                      {copied === invite.code ? "Copiado" : "Copiar link"}
                    </Button>
                    {!invite.revoked_at ? (
                      <Button type="button" size="sm" variant="ghost" disabled={revokeInvite.isPending} onClick={() => revokeInvite.mutate(invite.id)}>
                        Revogar
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
            {invites.data && invites.data.invites.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum convite criado ainda.</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Testadores cadastrados</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Turma</TableHead>
              <TableHead>Conversas</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead className="text-right">Acesso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(invites.data?.testers ?? []).map((tester) => (
              <TableRow key={tester.id}>
                <TableCell>{tester.name}</TableCell>
                <TableCell>{tester.email}</TableCell>
                <TableCell>{profileLabel(tester.profile)}</TableCell>
                <TableCell>{tester.cohort ?? "—"}</TableCell>
                <TableCell>{tester.sessions}</TableCell>
                <TableCell>{dateTime(tester.created_at)}</TableCell>
                <TableCell className="text-right">
                  {tester.revoked_at ? (
                    <Badge variant="destructive">Revogado</Badge>
                  ) : (
                    <Button type="button" size="sm" variant="ghost" disabled={revokeTester.isPending} onClick={() => revokeTester.mutate(tester.id)}>
                      Revogar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {invites.data && invites.data.testers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">Ninguém se cadastrou ainda.</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
