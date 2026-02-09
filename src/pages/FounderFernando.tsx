import { motion } from "framer-motion";
import { Linkedin, Instagram } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { FadeInUp } from "@/components/animations/MotionWrapper";
import fernandoImg from "@/assets/founders/fernando-godoy.png";
import palestraEvento from "@/assets/palestra-evento.jpeg";
import forumPalestra from "@/assets/forum-palestra.png";

const FounderFernando = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="py-24 md:py-32 bg-background">
        <div className="container mx-auto px-4">
          <FadeInUp>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              {/* Left - Images */}
              <div className="space-y-6">
                <motion.div
                  className="rounded-2xl overflow-hidden"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                >
                  <img
                    src={palestraEvento}
                    alt="Fernando Godoy na GloboNews"
                    className="w-full h-auto object-cover rounded-2xl"
                  />
                </motion.div>
                <motion.div
                  className="rounded-2xl overflow-hidden"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                >
                  <img
                    src={forumPalestra}
                    alt="Fernando Godoy palestrando"
                    className="w-full h-auto object-cover rounded-2xl"
                  />
                </motion.div>
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
    </Layout>
  );
};

export default FounderFernando;
