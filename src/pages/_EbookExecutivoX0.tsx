import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Download,
  CheckCircle,
  Loader2,
  BookOpen,
  Compass,
  PenTool,
  Cpu,
  Rocket,
  Sparkles,
  Lightbulb,
  Gauge,
} from "lucide-react";
import { assetSrc } from "@/lib/assets";
import { Button } from "@/components/ui/button";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrapper";
import { supabase, hasSupabaseConfig } from "@/integrations/supabase/client";
import logoAmplify from "@/assets/logo-amplify-branco.png";
import cover from "@/assets/ebook/executivo-x0-cover.png";

const PDF_URL = "/materiais/executivo-x0-amplify.pdf";
const PDF_FILENAME = "Executivo-X0-Sem-Barreiras-Amplify.pdf";

const beneficios = [
  {
    icon: Lightbulb,
    title: "A ideia voltou ao centro",
    description:
      "Por que a IA dissolveu a barreira entre quem tem ideias e quem sabe construir — e o que isso muda para quem lidera.",
  },
  {
    icon: Compass,
    title: "Os 4 estágios do novo ciclo",
    description:
      "Concepção, Projeto, Execução e Operação & Escala: o caminho mais curto entre a ideia e o negócio.",
  },
  {
    icon: Gauge,
    title: "A nova régua de liderança",
    description:
      "Liderar deixou de ser saber executar. Passou a ser decidir o que vale ser executado — e assumir a responsabilidade.",
  },
];

const estagios = [
  { icon: Lightbulb, n: "01", title: "Concepção", desc: "Transformar intenção em hipótese clara de negócio." },
  { icon: PenTool, n: "02", title: "Projeto", desc: "Dar forma ao que antes exigia uma equipe inteira." },
  { icon: Cpu, n: "03", title: "Execução", desc: "Construir e validar em uma fração do tempo." },
  { icon: Rocket, n: "04", title: "Operação & Escala", desc: "Operar, medir e crescer com a IA no centro." },
];

const autores = [
  { iniciais: "FG", nome: "Fernando Godoy", papel: "CEO & Cofundador da Amplify" },
  { iniciais: "LC", nome: "Leonardo Camacho", papel: "Cofundador da Amplify" },
  { iniciais: "MM", nome: "Magno Maciel", papel: "Engenheiro & Pesquisador em IA" },
];

const emailValido = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

type Status = "idle" | "loading" | "success";

