import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Clock, User } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { FadeInUp } from "@/components/animations/MotionWrapper";
import artigoVantagemCompetitiva from "@/assets/blog/artigo-vantagem-competitiva.png";
import NotFound from "./NotFound";

const blogPosts: Record<string, {
  title: string;
  image: string;
  date: string;
  readTime: string;
  category: string;
  author: string;
  content: React.ReactNode;
}> = {
  "1": {
    title: "Hoje eu não vim falar de tecnologia. Eu vim anunciar o fim da sua vantagem.",
    image: artigoVantagemCompetitiva,
    date: "2025-01-31",
    readTime: "4 min",
    category: "Estratégia",
    author: "Fernando Godoy",
    content: (
      <div className="space-y-6">
        <p className="text-lg font-medium text-foreground">
          Hoje eu não vim falar de tecnologia.
        </p>
        <p className="text-lg font-semibold text-primary">
          Eu vim anunciar o fim de uma vantagem competitiva: a sua.
        </p>
        <p>
          A vantagem competitiva não é ter IA.<br />
          É implementar antes do seu concorrente.<br />
          E esperar não é prudência. É perder mercado com educação.
        </p>

        <hr className="border-border" />

        <p className="font-semibold text-foreground">
          O inimigo não é a falta de IA.<br />
          É a ilusão confortável de que dá pra esperar "só mais um pouco".
        </p>
        <p>Ela aparece com 3 máscaras:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Agenda lotada</strong> — "agora não dá tempo"</li>
          <li><strong>Piloto eterno</strong> — POC que nunca vira produção</li>
          <li><strong>Medo de expor ineficiência</strong> — IA revela gargalos e retrabalho</li>
        </ul>

        <hr className="border-border" />

        <p>
          Na prática, você não perde pra quem tem mais tecnologia.<br />
          <strong>Você perde pra quem decide e executa mais rápido.</strong>
        </p>

        <blockquote className="border-l-4 border-primary pl-6 py-2 my-8 bg-primary/5 rounded-r-lg">
          <p className="text-lg font-semibold text-foreground">
            Tempo é o novo custo fixo.
          </p>
          <p className="mt-2">
            IA não reduz custo. Ela reduz atraso.<br />
            Atraso é o imposto invisível que come sua margem — e derruba suas vendas.
          </p>
        </blockquote>

        <p className="font-semibold text-foreground">
          O caminho que funciona (sem hype) é simples:
        </p>
        <p className="text-lg text-primary font-medium">
          Capacitar pessoas + diagnosticar processos + implantar automações.
        </p>
        <p>
          Isso destrava vendas, encurta ciclo, melhora follow-up e devolve tempo mental.
        </p>
      </div>
    ),
  },
};

const BlogPost = () => {
  const { id } = useParams<{ id: string }>();
  const post = id ? blogPosts[id] : undefined;

  if (!post) return <NotFound />;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  return (
    <Layout>
      <article className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Back */}
          <FadeInUp>
            <Link
              to="/blog"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Blog
            </Link>
          </FadeInUp>

          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <FadeInUp>
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                {post.category}
              </span>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold leading-tight mt-4">
                {post.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 mt-6 text-sm text-muted-foreground">
                <span className="flex items-center">
                  <User className="h-4 w-4 mr-1" />
                  {post.author}
                </span>
                <span className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {formatDate(post.date)}
                </span>
                <span className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {post.readTime} de leitura
                </span>
              </div>
            </FadeInUp>

            {/* Image */}
            <FadeInUp delay={0.1}>
              <motion.div
                className="my-10 rounded-2xl overflow-hidden border border-border"
                whileHover={{ scale: 1.01 }}
              >
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-auto object-cover"
                />
              </motion.div>
            </FadeInUp>

            {/* Content */}
            <FadeInUp delay={0.2}>
              <div className="prose prose-invert max-w-none text-muted-foreground leading-relaxed">
                {post.content}
              </div>
            </FadeInUp>

            {/* Author */}
            <FadeInUp delay={0.3}>
              <div className="mt-16 p-6 rounded-2xl bg-card border border-border flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">
                  FG
                </div>
                <div>
                  <p className="font-heading font-semibold">{post.author}</p>
                  <p className="text-sm text-muted-foreground">Amplify</p>
                </div>
              </div>
            </FadeInUp>
          </div>
        </div>
      </article>
    </Layout>
  );
};

export default BlogPost;
