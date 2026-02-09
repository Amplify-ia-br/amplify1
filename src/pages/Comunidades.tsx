import { motion } from "framer-motion";
import { ArrowRight, Users, MessageSquare, Calendar, Sparkles, Globe, TrendingUp, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrapper";
import faculdadeHub from "@/assets/faculdade-hub.png";

const beneficios = [
  {
    icon: Users,
    title: "Networking Qualificado",
    description: "Conecte-se com profissionais e empresas que estão na vanguarda da adoção de IA no Brasil.",
  },
  {
    icon: MessageSquare,
    title: "Troca de Experiências",
    description: "Compartilhe desafios e soluções com uma comunidade ativa de líderes e especialistas.",
  },
  {
    icon: Calendar,
    title: "Eventos Exclusivos",
    description: "Acesso a encontros, workshops e meetups exclusivos para membros da comunidade.",
  },
  {
    icon: Sparkles,
    title: "Conteúdo Premium",
    description: "Materiais, cases e insights atualizados sobre as últimas tendências em IA.",
  },
];

const comunidades = [
  {
    icon: Globe,
    title: "Fórum de Negócios e IA",
    description: "Comunidade voltada para líderes empresariais que buscam aplicar IA de forma estratégica em seus negócios.",
    features: ["Encontros mensais", "Painéis com especialistas", "Cases reais de mercado"],
  },
  {
    icon: TrendingUp,
    title: "Hub de Inovação",
    description: "Espaço colaborativo para profissionais que querem se manter atualizados e trocar experiências sobre IA.",
    features: ["Workshops práticos", "Grupos de discussão", "Acesso a ferramentas"],
  },
];

const Comunidades = () => {
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
              Comunidades
            </h1>
            <motion.p
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              Faça parte de uma rede de profissionais e empresas que estão transformando seus negócios com Inteligência Artificial
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
              src={faculdadeHub}
              alt="Comunidades Amplify - Networking e eventos sobre IA"
              className="w-full h-auto object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
          </motion.div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <FadeInUp className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              Por que participar das nossas <span className="gradient-text">Comunidades</span>?
            </h2>
          </FadeInUp>

          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {beneficios.map((beneficio, index) => (
              <StaggerItem key={index}>
                <motion.div
                  className="group p-8 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 h-full flex flex-col items-center text-center"
                  whileHover={{ y: -8, boxShadow: "0 20px 40px -15px hsl(177 70% 41% / 0.15)" }}
                >
                  <motion.div
                    className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-5"
                    whileHover={{ scale: 1.1 }}
                  >
                    <beneficio.icon className="h-7 w-7 text-primary" />
                  </motion.div>
                  <h3 className="text-lg font-heading font-semibold mb-3 group-hover:text-primary transition-colors">
                    {beneficio.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {beneficio.description}
                  </p>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Comunidades */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <FadeInUp className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              Nossas <span className="gradient-text">Comunidades</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Escolha a comunidade que mais se encaixa no seu perfil
            </p>
          </FadeInUp>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {comunidades.map((comunidade, index) => (
              <StaggerItem key={index}>
                <motion.div
                  className="group p-8 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 h-full flex flex-col"
                  whileHover={{ y: -8, boxShadow: "0 20px 40px -15px hsl(177 70% 41% / 0.15)" }}
                >
                  <motion.div
                    className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5"
                    whileHover={{ scale: 1.1 }}
                  >
                    <comunidade.icon className="h-6 w-6 text-primary" />
                  </motion.div>
                  <h3 className="text-xl font-heading font-semibold mb-3 group-hover:text-primary transition-colors">
                    {comunidade.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-5">
                    {comunidade.description}
                  </p>
                  <ul className="space-y-2 mt-auto">
                    {comunidade.features.map((feature, i) => (
                      <li key={i} className="flex items-center text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-primary mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
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
              Quer fazer parte da nossa <span className="gradient-text">comunidade</span>?
            </h2>
            <p className="text-muted-foreground">
              Entre em contato e saiba como participar
            </p>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button size="lg" asChild className="glow-cyan">
                <a
                  href="https://wa.me/5511918252109?text=Olá! Gostaria de saber mais sobre as comunidades Amplify."
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Quero Participar
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

export default Comunidades;
