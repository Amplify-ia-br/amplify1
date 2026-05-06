import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { Link } from "@/lib/astro-router";
import { assetSrc } from "@/lib/assets";
import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrapper";

import caseFord from "@/assets/optimized/ford-card.webp";
import caseGala from "@/assets/optimized/gala-card.webp";
import caseGrupoErea from "@/assets/optimized/case-grupo-erea-card.webp";
import caseDwx from "@/assets/optimized/dwx-card.webp";
import caseForumNegocios from "@/assets/optimized/forum-palestra.webp";
import caseAssai from "@/assets/optimized/assai-card.webp";
import caseJornadaAcelere from "@/assets/optimized/jornada-acelere-card.webp";
import caseFaculdadeHub from "@/assets/optimized/faculdade-hub-case-card.webp";
import depoimentoGuilherme from "@/assets/depoimento-guilherme.png";

const cases = [
  { category: "Capacitação Corporativa", title: "Ford Brasil", image: assetSrc(caseFord) },
  { category: "Capacitação Corporativa", title: "Gala The Holy Grail of Business", image: assetSrc(caseGala) },
  { category: "Capacitação Corporativa", title: "Grupo EREA", image: assetSrc(caseGrupoErea) },
  { category: "Capacitação Corporativa", title: "DWX Experience", image: assetSrc(caseDwx) },
  { category: "Capacitação Corporativa", title: "Fórum Negócios", image: assetSrc(caseForumNegocios) },
  { category: "Capacitação Corporativa", title: "Assaí Atacadista", image: assetSrc(caseAssai) },
  { category: "Capacitação Corporativa", title: "Jornada Acelere", image: assetSrc(caseJornadaAcelere) },
  { category: "Capacitação Corporativa", title: "Faculdade HUB", image: assetSrc(caseFaculdadeHub) },
];

const testimonials = [
  {
    quote: "\"Como ecossistema tecnológico líder da construção brasileira, a Inteligência Artificial tem sido um dos temas centrais dos nossos debates. Por isso, teremos a Amplify no ConstruSummit para aprofundar a discussão sobre o impacto da IA no futuro do setor.\"",
    name: "Guilherme Quandt",
    role: "Diretor de Marketing do Ecossistema Sienge",
    image: assetSrc(depoimentoGuilherme),
  },
];

const Cases = () => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="py-32 md:py-44 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-4xl mx-auto text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-heading font-bold leading-tight">
              Onde a
              <br />
              <em className="font-light not-italic italic text-muted-foreground">Inteligência Artificial</em>
              <br />
              transforma empresas
            </h1>
          </motion.div>
        </div>
      </section>

      {/* Cases Grid - 2 columns */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12">
            {cases.map((caseItem, index) => (
              <StaggerItem key={index}>
                <motion.div
                  className="group cursor-pointer"
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="aspect-[4/3] rounded-2xl overflow-hidden mb-4 bg-card">
                    <img
                      src={caseItem.image}
                      alt={caseItem.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{caseItem.category}</p>
                  <h3 className="text-xl md:text-2xl font-heading font-semibold text-foreground">
                    {caseItem.title}
                  </h3>
                  <div className="mt-4 border-t border-border" />
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-12">
            <div>
              <p className="text-sm text-muted-foreground mb-2">(Depoimentos de clientes)</p>
            </div>
            <FadeInUp>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold leading-tight text-right">
                Olha só o que
                <br />
                aconteceu <em className="font-light not-italic italic text-muted-foreground">com nossos</em>
                <br />
                queridos clientes
              </h2>
            </FadeInUp>
          </div>

          {/* Navigation arrows */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={prevTestimonial}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Anterior
            </button>
            <div className="flex-1" />
            <button
              onClick={nextTestimonial}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Próximo
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Testimonial card */}
          <motion.div
            key={currentTestimonial}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-[350px_1fr] gap-0 rounded-2xl overflow-hidden bg-card border border-border"
          >
            <div className="aspect-square md:aspect-auto overflow-hidden">
              <img
                src={testimonials[currentTestimonial].image}
                alt={testimonials[currentTestimonial].name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="p-8 md:p-12 flex flex-col justify-center">
              <p className="text-lg md:text-xl text-foreground leading-relaxed mb-8">
                {testimonials[currentTestimonial].quote}
              </p>
              <div>
                <p className="font-heading font-semibold text-foreground">
                  {testimonials[currentTestimonial].name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {testimonials[currentTestimonial].role}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <FadeInUp className="text-center space-y-8">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold">
              Vamos falar sobre <em className="font-light not-italic italic text-muted-foreground">seu projeto em IA?</em>
            </h2>
            <div className="flex justify-center">
              <a href="https://wa.me/5511918252109?text=Olá! Gostaria de falar sobre meu projeto em IA." target="_blank" rel="noopener noreferrer">
                <motion.div
                  className="w-14 h-14 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ArrowUpRight className="h-6 w-6 text-primary-foreground" />
                </motion.div>
              </a>
            </div>
          </FadeInUp>
        </div>
      </section>
    </Layout>
  );
};

export default Cases;
