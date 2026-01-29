import { Target, Eye, Heart, Zap } from "lucide-react";
import Layout from "@/components/layout/Layout";

const Sobre = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 gradient-bg" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-6 animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold leading-tight">
              Alavancamos sua{" "}
              <span className="gradient-text">transformação digital</span> com IA
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Somos especialistas em conectar empresas ao futuro através da Inteligência Artificial
            </p>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
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
            </div>
            
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                <div className="text-center p-8">
                  <span className="text-6xl md:text-8xl font-heading font-bold gradient-text">
                    A+
                  </span>
                  <p className="mt-4 text-muted-foreground">
                    Excelência em IA
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              Nossos <span className="gradient-text">Valores</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Os princípios que guiam cada projeto e cada decisão
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
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
              <div
                key={index}
                className="text-center p-6 rounded-lg bg-card border border-border hover:border-primary/50 transition-all duration-300"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <value.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-heading font-semibold mb-3">
                  {value.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: "100+", label: "Projetos Entregues" },
              { number: "50+", label: "Clientes Satisfeitos" },
              { number: "15+", label: "Especialistas" },
              { number: "5+", label: "Anos de Experiência" },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-heading font-bold gradient-text mb-2">
                  {stat.number}
                </div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Sobre;
