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
                  href="https://web.whatsapp.com/send?phone=5511918252109&text=Olá! Gostaria de falar com um especialista."
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
                  href="https://web.whatsapp.com/send?phone=5511918252109&text=Olá! Gostaria de falar com um especialista."
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
