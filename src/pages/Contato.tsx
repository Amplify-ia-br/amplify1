import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout/Layout";
import { FadeInUp, SlideInLeft, SlideInRight, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrapper";

const Contato = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simular envio - será substituído pela integração com o backend
    setTimeout(() => {
      toast({
        title: "Mensagem enviada!",
        description: "Entraremos em contato em breve.",
      });
      setFormData({ name: "", email: "", company: "", message: "" });
      setIsLoading(false);
    }, 1000);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 gradient-bg" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            className="max-w-4xl mx-auto text-center space-y-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold leading-tight">
              Vamos <span className="gradient-text">conversar</span>?
            </h1>
            <motion.p 
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              Entre em contato e descubra como podemos transformar sua empresa com IA
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <SlideInLeft className="space-y-8">
              <div>
                <h2 className="text-2xl font-heading font-bold mb-2">
                  Envie uma mensagem
                </h2>
                <p className="text-muted-foreground">
                  Preencha o formulário abaixo e responderemos o mais breve possível
                </p>
              </div>

              <motion.form 
                onSubmit={handleSubmit} 
                className="space-y-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <motion.div 
                    className="space-y-2"
                    whileHover={{ scale: 1.01 }}
                  >
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Seu nome"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="bg-card border-border focus:border-primary transition-all"
                    />
                  </motion.div>
                  <motion.div 
                    className="space-y-2"
                    whileHover={{ scale: 1.01 }}
                  >
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="bg-card border-border focus:border-primary transition-all"
                    />
                  </motion.div>
                </div>

                <motion.div 
                  className="space-y-2"
                  whileHover={{ scale: 1.01 }}
                >
                  <Label htmlFor="company">Empresa</Label>
                  <Input
                    id="company"
                    name="company"
                    placeholder="Nome da sua empresa"
                    value={formData.company}
                    onChange={handleChange}
                    className="bg-card border-border focus:border-primary transition-all"
                  />
                </motion.div>

                <motion.div 
                  className="space-y-2"
                  whileHover={{ scale: 1.01 }}
                >
                  <Label htmlFor="message">Mensagem *</Label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Como podemos ajudar?"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="bg-card border-border focus:border-primary resize-none transition-all"
                  />
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isLoading}
                    className="w-full glow-cyan"
                  >
                    {isLoading ? (
                      <motion.span
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        Enviando...
                      </motion.span>
                    ) : (
                      <>
                        Enviar Mensagem
                        <Send className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </motion.div>
              </motion.form>
            </SlideInLeft>

            {/* Contact Info */}
            <SlideInRight className="space-y-8">
              <div>
                <h2 className="text-2xl font-heading font-bold mb-2">
                  Outras formas de contato
                </h2>
                <p className="text-muted-foreground">
                  Escolha o canal que preferir para falar conosco
                </p>
              </div>

              <StaggerContainer className="space-y-6">
                {[
                  { icon: Mail, title: "Email", value: "contato@amplify.com.br" },
                  { icon: Phone, title: "Telefone", value: "+55 (11) 99999-9999" },
                  { icon: MapPin, title: "Localização", value: "São Paulo, SP - Brasil" },
                ].map((item, index) => (
                  <StaggerItem key={index}>
                    <motion.div 
                      className="flex items-start space-x-4 p-4 rounded-lg bg-card border border-border"
                      whileHover={{ 
                        borderColor: "hsl(177 70% 41% / 0.5)",
                        x: 5
                      }}
                    >
                      <motion.div 
                        className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"
                        whileHover={{ scale: 1.1, backgroundColor: "hsl(177 70% 41% / 0.2)" }}
                      >
                        <item.icon className="h-5 w-5 text-primary" />
                      </motion.div>
                      <div>
                        <h3 className="font-semibold mb-1">{item.title}</h3>
                        <p className="text-muted-foreground text-sm">{item.value}</p>
                      </div>
                    </motion.div>
                  </StaggerItem>
                ))}
              </StaggerContainer>

              {/* Schedule Meeting */}
              <FadeInUp delay={0.4}>
                <motion.div 
                  className="p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
                  whileHover={{ scale: 1.02, borderColor: "hsl(177 70% 41% / 0.4)" }}
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <motion.div
                      animate={{ 
                        rotate: [0, 10, -10, 0],
                      }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    >
                      <Calendar className="h-6 w-6 text-primary" />
                    </motion.div>
                    <h3 className="text-lg font-heading font-semibold">
                      Agende uma reunião
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Prefere uma conversa mais detalhada? Agende um horário diretamente na nossa agenda.
                  </p>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button variant="outline" className="w-full border-primary/50 hover:bg-primary/10">
                      Abrir Calendário
                    </Button>
                  </motion.div>
                </motion.div>
              </FadeInUp>
            </SlideInRight>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Contato;
