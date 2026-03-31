import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, MapPin, ArrowRight, Mic, GraduationCap, Clock, Filter } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import fernandoImg from "@/assets/founders/fernando-godoy.png";
import palestraEvento from "@/assets/palestra-evento.jpeg";
import imgEdificatto from "@/assets/eventos/edificatto.png";
import imgAmplifyClub from "@/assets/eventos/amplify-club.png";
import imgInnovationWeek from "@/assets/eventos/sao-paulo-innovation-week.webp";
import imgSerratec from "@/assets/eventos/serratec.png";

const eventos = [
  {
    nome: "Edificatto",
    tipo: "Workshop",
    data: "20 de Fevereiro, 2026",
    horario: "09:00",
    local: "",
    imagem: imgEdificatto,
  },
  {
    nome: "Amplify Club - Masterclass",
    tipo: "Masterclass",
    data: "10 de Março, 2026",
    horario: "20:00",
    local: "",
    imagem: imgAmplifyClub,
  },
  {
    nome: "Petrópolis - Serratec",
    tipo: "Bootcamp",
    data: "11 de Abril, 2026",
    horario: "08:00",
    local: "Petrópolis - RJ",
    imagem: imgSerratec,
  },
  {
    nome: "FilosofIA",
    tipo: "Palestra",
    data: "15 de Abril, 2026",
    horario: "19:00",
    local: "FAAP - São Paulo",
    imagem: null,
  },
  {
    nome: "Amplify Club - Presencial",
    tipo: "Presencial",
    data: "23 de Abril, 2026",
    horario: "19:30",
    local: "Le Bife - São Paulo",
    imagem: imgAmplifyClub,
  },
  {
    nome: "SEBRAE Lagoa Santa",
    tipo: "Palestra",
    data: "30 de Abril, 2026",
    horario: "",
    local: "Lagoa Santa - MG",
    imagem: null,
  },
  {
    nome: "FilosofIA Online",
    tipo: "Curso Online",
    data: "05 de Maio, 2026",
    horario: "20:00",
    local: "",
    imagem: null,
  },
  {
    nome: "São Paulo Innovation Week",
    tipo: "Evento",
    data: "13 de Maio, 2026",
    horario: "",
    local: "",
    imagem: imgInnovationWeek,
  },
  {
    nome: "Amplify Club - Evento Presencial",
    tipo: "Evento",
    data: "21 de Maio, 2026",
    horario: "",
    local: "",
    imagem: imgAmplifyClub,
  },
];

const tiposUnicos = ["Todos", ...Array.from(new Set(eventos.map((e) => e.tipo)))];

const Agenda = () => {
  const [filtroAtivo, setFiltroAtivo] = useState("Todos");

  const eventosFiltrados = filtroAtivo === "Todos"
    ? eventos
    : eventos.filter((e) => e.tipo === filtroAtivo);

  return (
    <Layout>
      {/* Hero */}
      <section className="py-24 md:py-32 bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="container mx-auto px-4 relative z-10">
          <FadeInUp>
            <div className="text-center max-w-3xl mx-auto">
              <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
                <CalendarDays className="h-3 w-3 mr-1" />
                Agenda 2026
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-foreground italic mb-6">
                Próximos Eventos
              </h1>
              <p className="text-lg text-muted-foreground">
                Confira as datas das nossas palestras e bootcamps. Capacite sua equipe com as melhores práticas em Inteligência Artificial.
              </p>
            </div>
          </FadeInUp>
        </div>
      </section>


      {/* Filtro + Eventos */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <FadeInUp>
            <div className="flex items-center gap-3 mb-8">
              <CalendarDays className="h-6 w-6 text-primary" />
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground italic">
                Calendário de Eventos
              </h2>
            </div>
          </FadeInUp>

          {/* Filtro */}
          <FadeInUp delay={0.1}>
            <div className="flex items-center gap-2 mb-10 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground mr-1" />
              {tiposUnicos.map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => setFiltroAtivo(tipo)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                    filtroAtivo === tipo
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {tipo}
                </button>
              ))}
            </div>
          </FadeInUp>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventosFiltrados.map((evento, i) => {
              const cardContent = (
                <>
                  {evento.imagem && (
                    <div className="h-40 bg-muted/30 flex items-center justify-center p-4">
                      <img
                        src={evento.imagem}
                        alt={evento.nome}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  )}
                  <div className="p-6 flex flex-col flex-grow">
                    <Badge variant="outline" className="w-fit mb-4 border-primary/30 text-primary text-xs">
                      {evento.tipo}
                    </Badge>
                    <h3 className="text-lg font-heading font-semibold text-foreground mb-4 flex-grow">
                      {evento.nome}
                    </h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-primary shrink-0" />
                        <span>{evento.data}</span>
                      </div>
                      {evento.horario && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary shrink-0" />
                          <span>{evento.horario}</span>
                        </div>
                      )}
                      {evento.local && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary shrink-0" />
                          <span>{evento.local}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              );

              return (
                <StaggerItem key={i}>
                  {evento.nome === "FilosofIA" ? (
                    <Link to="/agenda/filosofia" className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/50 transition-colors h-full flex flex-col cursor-pointer">
                      {cardContent}
                    </Link>
                  ) : (
                    <div className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/50 transition-colors h-full flex flex-col">
                      {cardContent}
                    </div>
                  )}
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <FadeInUp>
            <div className="relative rounded-3xl overflow-hidden">
              <img src={palestraEvento} alt="Palestra Amplify" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-background/85 backdrop-blur-sm" />
              <div className="relative z-10 text-center py-16 px-6 md:px-16">
                <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground italic mb-4">
                  Contrate uma Palestra ou Bootcamp
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
                  Leve a expertise da AMPLIFY para o seu evento ou empresa. Palestras inspiradoras e bootcamps práticos
                  sobre Inteligência Artificial, personalizados para as necessidades do seu público.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button asChild size="lg" className="glow-cyan">
                    <a
                      href="https://wa.me/5511918252109?text=Olá! Gostaria de contratar uma palestra da AMPLIFY."
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Mic className="h-4 w-4 mr-2" />
                      Contratar Palestra
                    </a>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <a
                      href="https://wa.me/5511918252109?text=Olá! Gostaria de saber mais sobre os Bootcamps da AMPLIFY."
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <GraduationCap className="h-4 w-4 mr-2" />
                      Contratar Bootcamp
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </FadeInUp>
        </div>
      </section>
    </Layout>
  );
};

export default Agenda;
