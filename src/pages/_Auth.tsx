import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "@/lib/astro-router";
import { assetSrc } from "@/lib/assets";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import logoAmplify from "@/assets/logo-amplify-branco.png";
import "@/index.css";

const loginSchema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(6, "Senha precisa ter pelo menos 6 caracteres").max(128),
});

const AuthContent = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const from = (location.state as any)?.from || "/admin";

  useEffect(() => {
    if (!authLoading && user) {
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, from]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Email ou senha incorretos" : error.message);
      return;
    }
    toast.success("Login realizado!");
    navigate(from, { replace: true });
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z.string().email("Email inválido").safeParse(email);
    if (!parsed.success) {
      toast.error("Informe um email válido");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Email de recuperação enviado! Verifique sua caixa de entrada.");
    setMode("login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md space-y-6">
        <Link to="/" className="flex justify-center">
          <img src={assetSrc(logoAmplify)} alt="Amplify" className="h-10 w-auto" />
        </Link>

        <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-heading font-bold">
              {mode === "login" ? "Entrar" : "Recuperar senha"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === "login"
                ? "Acesse a área administrativa do blog"
                : "Vamos enviar um link para redefinir sua senha"}
            </p>
          </div>

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
              </div>
              <Button type="submit" className="w-full glow-cyan" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Entrar
              </Button>
              <button type="button" onClick={() => setMode("forgot")} className="block text-sm text-muted-foreground hover:text-primary mx-auto">
                Esqueci minha senha
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgot} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <Button type="submit" className="w-full glow-cyan" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enviar link de recuperação
              </Button>
              <button type="button" onClick={() => setMode("login")} className="block text-sm text-muted-foreground hover:text-primary mx-auto">
                Voltar ao login
              </button>
            </form>
          )}
        </div>

        <Link to="/" className="block text-center text-sm text-muted-foreground hover:text-primary">
          ← Voltar ao site
        </Link>
      </div>
    </div>
  );
};

const Auth = () => (
  <AuthProvider>
    <Sonner />
    <AuthContent />
  </AuthProvider>
);

export default Auth;
