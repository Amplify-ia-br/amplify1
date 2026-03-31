import { motion } from "framer-motion";
import { Rocket, Code, Mic, Settings, Users, GraduationCap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrapper";

const levels = [
  {
    icon: Code,
    title: "Amplifier Jr.",
    description:
      "Jovens talentos com habilidades em programação e automação. Ideal para quem quer iniciar sua jornada no universo da IA aplicada aos negócios.",
  },
  {
    icon: Settings,
    title: "Amplifier Specialist",
    description:
      "Profissionais com experiência em automações, integrações e implementação de soluções de IA. Capacitados para conduzir workshops e bootcamps.",
  },
  {
    icon: Mic,
    title: "Amplifier Speaker",
    description:
      "Especialistas prontos para palestrar, facilitar treinamentos e capacitações presenciais ou online sobre transformação digital e IA.",
  },
  {
    icon: Users,
    title: "Amplifier Advisor",
    description:
      "Profissionais sêniores com visão estratégica para atuar como advisors de empresas, guiando a adoção de inteligência artificial no nível executivo.",
  },
];

const benefits = [
  "Acesso à metodologia exclusiva Amplify",
  "Certificação reconhecida pelo mercado",
  "Rede de contatos com líderes em IA",
  "Oportunidades de atuação em projetos reais",
  "Material didático e ferramentas de suporte",
  "Mentoria contínua com especialistas",
];

const Amplifiers = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background" />
        <div className="container mx-auto px-4 relative z-10 text-center py-20">
          <FadeInUp>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-8">
              <Rocket className="h-4 w-4 text-primary" />
              <span className="text-sm text-primary font-medium">Programa Amplifiers</span>
            </div>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-bold leading-tight mb-6">
              Torne-se um{" "}
              <span className="text-primary">Amplifier</span>
            </h1>
          </FadeInUp>
          <FadeInUp delay={0.2}>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 font-body">
              A Amplify está buscando pessoas apaixonadas por inteligência artificial que queiram
              aprender nossa metodologia e atuar em treinamentos, capacitações, workshops, bootcamps
              e palestras. Do iniciante ao advisor — há um lugar para você.
            </p>
          </FadeInUp>
          <FadeInUp delay={0.3}>
            <Button size="lg" className="glow-cyan" asChild>
              <a
                href="https://wa.me/5511918252109?text=Olá! Tenho interesse em me tornar um Amplifier."
                target="_blank"
                rel="noopener noreferrer"
              >
                Quero ser um Amplifier
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </FadeInUp>
        </div>
      </section>

      {/* Níveis */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <FadeInUp>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-4">
              Níveis de Amplifiers
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-16 font-body">
              Temos diferentes perfis — desde jovens programadores até profissionais sêniores
              que podem atuar como advisors estratégicos.
            </p>
          </FadeInUp>
          <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {levels.map((level) => (
              <StaggerItem key={level.title}>
                <div className="p-6 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors h-full flex flex-col">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <level.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-heading font-semibold mb-3">{level.title}</h3>
                  <p className="text-muted-foreground font-body text-sm leading-relaxed">
                    {level.description}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* O que você ganha */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <FadeInUp>
              <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6">
                O que você ganha sendo um Amplifier?
              </h2>
              <p className="text-muted-foreground font-body mb-8">
                Ao se tornar um Amplifier, você terá acesso à nossa metodologia, ferramentas
                e uma rede de profissionais que estão na vanguarda da inteligência artificial
                aplicada aos negócios.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <GraduationCap className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-foreground font-body">{benefit}</span>
                  </li>
                ))}
              </ul>
            </FadeInUp>
            <FadeInUp delay={0.2}>
              <div className="relative">
                <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                  <div className="text-center p-8">
                    <Rocket className="h-16 w-16 text-primary mx-auto mb-4" />
                    <p className="text-2xl font-heading font-bold text-primary">Amplifiers</p>
                    <p className="text-muted-foreground font-body mt-2">
                      Faça parte da revolução da IA
                    </p>
                  </div>
                </div>
              </div>
            </FadeInUp>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <FadeInUp>
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6">
              Pronto para amplificar seu impacto?
            </h2>
            <p className="text-muted-foreground font-body max-w-2xl mx-auto mb-10">
              Entre em contato com nosso agente e descubra como você pode se tornar um Amplifier.
              Independente do seu nível de experiência, temos um caminho para você.
            </p>
            <Button size="lg" className="glow-cyan" asChild>
              <a
                href="https://wa.me/5511918252109?text=Olá! Tenho interesse em me tornar um Amplifier."
                target="_blank"
                rel="noopener noreferrer"
              >
                Fale com nosso agente
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </FadeInUp>
        </div>
      </section>
    </Layout>
  );
};

export default Amplifiers;
