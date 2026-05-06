import { useEffect, useState } from "react";
import { z } from "zod";
import { Loader2, Mail, Trash2, Shield, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  roles: ("admin" | "editor")[];
}

const inviteSchema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
});

const UserManagement = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name").order("created_at", { ascending: true }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const merged: UserRow[] = (profiles ?? []).map((p) => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as "admin" | "editor"),
    }));
    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = inviteSchema.safeParse({ email: inviteEmail });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setInviting(true);
    // Send password recovery email — Supabase auto-creates the user via trigger flow only if signup is enabled.
    // For invitation flow, we use the password recovery email which works for both new and existing users.
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setInviting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(
      "Email enviado! Importante: o cadastro público está desabilitado, então o usuário precisa existir. Se for um novo membro da agência, peça para o admin criar a conta primeiro nas configurações do backend.",
      { duration: 8000 }
    );
    setInviteEmail("");
  };

  const toggleRole = async (userId: string, role: "editor", currentlyHas: boolean) => {
    if (currentlyHas) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) { toast.error(error.message); return; }
      toast.success("Permissão removida");
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) { toast.error(error.message); return; }
      toast.success("Permissão concedida");
    }
    load();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-heading font-bold">Usuários</h1>
        <p className="text-sm text-muted-foreground">Gerencie quem pode acessar a área administrativa.</p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="font-semibold">Enviar link de acesso</h2>
        <p className="text-sm text-muted-foreground">
          Envia um link de definição de senha para o email informado. O cadastro público está desabilitado — para criar uma conta nova,
          adicione o usuário primeiro pelo backend (Cloud → Users) e depois envie o link aqui ou conceda a permissão de editor abaixo.
        </p>
        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor="invite-email" className="sr-only">Email</Label>
            <Input id="invite-email" type="email" placeholder="agencia@exemplo.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
          </div>
          <Button type="submit" disabled={inviting} className="glow-cyan">
            {inviting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
            Enviar link
          </Button>
        </form>
      </div>

      <div className="space-y-2">
        <h2 className="font-semibold">Lista de usuários</h2>
        {loading ? (
          <p className="text-muted-foreground text-center py-8">Carregando...</p>
        ) : users.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhum usuário cadastrado.</p>
        ) : (
          users.map((u) => {
            const isAdmin = u.roles.includes("admin");
            const isEditor = u.roles.includes("editor");
            return (
              <div key={u.id} className="flex flex-col md:flex-row md:items-center gap-3 p-4 bg-card border border-border rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{u.full_name ?? u.email ?? "(sem nome)"}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {isAdmin && <Badge className="bg-primary/15 text-primary"><Shield className="h-3 w-3 mr-1" />Admin</Badge>}
                  {isEditor && <Badge variant="secondary"><Pencil className="h-3 w-3 mr-1" />Editor</Badge>}
                  {!isAdmin && !isEditor && <Badge variant="outline">Sem permissão</Badge>}
                </div>
                {!isAdmin && (
                  <Button
                    variant={isEditor ? "outline" : "default"}
                    size="sm"
                    onClick={() => toggleRole(u.id, "editor", isEditor)}
                  >
                    {isEditor ? "Remover editor" : "Tornar editor"}
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default UserManagement;
