import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Lightbulb, BarChart3, Cog, FileText, Monitor, Users, Video, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrapper";
import heroImage from "@/assets/consultoria-servicos-hero.jpg";

const servicos = [
  {
    icon: Lightbulb,
    title: "Diagnóstico de IA",
    description: "Mapeamos os processos da sua empresa e identificamos onde a IA pode gerar mais impacto e eficiência.",
  },
  {
    icon: BarChart3,
    title: "Estratégia e Roadmap",
    description: "Criamos um plano estratégico personalizado para a adoção de IA alinhado aos objetivos do seu negócio.",
  },
  {
    icon: Cog,
    title: "Implementação de Soluções",
    description: "Desenvolvemos e integramos soluções de IA sob medida para automatizar e otimizar suas operações.",
  },
  {
    icon: FileText,
    title: "Gestão e Acompanhamento",
    description: "Monitoramos resultados e ajustamos as soluções para garantir máximo retorno sobre o investimento.",
  },
];

const formatos = [
  {
    icon: Users,
    title: "Presencial",
    description: "Reuniões e workshops realizados na sua empresa para imersão total no contexto do negócio.",
  },
  {
    icon: Monitor,
    title: "Online",
    description: "Sessões remotas com a mesma qualidade e profundidade, com flexibilidade de agenda.",
  },
  {
    icon: Video,
    title: "Híbrido",
    description: "Combinação do presencial e online para atender equipes distribuídas.",
  },
  {
    icon: PlayCircle,
    title: "Sob Demanda",
    description: "Consultoria pontual para resolver desafios específicos no seu ritmo.",
  },
];

const ServicosConsultoria = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 gradient-bg" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            className="max-w-4xl mx-auto text-center space-y-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-heading font-bold leading-tight">
              Consultoria e Serviços
            </h1>
            <motion.p
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              Assessoria especializada para transformar sua empresa com Inteligência Artificial
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Hero Image */}
      <section className="relative -mt-8 pb-16">
        <div className="container mx-auto px-4">
          <motion.div
            className="relative rounded-2xl overflow-hidden shadow-2xl max-w-5xl mx-auto"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <img
              src={heroImage}
              alt="Consultoria Amplify - Reunião estratégica sobre IA"
              className="w-full h-auto object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
          </motion.div>
        </div>
      </section>

      {/* Serviços */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <FadeInUp className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              Nossos <span className="gradient-text">Serviços</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Soluções completas para cada etapa da jornada de transformação com IA
            </p>
          </FadeInUp>

          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {servicos.map((servico, index) => (
              <StaggerItem key={index}>
                <motion.div
                  className="group p-8 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 h-full flex flex-col items-center text-center"
                  whileHover={{ y: -8, boxShadow: "0 20px 40px -15px hsl(177 70% 41% / 0.15)" }}
                >
                  <motion.div
                    className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-5"
                    whileHover={{ scale: 1.1 }}
                  >
                    <servico.icon className="h-7 w-7 text-primary" />
                  </motion.div>
                  <h3 className="text-lg font-heading font-semibold mb-3 group-hover:text-primary transition-colors">
                    {servico.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {servico.description}
                  </p>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Formatos */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <FadeInUp className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              <span className="gradient-text">Formato</span> de Atendimento
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Escolha o modelo que melhor se adapta à sua realidade
            </p>
          </FadeInUp>

          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {formatos.map((formato, index) => (
              <StaggerItem key={index}>
                <motion.div
                  className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 h-full text-center"
                  whileHover={{ y: -5 }}
                >
                  <motion.div
                    className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-4 mx-auto"
                    whileHover={{ scale: 1.1 }}
                  >
                    <formato.icon className="h-7 w-7 text-primary" />
                  </motion.div>
                  <h3 className="text-lg font-heading font-semibold mb-2">
                    {formato.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {formato.description}
                  </p>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <FadeInUp className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-heading font-bold">
              Pronto para <span className="gradient-text">transformar</span> seu negócio?
            </h2>
            <p className="text-muted-foreground">
              Entre em contato e descubra como a IA pode acelerar seus resultados
            </p>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button size="lg" asChild className="glow-cyan">
                <a
                  href="https://web.whatsapp.com/send?phone=5511918252109&text=Olá! Gostaria de saber mais sobre os serviços de consultoria em IA."
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Solicitar Proposta
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
            </motion.div>
          </FadeInUp>
        </div>
      </section>
    </Layout>
  );
};

export default ServicosConsultoria;
