import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Monitor, Users, Video, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrapper";

const Solucoes = () => {
  const modalidades = [
    {
      icon: Users,
      title: "Presencial",
      description: "Eventos e workshops realizados em sua empresa ou em espaços dedicados",
      features: ["Interação direta", "Networking", "Dinâmicas em grupo"],
    },
    {
      icon: Monitor,
      title: "Online",
      description: "Palestras e treinamentos ao vivo via plataformas digitais",
      features: ["Alcance global", "Flexibilidade", "Chat interativo"],
    },
    {
      icon: Video,
      title: "Híbrido",
      description: "Combinação do melhor dos dois mundos: presencial e online",
      features: ["Maior alcance", "Experiência completa", "Gravação disponível"],
    },
    {
      icon: PlayCircle,
      title: "Gravado",
      description: "Conteúdos pré-gravados para consumo sob demanda",
      features: ["Acesso 24/7", "Próprio ritmo", "Replay ilimitado"],
    },
  ];

  const solucoes = [
    {
      title: "Capacitação",
      description: "Treinamentos práticos para sua equipe dominar ferramentas de IA",
      link: "/solucoes/capacitacoes",
    },
    {
      title: "Serviços e Consultoria",
      description: "Assessoria especializada para implementar IA no seu negócio",
      link: "/solucoes/servicos-consultoria",
    },
    {
      title: "Comunidades",
      description: "Rede de profissionais e empresas conectados pela transformação com IA",
      link: "/solucoes/comunidades",
    },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 gradient-bg" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            className="max-w-4xl mx-auto text-center space-y-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold leading-tight">
              Aprender, aplicar e{" "}
              <span className="gradient-text">transformar</span> com IA
            </h1>
            <motion.p 
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              Soluções completas em educação e implementação de Inteligência Artificial
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Soluções Grid */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <FadeInUp className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              Nossas <span className="gradient-text">Soluções</span>
            </h2>
          </FadeInUp>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {solucoes.map((solucao, index) => (
              <StaggerItem key={index}>
                <Link to={solucao.link}>
                  <motion.div
                    className="group p-8 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 h-full"
                    whileHover={{ y: -8, boxShadow: "0 20px 40px -15px hsl(177 70% 41% / 0.15)" }}
                  >
                    <h3 className="text-2xl font-heading font-semibold mb-4 group-hover:text-primary transition-colors">
                      {solucao.title}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {solucao.description}
                    </p>
                    <div className="flex items-center text-primary font-medium">
                      Saiba mais
                      <motion.div
                        className="ml-2"
                        whileHover={{ x: 5 }}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </motion.div>
                    </div>
                  </motion.div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Modalidades */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <FadeInUp className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              <span className="gradient-text">Modalidades</span> de Atendimento
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Escolha o formato que melhor se adapta à sua realidade
            </p>
          </FadeInUp>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {modalidades.map((modalidade, index) => (
              <StaggerItem key={index}>
                <motion.div
                  className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 h-full"
                  whileHover={{ y: -5 }}
                >
                  <motion.div 
                    className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4"
                    whileHover={{ scale: 1.1, backgroundColor: "hsl(177 70% 41% / 0.2)" }}
                  >
                    <modalidade.icon className="h-6 w-6 text-primary" />
                  </motion.div>
                  <h3 className="text-xl font-heading font-semibold mb-2">
                    {modalidade.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {modalidade.description}
                  </p>
                  <ul className="space-y-2">
                    {modalidade.features.map((feature, i) => (
                      <motion.li 
                        key={i} 
                        className="flex items-center text-sm text-muted-foreground"
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                        {feature}
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
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
              Entre em contato e monte seu programa personalizado
            </p>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button size="lg" asChild className="glow-cyan">
                <a href="https://wa.me/5511918252109?text=Olá! Gostaria de solicitar uma proposta." target="_blank" rel="noopener noreferrer">
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

export default Solucoes;
