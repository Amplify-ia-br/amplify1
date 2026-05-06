import { motion } from "framer-motion";
import { Link } from "@/lib/astro-router";
import { assetSrc } from "@/lib/assets";
import { Linkedin } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrapper";
import alexImg from "@/assets/founders/alex-garcia.png";
import magnoImg from "@/assets/founders/magno-maciel.png";

type OptimizedImage = {
  avifSrcSet: string;
  webpSrcSet: string;
  fallbackSrc: string;
  sizes: string;
  width: number;
  height: number;
};

const stats = [
  { number: "90", suffix: "+", label: "Percentual de satisfação dos clientes." },
  { number: "1k", suffix: "+", label: "treinamentos realizados" },
  { number: "15", suffix: "+", label: "Anos de experiência" },
  { number: "450", suffix: "+", label: "empresas impactadas" },
];

const solutions = [
  { title: "Capacitação", description: "Ao aplicar tecnologia e processos analíticos a dados relacionados ao marketing." },
  { title: "Consultoria e Serviços", description: "Ao aplicar tecnologia e processos analíticos a dados relacionados ao marketing." },
  { title: "Comunidades", description: "Ao aplicar tecnologia e processos analíticos a dados relacionados ao marketing." },
  { title: "Ferramentas em IA", description: "Ao aplicar tecnologia e processos analíticos a dados relacionados ao marketing." },
];

type SobreProps = {
  fernandoImage: OptimizedImage;
};

const Sobre = ({ fernandoImage }: SobreProps) => {
  const founders = [
    { name: "Fernando Godoy", role: "CEO & Founder", image: fernandoImage.fallbackSrc, optimized: fernandoImage, linkedin: "https://www.linkedin.com/in/fernandogodoy10/", page: "/founders/fernando-godoy" },
    { name: "Alex Garcia", role: "CRO & Founder", image: assetSrc(alexImg), optimized: null, linkedin: "https://www.linkedin.com/in/alexgarciacr/", page: "/founders/alex-garcia" },
    { name: "Magno Maciel", role: "Advisor & Founder", image: assetSrc(magnoImg), optimized: null, linkedin: "https://www.linkedin.com/in/magnomaciel/", page: "/founders/magno-maciel" },
  ];
  return (
    <Layout>
      {/* Hero + Stats Section */}
      <section className="py-24 md:py-32 bg-background">
        <div className="container mx-auto px-4">
          <FadeInUp>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold leading-tight">
                A clareza <em className="font-light not-italic italic">nasce</em>
                <br />da simplicidade.
              </h1>
              <a
                href="https://wa.me/5511918252109?text=Olá! Gostaria de conhecer as soluções da Amplify."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors w-fit"
              >
                Ver soluções
              </a>
            </div>
          </FadeInUp>

          <div className="border-t border-border" />

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-0 mt-0">
            {stats.map((stat, index) => (
              <StaggerItem key={index}>
                <div className={`flex items-baseline gap-4 py-10 px-2 ${index < 2 ? "border-b border-border" : ""} ${index % 2 === 0 ? "md:border-r md:border-border" : ""}`}>
                  <span className="text-6xl md:text-7xl lg:text-8xl font-heading font-bold text-foreground tracking-tight">
                    {stat.number}
                    <span className="text-muted-foreground">{stat.suffix}</span>
                  </span>
                  <span className="text-sm text-muted-foreground max-w-[180px]">{stat.label}</span>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Solutions Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
            <div className="lg:col-span-1 space-y-6">
              <FadeInUp>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold leading-tight">
                  Oferecemos<br />as melhores<br />
                  <em className="font-light not-italic italic text-muted-foreground">soluções em IA</em>
                </h2>
              </FadeInUp>
              <FadeInUp delay={0.1}>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Somos uma empresa muito dedicada desde 2025. Nossa equipe está sempre pronta para ajudar nossos clientes com as melhores soluções.
                </p>
              </FadeInUp>
              <FadeInUp delay={0.2}>
                <a
                  href="https://wa.me/5511918252109?text=Olá! Gostaria de conhecer as soluções da Amplify."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                >
                  Ver soluções
                </a>
              </FadeInUp>
            </div>

            <StaggerContainer className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {solutions.map((item, index) => (
                <StaggerItem key={index}>
                  <motion.div
                    className="rounded-xl border border-border bg-card p-8 h-full flex flex-col justify-end min-h-[200px] hover:border-primary/40 transition-colors"
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h3 className="text-xl font-heading font-semibold mb-3 text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </motion.div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </div>
      </section>

      {/* Founders Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <FadeInUp className="mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-bold">
              Nossos <span className="gradient-text">Founders</span>
            </h2>
          </FadeInUp>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {founders.map((founder, index) => (
              <StaggerItem key={index}>
                <motion.div
                  className="group cursor-pointer"
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link to={founder.page}>
                    <div className="aspect-square rounded-2xl overflow-hidden mb-4 bg-card relative">
                      {founder.optimized ? (
                        <picture>
                          <source type="image/avif" srcSet={founder.optimized.avifSrcSet} sizes={founder.optimized.sizes} />
                          <source type="image/webp" srcSet={founder.optimized.webpSrcSet} sizes={founder.optimized.sizes} />
                          <img
                            src={founder.optimized.fallbackSrc}
                            alt={founder.name}
                            width={founder.optimized.width}
                            height={founder.optimized.height}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                          />
                        </picture>
                      ) : (
                        <img
                          src={founder.image}
                          alt={founder.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                        />
                      )}
                      <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-colors duration-300" />
                    </div>
                  </Link>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-heading font-semibold text-foreground">{founder.name}</h3>
                    <a
                      href={founder.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Linkedin className="h-4 w-4" />
                    </a>
                  </div>
                  <p className="text-sm text-muted-foreground">{founder.role}</p>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>
    </Layout>
  );
};

export default Sobre;