const EbookExecutivoX0 = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [site, setSite] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const startDownload = () => {
    const a = document.createElement("a");
    a.href = PDF_URL;
    a.download = PDF_FILENAME;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Por favor, informe seu nome.");
      return;
    }
    if (!emailValido(email)) {
      setError("Por favor, informe um e-mail válido.");
      return;
    }

    setStatus("loading");

    // Captura o lead (não bloqueia o download caso o backend não esteja disponível).
    if (hasSupabaseConfig) {
      try {
        await supabase.from("ebook_leads").insert({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          company_site: site.trim() || null,
          source: "lp-executivo-x0",
        });
      } catch (err) {
        console.warn("Falha ao registrar lead do ebook:", err);
      }
    }

    setStatus("success");
    startDownload();
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      {/* Header minimalista */}
      <header className="border-b border-border/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <a href="https://amplify.ia.br" target="_blank" rel="noopener noreferrer" className="flex items-center">
            <img src={assetSrc(logoAmplify)} alt="Amplify" className="h-7 w-auto" />
          </a>
          <span className="hidden sm:inline text-[11px] tracking-[0.25em] uppercase text-muted-foreground">
            Inteligência Artificial Aplicada
          </span>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero + Form */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 gradient-bg" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
          <div
            className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-20"
            style={{ background: "radial-gradient(circle, hsl(177 70% 41%) 0%, transparent 70%)" }}
          />

          <div className="container mx-auto px-4 relative z-10 py-16 md:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Copy */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="space-y-7"
              >
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium tracking-[0.18em] uppercase text-primary">
                  <BookOpen className="h-3.5 w-3.5" />
                  Ebook gratuito
                </span>

                <div className="space-y-3">
                  <p className="text-sm tracking-[0.22em] uppercase text-primary/90">
                    O playbook do executivo na era da IA
                  </p>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold leading-[1.05]">
                    Executivo X.0
                    <span className="block gradient-text italic">Sem Barreiras</span>
                  </h1>
                </div>

                <p className="text-lg text-muted-foreground max-w-xl">
                  Como a inteligência artificial está redefinindo a forma de construir — e devolvendo a ideia ao
                  centro do negócio. Um guia direto para quem lidera.
                </p>

                <ul className="space-y-3">
                  {[
                    "O fim do intermediário obrigatório entre ideia e execução",
                    "Os 4 estágios do novo ciclo do negócio",
                    "A nova régua de liderança na era da IA",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm md:text-base text-foreground/90">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="flex items-center gap-3 pt-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Por Fernando Godoy, Leonardo Camacho e Magno Maciel
                </div>
              </motion.div>

              {/* Cover + Form */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
                className="relative"
              >
                <div className="relative rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 md:p-8 shadow-2xl shadow-primary/10">
                  {/* Mockup da capa */}
                  <div className="flex justify-center -mt-16 mb-6">
                    <img
                      src={assetSrc(cover)}
                      alt="Capa do ebook Executivo X.0 — Sem Barreiras"
                      width={300}
                      height={388}
                      className="w-40 md:w-48 rounded-lg shadow-2xl shadow-black/50 ring-1 ring-border rotate-[-3deg]"
                    />
                  </div>

                  {status === "success" ? (
                    <div className="text-center space-y-5 py-4">
                      <div className="mx-auto w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
                        <CheckCircle className="h-7 w-7 text-primary" />
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-xl font-heading font-semibold">Tudo certo, {name.split(" ")[0]}!</h2>
                        <p className="text-sm text-muted-foreground">
                          Seu download começou automaticamente. Se não iniciar, use o botão abaixo.
                        </p>
                      </div>
                      <Button onClick={startDownload} size="lg" className="w-full glow-cyan">
                        <Download className="mr-2 h-5 w-5" />
                        Baixar o ebook
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="text-center mb-5">
                        <h2 className="text-xl md:text-2xl font-heading font-semibold">
                          Receba o ebook gratuito
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          Preencha e baixe agora. Leva menos de 30 segundos.
                        </p>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium mb-1.5">
                            Nome <span className="text-primary">*</span>
                          </label>
                          <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Seu nome"
                            autoComplete="name"
                            className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                          />
                        </div>

                        <div>
                          <label htmlFor="email" className="block text-sm font-medium mb-1.5">
                            E-mail <span className="text-primary">*</span>
                          </label>
                          <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            autoComplete="email"
                            className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                          />
                        </div>

                        <div>
                          <label htmlFor="site" className="block text-sm font-medium mb-1.5">
                            Site da empresa{" "}
                            <span className="text-muted-foreground font-normal">(opcional)</span>
                          </label>
                          <input
                            id="site"
                            type="text"
                            value={site}
                            onChange={(e) => setSite(e.target.value)}
                            placeholder="suaempresa.com.br"
                            autoComplete="url"
                            className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                          />
                        </div>

                        {error && <p className="text-sm text-destructive">{error}</p>}

                        <Button
                          type="submit"
                          size="lg"
                          disabled={status === "loading"}
                          className="w-full glow-cyan"
                        >
                          {status === "loading" ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              Preparando...
                            </>
                          ) : (
                            <>
                              Quero o ebook gratuito
                              <ArrowRight className="ml-2 h-5 w-5" />
                            </>
                          )}
                        </Button>

                        <p className="text-center text-xs text-muted-foreground">
                          Seus dados estão seguros. Sem spam.
                        </p>
                      </form>
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* O que você vai descobrir */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <FadeInUp className="text-center mb-14 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
                O que você vai <span className="gradient-text">descobrir</span>
              </h2>
              <p className="text-muted-foreground">
                "A ideia vale mais que o código." A barreira entre quem pensa e quem constrói caiu — este playbook
                mostra o que fazer com isso.
              </p>
            </FadeInUp>

            <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {beneficios.map((b) => (
                <StaggerItem key={b.title}>
                  <motion.div
                    className="group h-full p-8 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300"
                    whileHover={{ y: -8, boxShadow: "0 20px 40px -15px hsl(177 70% 41% / 0.15)" }}
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
                      <b.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-heading font-semibold mb-3 group-hover:text-primary transition-colors">
                      {b.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{b.description}</p>
                  </motion.div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        {/* Os 4 estágios */}
        <section className="py-20 bg-card/50">
          <div className="container mx-auto px-4">
            <FadeInUp className="text-center mb-14 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
                O caminho mais curto entre a <span className="gradient-text">ideia e o negócio</span>
              </h2>
              <p className="text-muted-foreground">Os quatro estágios do novo ciclo, detalhados no ebook.</p>
            </FadeInUp>

            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {estagios.map((s) => (
                <StaggerItem key={s.n}>
                  <motion.div
                    className="h-full p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300"
                    whileHover={{ y: -6 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center">
                        <s.icon className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-sm font-heading text-muted-foreground/60">{s.n}</span>
                    </div>
                    <h3 className="text-base font-heading font-semibold mb-2">{s.title}</h3>
                    <p className="text-sm text-muted-foreground">{s.desc}</p>
                  </motion.div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        {/* Autores */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <FadeInUp className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-heading font-bold mb-3">
                Escrito por quem <span className="gradient-text">constrói com IA</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Três trajetórias, a mesma convicção sobre o futuro de quem lidera negócios.
              </p>
            </FadeInUp>

            <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {autores.map((a) => (
                <StaggerItem key={a.nome}>
                  <div className="h-full p-6 rounded-xl bg-card border border-border text-center">
                    <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                      <span className="font-heading font-semibold text-primary">{a.iniciais}</span>
                    </div>
                    <h3 className="text-base font-heading font-semibold">{a.nome}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{a.papel}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        {/* CTA final */}
        <section className="py-20 bg-card/50">
          <div className="container mx-auto px-4">
            <FadeInUp className="max-w-3xl mx-auto text-center space-y-6">
              <h2 className="text-3xl md:text-4xl font-heading font-bold">
                "A máquina monta o plano de negócio.{" "}
                <span className="gradient-text">Ela não pode ser responsável por ele."</span>
              </h2>
              <p className="text-muted-foreground">
                Baixe o Executivo X.0 e assuma a régua que a IA acabou de elevar.
              </p>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="lg"
                  className="glow-cyan"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                >
                  Baixar o ebook gratuito
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            </FadeInUp>
          </div>
        </section>
      </main>

      {/* Footer minimalista */}
      <footer className="border-t border-border/60 py-8">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src={assetSrc(logoAmplify)} alt="Amplify" className="h-6 w-auto opacity-80" />
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} Amplify · Inteligência Artificial Aplicada
          </p>
        </div>
      </footer>
    </div>
  );
};

export default EbookExecutivoX0;
