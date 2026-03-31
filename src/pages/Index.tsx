import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Brain, Users, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrapper";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

// Logo imports
import logoGrupoPrimo from "@/assets/logos/logo-grupo-primo.png";
import logoAmcham from "@/assets/logos/logo-amcham.png";
import logoBossaInvest from "@/assets/logos/logo-bossa-invest.png";
import logoDwx from "@/assets/logos/logo-dwx.png";
import logoGouvea from "@/assets/logos/logo-gouvea.png";
import logoTecfil from "@/assets/logos/logo-tecfil.png";
import logoUfg from "@/assets/logos/logo-ufg.png";
import logoCreaPr from "@/assets/logos/logo-crea-pr.png";
import logoKatsuki from "@/assets/logos/logo-katsuki.png";
import logoToccato from "@/assets/logos/logo-toccato.png";
import forumPalestra from "@/assets/forum-palestra.png";
import faculdadeHub from "@/assets/faculdade-hub.png";
import depoimentoGuilherme from "@/assets/depoimento-guilherme.png";

// Case studies imports
import caseFordBrasil from "@/assets/cases/case-ford-brasil.png";
import caseForumNegocios from "@/assets/cases/case-forum-negocios.png";
import caseGrupoErea from "@/assets/cases/case-grupo-erea.png";
import caseFpf from "@/assets/cases/case-fpf.png";

const successCases = [
  { name: "Ford Brasil", image: caseFordBrasil },
  { name: "Fórum Negócios", image: caseForumNegocios },
  { name: "Grupo EREA", image: caseGrupoErea },
  { name: "FPF", image: caseFpf },
];

const trustedCompanies = [
  { name: "Grupo Primo", logo: logoGrupoPrimo },
  { name: "Amcham", logo: logoAmcham },
  { name: "Bossa Invest", logo: logoBossaInvest },
  { name: "DWX", logo: logoDwx },
  { name: "Gouvêa", logo: logoGouvea },
  { name: "Tecfil", logo: logoTecfil },
  { name: "UFG", logo: logoUfg },
  { name: "CREA-PR", logo: logoCreaPr },
  { name: "Katsuki", logo: logoKatsuki },
  { name: "Toccato", logo: logoToccato },
];

