import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Monitor, Users, Video, PlayCircle, BookOpen, Target, Zap, CheckCircle, Mic, Wrench, Rocket, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrapper";
import treinamentoPresencial from "@/assets/treinamento-presencial.png";
import forumPalestra from "@/assets/forum-palestra.png";
import caseForumNegocios from "@/assets/cases/case-forum-negocios-capacitacao.png";
import caseAssai from "@/assets/cases/case-assai.png";

const formatos = [
  {
    icon: Users,
    title: "Presencial",
    description: "Workshops e treinamentos realizados in-company ou em espaços dedicados, com dinâmicas práticas e interação direta.",
  },
  {
    icon: Monitor,
    title: "Online",
    description: "Capacitações ao vivo via plataformas digitais, com exercícios práticos e suporte em tempo real.",
  },
  {
    icon: Video,
    title: "Híbrido",
    description: "Combinação do presencial e online para alcançar equipes distribuídas com a mesma qualidade.",
  },
  {
    icon: PlayCircle,
    title: "Gravado",
    description: "Conteúdos sob demanda para sua equipe consumir no próprio ritmo, com acesso ilimitado.",
  },
];

const trilhas = [
  {
    icon: Zap,
    title: "IA Generativa na Prática",
    description: "ChatGPT, Gemini, Copilot e outras ferramentas aplicadas ao dia a dia corporativo.",
    topics: ["Prompt Engineering", "Automação de tarefas", "Criação de conteúdo com IA"],
  },
  {
    icon: Target,
    title: "IA para Lideranças",
    description: "Como líderes podem usar IA para tomar decisões melhores e acelerar resultados.",
    topics: ["Visão estratégica de IA", "Gestão de equipes com IA", "Cases de mercado"],
  },
  {
    icon: BookOpen,
    title: "IA para Times Operacionais",
    description: "Treinamento hands-on para equipes que precisam aplicar IA no operacional.",
    topics: ["Ferramentas práticas", "Automações no-code", "Integração com processos"],
  },
];

const Capacitacoes = () => {
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
              Capacitação
            </h1>
            <motion.p
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              Treinamentos práticos para sua equipe dominar as ferramentas de Inteligência Artificial e transformar resultados
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Event Photo Section */}
      <section className="relative -mt-8 pb-16">
        <div className="container mx-auto px-4">
          <motion.div
            className="relative rounded-2xl overflow-hidden shadow-2xl max-w-5xl mx-auto"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <img
              src={forumPalestra}
              alt="Capacitação Amplify - Palestra sobre IA"
              className="w-full h-auto object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
          </motion.div>
        </div>
      </section>

      {/* Produtos */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <FadeInUp className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              Nossos <span className="gradient-text">Produtos</span>
            </h2>
          </FadeInUp>

          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { icon: Mic, title: "Palestras Educacionais", description: "Apresentações inspiradoras sobre IA e inovação para engajar e conscientizar sua equipe." },
              { icon: Wrench, title: "Workshops Práticos", description: "Sessões mão na massa com ferramentas de IA aplicadas a desafios reais do seu negócio." },
              { icon: Rocket, title: "Bootcamps Intensivos", description: "Programas imersivos de curta duração para acelerar a adoção de IA na organização." },
              { icon: Building, title: "Treinamentos In Company", description: "Capacitações personalizadas realizadas dentro da sua empresa, adaptadas à sua realidade." },
            ].map((produto, index) => (
              <StaggerItem key={index}>
                <motion.div
                  className="group p-8 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 h-full flex flex-col items-center text-center"
                  whileHover={{ y: -8, boxShadow: "0 20px 40px -15px hsl(177 70% 41% / 0.15)" }}
                >
                  <motion.div
                    className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-5"
                    whileHover={{ scale: 1.1 }}
                  >
                    <produto.icon className="h-7 w-7 text-primary" />
                  </motion.div>
                  <h3 className="text-lg font-heading font-semibold mb-3 group-hover:text-primary transition-colors">
                    {produto.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {produto.description}
                  </p>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Trilhas de Capacitação */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <FadeInUp className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              Trilhas de <span className="gradient-text">Capacitação</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Programas estruturados para diferentes perfis e necessidades da sua organização
            </p>
          </FadeInUp>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {trilhas.map((trilha, index) => (
              <StaggerItem key={index}>
                <motion.div
                  className="group p-8 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 h-full flex flex-col"
                  whileHover={{ y: -8, boxShadow: "0 20px 40px -15px hsl(177 70% 41% / 0.15)" }}
                >
                  <motion.div
                    className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5"
                    whileHover={{ scale: 1.1 }}
                  >
                    <trilha.icon className="h-6 w-6 text-primary" />
                  </motion.div>
                  <h3 className="text-xl font-heading font-semibold mb-3 group-hover:text-primary transition-colors">
                    {trilha.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-5">
                    {trilha.description}
                  </p>
                  <ul className="space-y-2 mt-auto">
                    {trilha.topics.map((topic, i) => (
                      <li key={i} className="flex items-center text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-primary mr-2 flex-shrink-0" />
                        {topic}
                      </li>
                    ))}
                  </ul>
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
              <span className="gradient-text">Formato</span> de Entrega
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Escolha o modelo que melhor se adapta à realidade da sua equipe
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

      {/* Cases dos Clientes */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <FadeInUp className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              Alguns Cases dos <span className="gradient-text">Nossos Clientes</span>
            </h2>
          </FadeInUp>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              { img: caseForumNegocios, title: "Fórum Negócios" },
              { img: caseAssai, title: "Assaí Atacadista" },
            ].map((item, index) => (
              <StaggerItem key={index}>
                <motion.div
                  className="group relative rounded-2xl overflow-hidden border border-border hover:border-primary/50 transition-all duration-300"
                  whileHover={{ y: -8, boxShadow: "0 20px 40px -15px hsl(177 70% 41% / 0.15)" }}
                >
                  <img
                    src={item.img}
                    alt={item.title}
                    className="w-full h-64 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-lg font-heading font-semibold text-foreground">
                      {item.title}
                    </h3>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Diferencial */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
            <FadeInUp>
              <img
                src={treinamentoPresencial}
                alt="Treinamento presencial Amplify"
                className="rounded-2xl shadow-2xl w-full h-auto object-cover"
              />
            </FadeInUp>
            <FadeInUp delay={0.2}>
              <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6">
                Por que escolher a <span className="gradient-text">Amplify</span>?
              </h2>
              <ul className="space-y-4">
                {[
                  "Conteúdo 100% prático e atualizado com as últimas novidades de IA",
                  "Instrutores com experiência real em projetos de transformação digital",
                  "Material personalizado para o contexto da sua empresa",
                  "Suporte pós-treinamento para garantir a aplicação do conhecimento",
                  "Métricas de impacto e relatório de evolução da equipe",
                ].map((item, i) => (
                  <motion.li
                    key={i}
                    className="flex items-start text-muted-foreground"
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <CheckCircle className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                    {item}
                  </motion.li>
                ))}
              </ul>
            </FadeInUp>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <FadeInUp className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-heading font-bold">
              Pronto para <span className="gradient-text">capacitar</span> sua equipe?
            </h2>
            <p className="text-muted-foreground">
              Monte um programa personalizado de capacitação em IA para sua empresa
            </p>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button size="lg" asChild className="glow-cyan">
                <a
                  href="https://web.whatsapp.com/send?phone=5511918252109&text=Olá! Gostaria de saber mais sobre as capacitações em IA."
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

export default Capacitacoes;
