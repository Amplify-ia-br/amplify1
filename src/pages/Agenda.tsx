import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, MapPin, ArrowRight, Mic, GraduationCap, Clock, Filter, Search, Loader2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import fernandoImg from "@/assets/founders/fernando-godoy.png";
import palestraEvento from "@/assets/palestra-evento.jpeg";

const API_URL = "https://bhipsbvlxfvdcohdjuac.supabase.co/functions/v1/get-public-events";

interface Evento {
  id: string;
  name: string;
  event_type: string;
  format: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  state: string;
  city: string;
  status: string;
  link: string;
  image_url: string;
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
};

const formatTime = (timeStr: string) => {
  if (!timeStr) return "";
  return timeStr.substring(0, 5);
};


const Agenda = () => {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroAtivo, setFiltroAtivo] = useState("Todos");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    const fetchEventos = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (busca) params.set("search", busca);
        const url = `${API_URL}${params.toString() ? `?${params}` : ""}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Erro ao buscar eventos");
        const data = await res.json();
        setEventos(data);
      } catch (err) {
        console.error("Erro ao carregar eventos:", err);
        setEventos([]);
      } finally {
        setLoading(false);
      }
    };
    const debounce = setTimeout(fetchEventos, 300);
    return () => clearTimeout(debounce);
  }, [busca]);

  const tiposUnicos = ["Todos", ...Array.from(new Set(eventos.map((e) => e.event_type).filter(Boolean)))];

  const eventosFiltrados = filtroAtivo === "Todos"
    ? eventos
    : eventos.filter((e) => e.event_type === filtroAtivo);

  return (
    <Layout>
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

          {/* Busca */}
          <FadeInUp delay={0.05}>
            <div className="relative mb-6 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar evento..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10 bg-card border-border"
              />
            </div>
          </FadeInUp>

          {/* Filtro por tipo */}
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

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : eventosFiltrados.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Nenhum evento encontrado.</p>
            </div>
          ) : (
            <StaggerContainer key={filtroAtivo} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {eventosFiltrados.map((evento) => {
                const isFilosofia = evento.name?.toLowerCase().includes("filosofia");

                const cardContent = (
                  <>
                    {evento.image_url && (
                      <div className="h-40 bg-muted/30 flex items-center justify-center p-4">
                        <img
                          src={evento.image_url}
                          alt={evento.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    )}
                    <div className="p-6 flex flex-col flex-grow">
                      <div className="flex items-center gap-2 mb-4 flex-wrap">
                        {evento.event_type && (
                          <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                            {evento.event_type}
                          </Badge>
                        )}
                        {evento.format && (
                          <Badge variant="secondary" className="text-xs">
                            {evento.format}
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-lg font-heading font-semibold text-foreground mb-4 flex-grow">
                        {evento.name}
                      </h3>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        {evento.start_date && (
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-primary shrink-0" />
                            <span>{formatDate(evento.start_date)}</span>
                          </div>
                        )}
                        {evento.start_time && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary shrink-0" />
                            <span>{formatTime(evento.start_time)}</span>
                          </div>
                        )}
                        {(evento.city || evento.state) && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary shrink-0" />
                            <span>{[evento.location, evento.city, evento.state].filter(Boolean).join(" - ")}</span>
                          </div>
                        )}
                      </div>
                      {evento.link && (
                        <a
                          href={evento.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-flex items-center gap-1 text-primary text-sm font-medium hover:gap-2 transition-all"
                        >
                          Saiba mais <ArrowRight className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </>
                );

                return (
                  <StaggerItem key={evento.id}>
                    {isFilosofia ? (
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
          )}
        </div>
      </section>

      {/* Especialista Destaque */}
      <section className="py-16 bg-card/50">
        <div className="container mx-auto px-4">
          <FadeInUp>
            <div className="flex flex-col md:flex-row items-center gap-8 max-w-4xl mx-auto">
              <Link to="/founders/fernando-godoy" className="shrink-0 group">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-primary/30 group-hover:border-primary transition-colors">
                  <img src={fernandoImg} alt="Fernando Godoy" className="w-full h-full object-cover object-top" />
                </div>
              </Link>
              <div className="text-center md:text-left">
                <p className="text-sm text-primary font-medium mb-1">Especialista</p>
                <Link to="/founders/fernando-godoy" className="hover:text-primary transition-colors">
                  <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground italic mb-2">
                    Fernando Godoy
                  </h2>
                </Link>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  CEO & Cofundador da AMPLIFY. Empreendedor serial com mais de 25 anos de experiência em tecnologia e inovação,
                  especialista em Inteligência Artificial, palestrante internacional, autor e professor de MBA.
                </p>
                <Link
                  to="/founders/fernando-godoy"
                  className="inline-flex items-center gap-1 text-primary text-sm font-medium mt-3 hover:gap-2 transition-all"
                >
                  Conheça mais <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* CTA Contrate */}
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
