import Layout from "@/components/layout/Layout";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrapper";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Clock, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import imgPonde from "@/assets/eventos/ponde.webp";
import imgFernando from "@/assets/eventos/fernando-godoy-filosofia.png";
import imgWalter from "@/assets/eventos/walter-longo.jpg";

const palestrantes = [
  {
    nome: "Luiz Felipe Pondé",
    role: "Filósofo, escritor e professor",
    imagem: imgPonde,
  },
  {
    nome: "Fernando Godoy",
    role: "CEO & Cofundador da AMPLIFY",
    imagem: imgFernando,
  },
  {
    nome: "Walter Longo",
    role: "Especialista em inovação e tecnologia",
    imagem: imgWalter,
  },
];

const EventoFilosofia = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="py-24 md:py-32 bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="container mx-auto px-4 relative z-10">
          <FadeInUp>
            <Link
              to="/agenda"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar à Agenda
            </Link>
            <div className="text-center max-w-4xl mx-auto">
              <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
                Palestra
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-foreground italic mb-4">
                FilosofIA
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground font-heading italic mb-8">
                Quando a IA responde, a filosofia pergunta.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span>15 de Abril, 2026</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>19:00</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>FAAP - São Paulo</span>
                </div>
              </div>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* Palestrantes */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <FadeInUp>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground italic text-center mb-16">
              Palestrantes & Painelistas
            </h2>
          </FadeInUp>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {palestrantes.map((p) => (
              <StaggerItem key={p.nome}>
                <div className="text-center group">
                  <div className="w-48 h-48 mx-auto rounded-full overflow-hidden border-4 border-primary/20 group-hover:border-primary/50 transition-colors mb-6">
                    <img
                      src={p.imagem}
                      alt={p.nome}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <h3 className="text-xl font-heading font-bold text-foreground italic mb-1">
                    {p.nome}
                  </h3>
                  <p className="text-sm text-muted-foreground">{p.role}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>
    </Layout>
  );
};

export default EventoFilosofia;
