import { Link } from "react-router-dom";
import { CalendarDays, MapPin, Users, ArrowRight, Mic, GraduationCap } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import fernandoImg from "@/assets/founders/fernando-godoy.png";
import palestraEvento from "@/assets/palestra-evento.jpeg";

const palestras = [
  {
    tipo: "Palestra",
    titulo: "IA e o Futuro dos Negócios",
    data: "15 de Março, 2026",
    horario: "09:00 - 12:00",
    local: "São Paulo, SP",
    formato: "Presencial",
    vagas: "500 pessoas",
  },
  {
    tipo: "Palestra",
    titulo: "O Nexialista É Antifrágil: IA como Vantagem Competitiva",
    data: "28 de Março, 2026",
    horario: "14:00 - 17:00",
    local: "Rio de Janeiro, RJ",
    formato: "Presencial",
    vagas: "300 pessoas",
  },
  {
    tipo: "Palestra",
    titulo: "AI First: Transformação Digital com Inteligência Artificial",
    data: "10 de Abril, 2026",
    horario: "19:00 - 21:00",
    local: "Online",
    formato: "Online",
    vagas: "Ilimitado",
  },
];

const bootcamps = [
  {
    tipo: "Bootcamp",
    titulo: "Bootcamp IA Generativa para Negócios",
    data: "05 a 07 de Abril, 2026",
    horario: "08:30 - 18:00",
    local: "São Paulo, SP",
    formato: "Presencial Intensivo",
    vagas: "40 pessoas",
  },
  {
    tipo: "Bootcamp",
    titulo: "Bootcamp Liderança com IA",
    data: "19 a 21 de Maio, 2026",
    horario: "08:30 - 18:00",
    local: "Curitiba, PR",
    formato: "Presencial Intensivo",
    vagas: "35 pessoas",
  },
  {
    tipo: "Bootcamp",
    titulo: "Bootcamp IA para Times Operacionais",
    data: "02 a 04 de Junho, 2026",
    horario: "09:00 - 17:00",
    local: "Online",
    formato: "Online Intensivo",
    vagas: "60 pessoas",
  },
];

const Agenda = () => {
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

      {/* Palestrante Destaque */}
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
                <p className="text-sm text-primary font-medium mb-1">Palestrante Principal</p>
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

      {/* Palestras */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <FadeInUp>
            <div className="flex items-center gap-3 mb-10">
              <Mic className="h-6 w-6 text-primary" />
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground italic">
                Palestras
              </h2>
            </div>
          </FadeInUp>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {palestras.map((evento, i) => (
              <StaggerItem key={i}>
                <div className="bg-card border border-border rounded-2xl p-6 hover:border-primary/50 transition-colors h-full flex flex-col">
                  <Badge variant="outline" className="w-fit mb-4 border-primary/30 text-primary text-xs">
                    {evento.formato}
                  </Badge>
                  <h3 className="text-lg font-heading font-semibold text-foreground mb-4 flex-grow">
                    {evento.titulo}
                  </h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      <span>{evento.data} • {evento.horario}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>{evento.local}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span>{evento.vagas}</span>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Bootcamps */}
      <section className="py-20 bg-card/30">
        <div className="container mx-auto px-4">
          <FadeInUp>
            <div className="flex items-center gap-3 mb-10">
              <GraduationCap className="h-6 w-6 text-primary" />
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground italic">
                Bootcamps
              </h2>
            </div>
          </FadeInUp>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bootcamps.map((evento, i) => (
              <StaggerItem key={i}>
                <div className="bg-card border border-border rounded-2xl p-6 hover:border-primary/50 transition-colors h-full flex flex-col">
                  <Badge variant="outline" className="w-fit mb-4 border-accent/50 text-accent text-xs">
                    {evento.formato}
                  </Badge>
                  <h3 className="text-lg font-heading font-semibold text-foreground mb-4 flex-grow">
                    {evento.titulo}
                  </h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      <span>{evento.data} • {evento.horario}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>{evento.local}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span>{evento.vagas}</span>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))}
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