const Index = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 gradient-bg" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />

        {/* Decorative elements */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <motion.h1
              className="text-4xl md:text-6xl lg:text-7xl font-heading font-bold leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              Transforme <span className="gradient-text">dados</span> em{" "}
              <span className="gradient-text">inteligência</span>
            </motion.h1>

            <motion.p
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            >
              Vamos transformar sua empresa conosco através do poder da Inteligência Artificial
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            >
              <Button size="lg" asChild className="glow-cyan text-lg px-8 py-6">
                <a
                  href="https://wa.me/5511918252109?text=Olá! Gostaria de falar com um especialista."
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Fale com o Especialista
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="text-lg px-8 py-6 border-primary/50 hover:bg-primary/10"
              >
                <Link to="/cases">Ver Cases</Link>
              </Button>
            </motion.div>
          </div>

          {/* Trusted Companies */}
          <motion.div
            className="mt-16 space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
          >
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-heading font-bold leading-tight text-center">
              Empresas que confiam
            </h2>
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              plugins={[
                Autoplay({
                  delay: 2000,
                  stopOnInteraction: false,
                }),
              ]}
              className="w-full max-w-4xl mx-auto"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {trustedCompanies.map((company, index) => (
                  <CarouselItem key={index} className="pl-2 md:pl-4 basis-1/3 md:basis-1/4 lg:basis-1/5">
                    <div className="flex items-center justify-center h-16 px-4">
                      <img
                        src={company.logo}
                        alt={company.name}
                        className="h-8 md:h-10 w-auto object-contain opacity-70 hover:opacity-100 transition-opacity"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </motion.div>
        </div>
      </section>

      {/* About Amplify Section */}
      <section className="py-24 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <FadeInUp>
              <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6 leading-tight">
                O Poder da Inteligência Artificial como Alavanca de <span className="gradient-text">Transformação</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Amplify é uma empresa de educação corporativa e consultoria em Inteligência Artificial que conecta estratégia, inovação e aprendizado aplicado.
              </p>

              <div className="grid grid-cols-2 gap-6">
                <motion.div
                  className="p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <h3 className="text-4xl md:text-5xl font-heading font-bold gradient-text mb-2">130k+</h3>
                  <p className="text-muted-foreground font-medium">Alunos Capacitados</p>
                </motion.div>
                <motion.div
                  className="p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <h3 className="text-4xl md:text-5xl font-heading font-bold gradient-text mb-2">1k+</h3>
                  <p className="text-muted-foreground font-medium">Treinamentos Realizados</p>
                </motion.div>
              </div>
            </FadeInUp>

            <FadeInUp delay={0.3} className="flex justify-center lg:justify-end">
              <img
                src={faculdadeHub}
                alt="Treinamento presencial de IA"
                className="rounded-2xl shadow-2xl max-w-full h-auto object-cover"
              />
            </FadeInUp>
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section className="py-24 bg-card/50">
        <div className="container mx-auto px-4">
          <FadeInUp className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              O que <span className="gradient-text">oferecemos</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Soluções personalizadas em Inteligência Artificial para transformar seu negócio
            </p>
          </FadeInUp>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <StaggerContainer className="grid grid-cols-1 gap-6">
              {[
                {
                  icon: Users,
                  title: "Capacitação",
                  description: "Treinamentos práticos e imersivos para sua equipe dominar IA e aplicar no dia a dia corporativo.",
                },
                {
                  icon: Brain,
                  title: "Consultoria e Serviços",
                  description: "Análise estratégica e implementação de soluções de IA personalizadas para acelerar resultados.",
                },
                {
                  icon: Lightbulb,
                  title: "Comunidades",
                  description: "Networking exclusivo com profissionais e líderes que estão transformando seus negócios com IA.",
                },
              ].map((service, index) => (
                <StaggerItem key={index}>
                  <motion.div
                    className="group p-6 rounded-lg bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
                    whileHover={{ y: -5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                        <service.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-heading font-semibold mb-2">{service.title}</h3>
                        <p className="text-sm text-muted-foreground">{service.description}</p>
                      </div>
                    </div>
                  </motion.div>
                </StaggerItem>
              ))}
            </StaggerContainer>

            <FadeInUp delay={0.3} className="flex justify-center lg:justify-end">
              <img
                src={forumPalestra}
                alt="Palestra sobre Inteligência Artificial"
                className="rounded-2xl shadow-2xl max-w-full h-auto object-cover"
              />
            </FadeInUp>
          </div>
        </div>
      </section>

      {/* Success Cases Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <FadeInUp className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              Alguns dos nossos <span className="gradient-text">cases de sucesso</span>
            </h2>
          </FadeInUp>

          <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {successCases.map((caseItem, index) => (
              <StaggerItem key={index}>
                <motion.div
                  className="group relative rounded-2xl overflow-hidden aspect-square"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                >
                  <img
                    src={caseItem.image}
                    alt={caseItem.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-lg md:text-xl font-heading font-bold text-white">
                      {caseItem.name}
                    </h3>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-card/30">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              <span className="gradient-text">Depoimentos</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            >
              <img
                src={depoimentoGuilherme}
                alt="Guilherme Quandt"
                className="rounded-2xl shadow-2xl max-w-full h-auto object-cover w-80"
                loading="lazy"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
            >
              <blockquote className="relative">
                <div className="text-6xl text-primary/20 absolute -top-4 -left-4">"</div>
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed pl-8">
                  Como ecossistema tecnológico, líder da construção brasileira, a Inteligência Artificial tem sido um dos temas centrais dos nossos debates. Por isso, teremos a Amplify no ConstruSummit para aprofundar a discussão sobre o impacto da IA no futuro do setor.
                </p>
                <footer className="mt-6 pl-8">
                  <p className="font-heading font-semibold text-foreground">Guilherme Quandt</p>
                  <p className="text-sm text-muted-foreground">Diretor de Marketing do Ecossistema Sienge</p>
                </footer>
              </blockquote>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10" />

        <div className="container mx-auto px-4 relative z-10">
          <FadeInUp className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-heading font-bold">
              Pronto para <span className="gradient-text">transformar</span> sua empresa?
            </h2>
            <p className="text-muted-foreground">Entre em contato e descubra como a IA pode revolucionar seu negócio</p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="lg" asChild className="glow-cyan">
                <a
                  href="https://wa.me/5511918252109?text=Olá! Gostaria de falar com um especialista."
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Fale com o Especialista
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

export default Index;
