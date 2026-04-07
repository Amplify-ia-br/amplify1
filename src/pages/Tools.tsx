import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { FadeInUp } from "@/components/animations/FadeInUp";
import { CheckCircle, Send } from "lucide-react";

const npsLabels: Record<string, string> = {
  detractor: "Detrator (0-6)",
  passive: "Neutro (7-8)",
  promoter: "Promotor (9-10)",
};

const getNpsCategory = (score: number) => {
  if (score <= 6) return "detractor";
  if (score <= 8) return "passive";
  return "promoter";
};

const Tools = () => {
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (score === null) {
      toast.error("Por favor, selecione uma nota de 0 a 10.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("nps_responses").insert({
      score,
      feedback: feedback.trim() || null,
      name: name.trim() || null,
      email: email.trim() || null,
      company: company.trim() || null,
    });
    setLoading(false);
    if (error) {
      toast.error("Erro ao enviar. Tente novamente.");
      return;
    }
    setSubmitted(true);
    toast.success("Obrigado pelo seu feedback!");
  };

  if (submitted) {
    return (
      <Layout>
        <section className="min-h-[80vh] flex items-center justify-center px-4">
          <FadeInUp variant="fade-up">
            <div className="text-center max-w-md mx-auto space-y-6">
              <CheckCircle className="h-20 w-20 text-primary mx-auto" />
              <h1 className="font-heading text-3xl md:text-4xl font-bold">
                Obrigado!
              </h1>
              <p className="text-muted-foreground text-lg">
                Sua opinião é muito importante para nós. Agradecemos por dedicar
                seu tempo para responder nossa pesquisa.
              </p>
              <Button asChild className="glow-cyan">
                <a href="/">Voltar ao início</a>
              </Button>
            </div>
          </FadeInUp>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="py-16 md:py-24 px-4">
        <div className="container mx-auto max-w-2xl">
          <FadeInUp variant="fade-up">
            <div className="text-center mb-12">
              <h1 className="font-heading text-3xl md:text-5xl font-bold mb-4">
                Pesquisa de Satisfação
              </h1>
              <p className="text-muted-foreground text-lg max-w-lg mx-auto">
                Queremos ouvir você! Sua opinião nos ajuda a melhorar nossos
                serviços e entregar ainda mais valor.
              </p>
            </div>
          </FadeInUp>

          <FadeInUp variant="fade-up" delay={0.1}>
            <div className="space-y-8 bg-card border border-border rounded-2xl p-6 md:p-10">
              {/* NPS Score */}
              <div className="space-y-4">
                <label className="text-base font-semibold">
                  Em uma escala de 0 a 10, o quanto você recomendaria a Amplify
                  para um amigo ou colega?
                </label>
                <div className="flex flex-wrap gap-2 justify-center">
                  {Array.from({ length: 11 }, (_, i) => i).map((n) => {
                    const selected = score === n;
                    const cat = getNpsCategory(n);
                    return (
                      <button
                        key={n}
                        onClick={() => setScore(n)}
                        className={cn(
                          "w-11 h-11 rounded-lg font-bold text-sm border-2 transition-all duration-200",
                          selected
                            ? cat === "promoter"
                              ? "bg-primary text-primary-foreground border-primary scale-110"
                              : cat === "passive"
                              ? "bg-yellow-500 text-black border-yellow-500 scale-110"
                              : "bg-destructive text-destructive-foreground border-destructive scale-110"
                            : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground px-1">
                  <span>Nada provável</span>
                  <span>Extremamente provável</span>
                </div>
                {score !== null && (
                  <p
                    className={cn(
                      "text-center text-sm font-medium",
                      getNpsCategory(score) === "promoter"
                        ? "text-primary"
                        : getNpsCategory(score) === "passive"
                        ? "text-yellow-500"
                        : "text-destructive"
                    )}
                  >
                    {npsLabels[getNpsCategory(score)]}
                  </p>
                )}
              </div>

              {/* Feedback */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  O que motivou sua nota? (opcional)
                </label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Conte-nos mais sobre sua experiência..."
                  className="min-h-[100px] bg-background"
                  maxLength={1000}
                />
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome (opcional)</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="bg-background"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Email (opcional)
                  </label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    type="email"
                    className="bg-background"
                    maxLength={255}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Empresa (opcional)
                </label>
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Nome da empresa"
                  className="bg-background"
                  maxLength={100}
                />
              </div>

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                disabled={loading || score === null}
                className="w-full glow-cyan text-base py-6"
                size="lg"
              >
                {loading ? "Enviando..." : "Enviar Pesquisa"}
                <Send className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </FadeInUp>
        </div>
      </section>
    </Layout>
  );
};

export default Tools;
