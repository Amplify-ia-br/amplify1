import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";
import { FadeInUp, StaggerContainer, StaggerItem, ScaleIn } from "@/components/animations/MotionWrapper";
import artigoVantagemCompetitiva from "@/assets/blog/artigo-vantagem-competitiva.png";

const Blog = () => {
  const posts = [
    {
      id: 1,
      title: "Hoje eu não vim falar de tecnologia. Eu vim anunciar o fim da sua vantagem.",
      excerpt: "A vantagem competitiva não é ter IA. É implementar antes do seu concorrente. E esperar não é prudência. É perder mercado com educação.",
      image: artigoVantagemCompetitiva,
      date: "2025-01-31",
      readTime: "4 min",
      category: "Estratégia",
      author: "Fernando Godoy",
    },
    {
      id: 2,
      title: "Como a IA está revolucionando o atendimento ao cliente",
      excerpt: "Descubra como chatbots e assistentes virtuais estão transformando a experiência do consumidor",
      image: "/placeholder.svg",
      date: "2024-01-15",
      readTime: "5 min",
      category: "Tendências",
    },
    {
      id: 3,
      title: "Machine Learning: Por onde começar?",
      excerpt: "Um guia prático para empresas que querem dar os primeiros passos com ML",
      image: "/placeholder.svg",
      date: "2024-01-10",
      readTime: "8 min",
      category: "Educação",
    },
    {
      id: 4,
      title: "O futuro do trabalho na era da IA",
      excerpt: "Como preparar sua empresa e sua equipe para as mudanças que estão por vir",
      image: "/placeholder.svg",
      date: "2024-01-05",
      readTime: "6 min",
      category: "Futuro",
    },
    {
      id: 5,
      title: "Cases de sucesso: IA no varejo brasileiro",
      excerpt: "Exemplos reais de como empresas brasileiras estão usando IA para vender mais",
      image: "/placeholder.svg",
      date: "2024-01-01",
      readTime: "7 min",
      category: "Cases",
    },
    {
      id: 6,
      title: "GPT e LLMs: O que sua empresa precisa saber",
      excerpt: "Entenda o que são os grandes modelos de linguagem e como aplicá-los",
      image: "/placeholder.svg",
      date: "2023-12-28",
      readTime: "10 min",
      category: "Tecnologia",
    },
    {
      id: 7,
      title: "Automação inteligente: Além do RPA tradicional",
      excerpt: "Como a IA está elevando o patamar da automação de processos",
      image: "/placeholder.svg",
      date: "2023-12-20",
      readTime: "6 min",
      category: "Automação",
    },
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
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
              <span className="gradient-text">Blog</span> Amplify
            </h1>
            <motion.p 
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              Insights, tendências e conhecimento sobre Inteligência Artificial e transformação digital
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          {/* Featured Post */}
          <ScaleIn className="mb-16">
            <Link
              to={`/blog/${posts[0].id}`}
              className="group grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300"
            >
              <motion.div 
                className="aspect-video rounded-xl overflow-hidden bg-muted"
                whileHover={{ scale: 1.02 }}
              >
                <img
                  src={posts[0].image}
                  alt={posts[0].title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </motion.div>
              <div className="flex flex-col justify-center space-y-4">
                <motion.span 
                  className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm w-fit"
                  whileHover={{ scale: 1.05 }}
                >
                  {posts[0].category}
                </motion.span>
                <h2 className="text-2xl md:text-3xl font-heading font-bold group-hover:text-primary transition-colors">
                  {posts[0].title}
                </h2>
                <p className="text-muted-foreground">
                  {posts[0].excerpt}
                </p>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatDate(posts[0].date)}
                  </span>
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {posts[0].readTime}
                  </span>
                </div>
              </div>
            </Link>
          </ScaleIn>

          {/* Posts Grid */}
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.slice(1).map((post) => (
              <StaggerItem key={post.id}>
                <Link to={`/blog/${post.id}`}>
                  <motion.div
                    className="group rounded-xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-all duration-300 h-full"
                    whileHover={{ y: -8, boxShadow: "0 20px 40px -15px hsl(177 70% 41% / 0.15)" }}
                  >
                    <div className="aspect-video overflow-hidden bg-muted">
                      <motion.img
                        src={post.image}
                        alt={post.title}
                        className="w-full h-full object-cover"
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <div className="p-6 space-y-3">
                      <motion.span 
                        className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs"
                        whileHover={{ scale: 1.05 }}
                      >
                        {post.category}
                      </motion.span>
                      <h3 className="text-lg font-heading font-semibold group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(post.date)}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {post.readTime}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {/* Load More */}
          <FadeInUp className="text-center mt-12">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button variant="outline" size="lg">
                Carregar mais posts
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          </FadeInUp>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <FadeInUp className="max-w-2xl mx-auto text-center space-y-6">
            <h2 className="text-3xl font-heading font-bold">
              Receba nossos <span className="gradient-text">insights</span>
            </h2>
            <p className="text-muted-foreground">
              Cadastre-se para receber as últimas novidades sobre IA diretamente no seu email
            </p>
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <input
                type="email"
                placeholder="seu@email.com"
                className="flex-1 px-4 py-3 rounded-lg bg-background border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button className="glow-cyan w-full sm:w-auto">Inscrever-se</Button>
              </motion.div>
            </motion.div>
          </FadeInUp>
        </div>
      </section>
    </Layout>
  );
};

export default Blog;
