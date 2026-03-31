import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  Users,
  Target,
  Brain,
  ArrowRight,
  CalendarDays,
  Sparkles,
  Monitor,
  MapPin,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrapper";

const audiences = [
  {
    icon: Target,
    title: "CEOs & Alta Liderança",
    description:
      "Visão estratégica de como a IA pode transformar modelos de negócio, gerar vantagem competitiva e impulsionar crescimento sustentável.",
  },
  {
    icon: Users,
    title: "Gerentes & Gestores",
    description:
      "Aplicações práticas de IA para otimizar processos, liderar equipes com dados e tomar decisões mais inteligentes no dia a dia.",
  },
  {
    icon: Brain,
    title: "Colaboradores & Times",
    description:
      "Ferramentas e técnicas de IA que aumentam a produtividade individual e coletiva, acessíveis para todos os níveis técnicos.",
  },
  {
    icon: GraduationCap,
    title: "Líderes em Formação",
    description:
      "Trilhas de desenvolvimento para profissionais que desejam se preparar para o futuro da liderança com inteligência artificial.",
  },
];

const trackTypes = [
  {
    icon: Monitor,
    title: "Cursos Online",
    description: "Aprenda no seu ritmo com conteúdos gravados e mentorias ao vivo.",
    status: "Em breve",
  },
  {
    icon: MapPin,
    title: "Treinamentos Presenciais",
    description: "Imersões práticas com workshops hands-on e networking.",
    status: "Em breve",
  },
  {
    icon: Sparkles,
    title: "Bootcamps Intensivos",
    description: "Programas acelerados para resultados rápidos e aplicáveis.",
    status: "Em breve",
  },
  {
    icon: Clock,
    title: "Conteúdo Estratégico",
    description: "Frameworks, playbooks e cases para decisões de alto impacto.",
    status: "Em breve",
  },
];

const Aprenda = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background" />
        <div className="container mx-auto px-4 relative z-10 text-center py-20">
          <FadeInUp>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-8">
              <GraduationCap className="h-4 w-4 text-primary" />
              <span className="text-sm text-primary font-medium">Aprenda com a Amplify</span>
            </div>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-bold leading-tight mb-6">
              Trilhas de Conhecimento em{" "}
              <span className="text-primary">Inteligência Artificial</span>
            </h1>
          </FadeInUp>
          <FadeInUp delay={0.2}>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 font-body">
              Estamos desenvolvendo uma série de treinamentos e capacitações focados na aplicação
              prática de IA — do estratégico ao operacional — para todos os níveis de liderança
              da sua organização.
            </p>
          </FadeInUp>
          <FadeInUp delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="glow-cyan" asChild>
                <a
                  href="https://wa.me/5511918252109?text=Olá! Tenho interesse nos treinamentos do Aprenda."
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Quero saber mais
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/agenda">
                  <CalendarDays className="mr-2 h-5 w-5" />
                  Ver agenda de eventos
                </Link>
              </Button>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* Para quem é */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <FadeInUp>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-4">
              Para todos os níveis da organização
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-16 font-body">
              Cada trilha é desenhada para o contexto e os desafios específicos de cada perfil
              de liderança e colaboração.
            </p>
          </FadeInUp>
          <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {audiences.map((item) => (
              <StaggerItem key={item.title}>
                <div className="p-6 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors h-full flex flex-col">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-heading font-semibold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground font-body text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Formatos */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <FadeInUp>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-4">
              Formatos de aprendizado
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-16 font-body">
              Em breve, uma série de cursos online e presenciais para transformar a forma como
              sua empresa aplica inteligência artificial.
            </p>
          </FadeInUp>
          <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {trackTypes.map((track) => (
              <StaggerItem key={track.title}>
                <div className="relative p-6 rounded-xl border border-border bg-card h-full flex flex-col">
                  <span className="absolute top-4 right-4 text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                    {track.status}
                  </span>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <track.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-heading font-semibold mb-3">{track.title}</h3>
                  <p className="text-muted-foreground font-body text-sm leading-relaxed">
                    {track.description}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Conteúdo Estratégico */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <FadeInUp>
              <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6">
                Conteúdo estratégico para decisões de alto impacto
              </h2>
              <p className="text-muted-foreground font-body mb-6">
                Além dos treinamentos práticos, desenvolvemos conteúdos estratégicos para líderes
                que precisam entender o panorama da IA e tomar decisões fundamentadas sobre
                investimentos, tecnologia e transformação organizacional.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  "Frameworks de adoção de IA para empresas",
                  "Playbooks de implementação por setor",
                  "Análises de tendências e oportunidades",
                  "Cases reais de transformação digital",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-foreground font-body">{item}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" asChild>
                <a
                  href="https://wa.me/5511918252109?text=Olá! Gostaria de saber mais sobre os conteúdos estratégicos."
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Fale com um especialista
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </FadeInUp>
            <FadeInUp delay={0.2}>
              <div className="relative">
                <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                  <div className="text-center p-8">
                    <Brain className="h-16 w-16 text-primary mx-auto mb-4" />
                    <p className="text-2xl font-heading font-bold text-primary">Aprenda</p>
                    <p className="text-muted-foreground font-body mt-2">
                      Conhecimento que transforma negócios
                    </p>
                  </div>
                </div>
              </div>
            </FadeInUp>
          </div>
        </div>
      </section>

      {/* CTA Agenda */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4 text-center">
          <FadeInUp>
            <CalendarDays className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6">
              Confira nossa agenda de eventos
            </h2>
            <p className="text-muted-foreground font-body max-w-2xl mx-auto mb-10">
              Enquanto preparamos nossas trilhas de cursos, participe dos eventos, palestras e
              workshops que a Amplify está realizando por todo o Brasil.
            </p>
            <Button size="lg" className="glow-cyan" asChild>
              <Link to="/agenda">
                Ver todos os eventos
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </FadeInUp>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <FadeInUp>
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6">
              Quer ser avisado quando os cursos estiverem disponíveis?
            </h2>
            <p className="text-muted-foreground font-body max-w-2xl mx-auto mb-10">
              Fale com nosso time e garanta prioridade de acesso às primeiras turmas.
            </p>
            <Button size="lg" className="glow-cyan" asChild>
              <a
                href="https://wa.me/5511918252109?text=Olá! Quero ser avisado quando os cursos do Aprenda estiverem disponíveis."
                target="_blank"
                rel="noopener noreferrer"
              >
                Garantir minha vaga
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </FadeInUp>
        </div>
      </section>
    </Layout>
  );
};

export default Aprenda;
