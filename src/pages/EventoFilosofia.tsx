import Layout from "@/components/layout/Layout";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrapper";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Clock, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import imgPonde from "@/assets/eventos/ponde.webp";
import imgFernando from "@/assets/eventos/fernando-godoy-filosofia.png";
import imgWalter from "@/assets/eventos/walter-longo.jpg";
import imgFilosofiaHero from "@/assets/eventos/filosofia-hero.png";

const palestrantes = [
{
  nome: "Luiz Felipe Pondé",
  role: "Filósofo, escritor e professor",
  imagem: imgPonde
},
{
  nome: "Fernando Godoy",
  role: "CEO & Cofundador da AMPLIFY",
  imagem: imgFernando
},
{
  nome: "Walter Longo",
  role: "Especialista em inovação e tecnologia",
  imagem: imgWalter
}];


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
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8">

              <ArrowLeft className="h-4 w-4" />
              Voltar à Agenda
            </Link>

            {/* Palestrantes */}
            <div className="text-center max-w-5xl mx-auto mb-12">
              <StaggerContainer className="flex flex-wrap items-center justify-center gap-8 md:gap-12 mb-8">
                {palestrantes.map((p) =>
                <StaggerItem key={p.nome}>
                    <div className="text-center group">
                      <div className="w-28 h-28 md:w-36 md:h-36 mx-auto rounded-full overflow-hidden border-4 border-primary/20 group-hover:border-primary/50 transition-colors mb-3">
                        <img
                        src={p.imagem}
                        alt={p.nome}
                        className="w-full h-full object-cover object-top" />

                      </div>
                      <h3 className="text-base md:text-lg font-heading font-bold text-foreground italic">
                        {p.nome}
                      </h3>
                      <p className="text-xs text-muted-foreground">{p.role}</p>
                    </div>
                  </StaggerItem>
                )}
              </StaggerContainer>
              <p className="text-lg md:text-xl text-muted-foreground font-heading italic mb-6">apresentam:

              </p>
            </div>

            {/* Título e subtítulo */}
            <div className="text-center max-w-4xl mx-auto mb-12">
                <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
                Evento
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
                  <span>23 de Maio, 2026</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>9:00</span>
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

      {/* Arte do evento */}
      <section className="py-16 bg-card/50">
        <div className="container mx-auto px-4">
          <FadeInUp>
            <div className="max-w-5xl mx-auto relative rounded-2xl overflow-hidden shadow-2xl shadow-primary/10">
              <img
                src={imgFilosofiaHero}
                alt="FilosofIA — Filosofia e Inteligência Artificial"
                className="w-full h-auto object-cover" />

              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 text-center">
                <h2 className="text-3xl md:text-5xl font-heading font-bold text-foreground italic mb-2">
                  FilosofIA
                </h2>
                <p className="text-lg md:text-xl font-heading italic text-muted-foreground">
                  Quando a IA responde, a filosofia pergunta.
                </p>
              </div>
            </div>
          </FadeInUp>
        </div>
      </section>
    </Layout>);

};

export default EventoFilosofia;