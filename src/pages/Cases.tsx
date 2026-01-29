import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";

const Cases = () => {
  const cases = [
    {
      id: 1,
      client: "Ford",
      title: "Otimização de Produção com IA",
      description: "Implementação de sistema de previsão de demanda que reduziu custos operacionais em 25%",
      image: "/placeholder.svg",
      tags: ["Machine Learning", "Previsão", "Indústria"],
    },
    {
      id: 2,
      client: "Globo Business",
      title: "Análise de Audiência Inteligente",
      description: "Plataforma de análise preditiva de audiência usando deep learning",
      image: "/placeholder.svg",
      tags: ["Deep Learning", "Analytics", "Mídia"],
    },
    {
      id: 3,
      client: "Banco Digital",
      title: "Detecção de Fraudes",
      description: "Sistema de detecção de fraudes em tempo real com 99.7% de precisão",
      image: "/placeholder.svg",
      tags: ["Segurança", "Real-time", "Fintech"],
    },
    {
      id: 4,
      client: "Varejo Tech",
      title: "Recomendação Personalizada",
      description: "Motor de recomendação que aumentou vendas online em 40%",
      image: "/placeholder.svg",
      tags: ["E-commerce", "Personalização", "ML"],
    },
    {
      id: 5,
      client: "Saúde Plus",
      title: "Diagnóstico Assistido por IA",
      description: "Sistema de apoio ao diagnóstico médico com análise de imagens",
      image: "/placeholder.svg",
      tags: ["Saúde", "Computer Vision", "IA"],
    },
    {
      id: 6,
      client: "Logística Express",
      title: "Otimização de Rotas",
      description: "Algoritmo de otimização que reduziu tempo de entrega em 30%",
      image: "/placeholder.svg",
      tags: ["Logística", "Otimização", "IoT"],
    },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 gradient-bg" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-6 animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold leading-tight">
              Onde a <span className="gradient-text">Inteligência Artificial</span>{" "}
              transforma empresas
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Conheça alguns dos projetos que realizamos e os resultados que alcançamos
            </p>
          </div>
        </div>
      </section>

      {/* Cases Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {cases.map((caseItem) => (
              <div
                key={caseItem.id}
                className="group rounded-xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5"
              >
                {/* Image */}
                <div className="aspect-video relative overflow-hidden bg-muted">
                  <img
                    src={caseItem.image}
                    alt={caseItem.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full bg-background/90 text-sm font-medium">
                      {caseItem.client}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  <h3 className="text-xl font-heading font-semibold group-hover:text-primary transition-colors">
                    {caseItem.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {caseItem.description}
                  </p>
                  
                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {caseItem.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs rounded-md bg-primary/10 text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <Button variant="ghost" className="w-full justify-between group/btn">
                    Ver detalhes
                    <ExternalLink className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-heading font-bold">
              Quer ser nosso próximo <span className="gradient-text">case de sucesso</span>?
            </h2>
            <p className="text-muted-foreground">
              Entre em contato e descubra como podemos transformar seu negócio
            </p>
            <Button size="lg" className="glow-cyan">
              Iniciar Conversa
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Cases;
