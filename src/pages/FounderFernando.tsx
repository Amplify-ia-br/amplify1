import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Linkedin, Instagram, X, ChevronLeft, ChevronRight } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { FadeInUp } from "@/components/animations/MotionWrapper";
import fernandoImg from "@/assets/founders/fernando-godoy.png";
import palestraEvento from "@/assets/palestra-evento.jpeg";
import forumPalestra from "@/assets/forum-palestra.png";
import globonews from "@/assets/founders/fernando-globonews.png";
import palco from "@/assets/founders/fernando-palco.jpeg";
import pecege from "@/assets/founders/fernando-pecege.png";
import nexialista from "@/assets/founders/fernando-nexialista.jpeg";
import workshop from "@/assets/founders/fernando-workshop.jpeg";
import aifirst from "@/assets/founders/fernando-aifirst.jpeg";
import forumPainel from "@/assets/founders/fernando-forum-painel.jpeg";
import forumChatgpt from "@/assets/founders/fernando-forum-chatgpt.jpeg";
import podcast from "@/assets/founders/fernando-podcast.jpeg";
import gala from "@/assets/founders/fernando-gala.jpeg";
import primocast from "@/assets/founders/fernando-primocast.jpeg";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";

const images = [
  { src: palestraEvento, alt: "Fernando Godoy na GloboNews" },
  { src: forumPalestra, alt: "Fernando Godoy palestrando" },
  { src: globonews, alt: "Fernando Godoy no programa Conta Corrente - GloboNews" },
  { src: palco, alt: "Fernando Godoy em grande palco" },
  { src: pecege, alt: "Fernando Godoy palestrando no PECEGE" },
  { src: nexialista, alt: "Fernando Godoy - O Nexialista É Antifrágil" },
  { src: workshop, alt: "Fernando Godoy em workshop" },
  { src: aifirst, alt: "Fernando Godoy - AI First" },
  { src: forumPainel, alt: "Fernando Godoy no Painel de IA - Fórum Negócios" },
  { src: forumChatgpt, alt: "Fernando Godoy no Fórum Negócios Brasil" },
  { src: podcast, alt: "Fernando Godoy no InovaMente Cast" },
  { src: gala, alt: "Fernando Godoy em evento Gala Business" },
  { src: primocast, alt: "Fernando Godoy no PrimoCast" },
];

const FounderFernando = () => {
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);

  const openZoom = (i: number) => setZoomIndex(i);
  const closeZoom = () => setZoomIndex(null);
  const prev = () => setZoomIndex((i) => (i !== null ? (i - 1 + images.length) % images.length : null));
  const next = () => setZoomIndex((i) => (i !== null ? (i + 1) % images.length : null));

  return (
    <Layout>
      {/* Hero */}
      <section className="py-24 md:py-32 bg-background">
        <div className="container mx-auto px-4">
          <FadeInUp>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              {/* Left - Carousel */}
              <div className="w-full">
                <Carousel
                  opts={{ loop: true }}
                  plugins={[Autoplay({ delay: 4000, stopOnInteraction: true })]}
                  className="w-full"
                >
                  <CarouselContent>
                    {images.map((img, i) => (
                      <CarouselItem key={i}>
                        <div
                          className="rounded-2xl overflow-hidden cursor-pointer"
                          onClick={() => openZoom(i)}
                        >
                          <img
                            src={img.src}
                            alt={img.alt}
                            className="w-full h-[400px] md:h-[500px] object-cover rounded-2xl hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="left-2" />
                  <CarouselNext className="right-2" />
                </Carousel>
              </div>

              {/* Right - Bio */}
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden">
                    <img src={fernandoImg} alt="Fernando Godoy" className="w-full h-full object-cover object-top" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-foreground italic">
                      Fernando Godoy
                    </h1>
                    <p className="text-sm text-muted-foreground">CEO & Founder</p>
                  </div>
                </div>

                <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
                  <p>
                    Empreendedor serial com mais de 25 anos de experiência em tecnologia e
                    inovação nos EUA e no Brasil, é especialista em{" "}
                    <strong className="text-foreground">Inteligência Artificial</strong> e
                    experiências imersivas.
                  </p>
                  <p>
                    É <strong className="text-foreground">cofundador da AMPLIFY</strong>, empresa dedicada à{" "}
                    <strong className="text-foreground">capacitação e consultoria em Inteligência Artificial</strong>,
                    que tem como propósito ajudar profissionais e organizações à aplicarem IA de forma prática,
                    estratégica e orientada a resultados.
                  </p>
                  <p>
                    Atuou como <strong className="text-foreground">Head de Inteligência Artificial da dataRain</strong>{" "}
                    e foi <strong className="text-foreground">fundador da Flex Interativa</strong>, empresa pioneira em
                    experiências imersivas no Brasil. Também foi{" "}
                    <strong className="text-foreground">fundador da Cervejaria Leuven</strong> e{" "}
                    <strong className="text-foreground">presidente do Conselho da CBCA – Companhia Brasileira de Cerveja Artesanal</strong>.
                  </p>
                  <p>
                    Mentor, investidor, <strong className="text-foreground">palestrante internacional, autor e professor de MBA</strong>,
                    coordena o curso <strong className="text-foreground">"IA para Negócios"</strong> em parceria com grupos educacionais.
                  </p>
                </div>

                {/* Social Links */}
                <div className="flex items-center gap-4 pt-2">
                  <a
                    href="https://www.linkedin.com/in/fernandogodoy10/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Linkedin className="h-5 w-5" />
                    <span className="text-sm">LinkedIn</span>
                  </a>
                  <a
                    href="https://www.instagram.com/fernandogodoy_oficial/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 transition-colors font-medium text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <Instagram className="h-5 w-5" />
                      @fernandogodoy_oficial
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* Lightbox Zoom */}
      <AnimatePresence>
        {zoomIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={closeZoom}
          >
            <button
              onClick={(e) => { e.stopPropagation(); closeZoom(); }}
              className="absolute top-4 right-4 text-white/80 hover:text-white z-50"
            >
              <X className="h-8 w-8" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-4 text-white/80 hover:text-white z-50"
            >
              <ChevronLeft className="h-10 w-10" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-4 text-white/80 hover:text-white z-50"
            >
              <ChevronRight className="h-10 w-10" />
            </button>
            <motion.img
              key={zoomIndex}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
              src={images[zoomIndex].src}
              alt={images[zoomIndex].alt}
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default FounderFernando;
