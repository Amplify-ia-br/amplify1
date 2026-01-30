import { motion } from "framer-motion";
import { Target, Eye, Heart, Zap } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { FadeInUp, SlideInLeft, SlideInRight, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrapper";

const Sobre = () => {
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
              Alavancamos sua{" "}
              <span className="gradient-text">transformação digital</span> com IA
            </h1>
            <motion.p 
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              Somos especialistas em conectar empresas ao futuro através da Inteligência Artificial
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <SlideInLeft className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-heading font-bold">
                Nossa <span className="gradient-text">História</span>
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  A Amplify nasceu da visão de democratizar o acesso à Inteligência Artificial 
                  para empresas de todos os portes. Acreditamos que a tecnologia deve ser uma 
                  ferramenta de transformação, não uma barreira.
                </p>
                <p>
                  Desde nossa fundação, temos ajudado centenas de empresas a descobrir o 
                  potencial inexplorado de seus dados, transformando informações brutas em 
                  decisões estratégicas que impulsionam resultados.
                </p>
                <p>
                  Nossa equipe é formada por especialistas apaixonados por tecnologia e 
                  negócios, unidos pelo propósito de criar impacto real através da inovação.
                </p>
              </div>
            </SlideInLeft>
            
            <SlideInRight className="relative">
              <motion.div 
                className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center p-8">
                  <motion.span 
                    className="text-6xl md:text-8xl font-heading font-bold gradient-text"
                    animate={{ 
                      textShadow: [
                        "0 0 20px hsl(177 70% 41% / 0.3)",
                        "0 0 40px hsl(177 70% 41% / 0.5)",
                        "0 0 20px hsl(177 70% 41% / 0.3)"
                      ]
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    A+
                  </motion.span>
                  <p className="mt-4 text-muted-foreground">
                    Excelência em IA
                  </p>
                </div>
              </motion.div>
            </SlideInRight>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <FadeInUp className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              Nossos <span className="gradient-text">Valores</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Os princípios que guiam cada projeto e cada decisão
            </p>
          </FadeInUp>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Target,
                title: "Missão",
                description: "Democratizar a IA e torná-la acessível para empresas de todos os tamanhos",
              },
              {
                icon: Eye,
                title: "Visão",
                description: "Ser referência em transformação digital orientada por dados no Brasil",
              },
              {
                icon: Heart,
                title: "Propósito",
                description: "Criar impacto real e mensurável nos negócios dos nossos clientes",
              },
              {
                icon: Zap,
                title: "Inovação",
                description: "Buscar constantemente as melhores e mais recentes tecnologias",
              },
            ].map((value, index) => (
              <StaggerItem key={index}>
                <motion.div
                  className="text-center p-6 rounded-lg bg-card border border-border hover:border-primary/50 transition-all duration-300 h-full"
                  whileHover={{ y: -5, boxShadow: "0 10px 40px -10px hsl(177 70% 41% / 0.2)" }}
                >
                  <motion.div 
                    className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"
                    whileHover={{ scale: 1.1, backgroundColor: "hsl(177 70% 41% / 0.2)" }}
                  >
                    <value.icon className="h-8 w-8 text-primary" />
                  </motion.div>
                  <h3 className="text-xl font-heading font-semibold mb-3">
                    {value.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {value.description}
                  </p>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: "100+", label: "Projetos Entregues" },
              { number: "50+", label: "Clientes Satisfeitos" },
              { number: "15+", label: "Especialistas" },
              { number: "5+", label: "Anos de Experiência" },
            ].map((stat, index) => (
              <StaggerItem key={index} className="text-center">
                <motion.div 
                  className="text-4xl md:text-5xl font-heading font-bold gradient-text mb-2"
                  whileHover={{ scale: 1.1 }}
                >
                  {stat.number}
                </motion.div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>
    </Layout>
  );
};

export default Sobre;
