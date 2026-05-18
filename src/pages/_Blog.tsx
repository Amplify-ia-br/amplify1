import { useEffect, useState } from "react";
import { Link } from "@/lib/astro-router";
import { motion } from "framer-motion";
import { Calendar, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSanityPosts } from "@/integrations/sanity/blog";
import Layout from "@/components/layout/Layout";
import { FadeInUp, ScaleIn } from "@/components/animations/MotionWrapper";
import { Button } from "@/components/ui/button";

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category: string | null;
  read_time: string | null;
  published_at: string | null;
}

const Blog = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const sanityPosts = await getSanityPosts();
        if (sanityPosts) {
          setPosts(sanityPosts);
          return;
        }

        const { data } = await supabase
          .from("blog_posts")
          .select("id, title, slug, excerpt, cover_image_url, category, read_time, published_at")
          .eq("published", true)
          .order("published_at", { ascending: false });
        setPosts(data ?? []);
      } catch (_error) {
        // Keep UI responsive even if CMS request fails.
        setPosts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "";

  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <Layout>
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
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Insights, tendências e conhecimento sobre Inteligência Artificial e transformação digital
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : posts.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">Nenhum post publicado ainda.</p>
          ) : (
            <>
              {featured && (
                <ScaleIn className="mb-16">
                  <Link
                    to={`/blog/${featured.slug}`}
                    className="group grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300"
                  >
                    <motion.div className="aspect-video rounded-xl overflow-hidden bg-muted" whileHover={{ scale: 1.02 }}>
                      {featured.cover_image_url && (
                        <img src={featured.cover_image_url} alt={featured.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      )}
                    </motion.div>
                    <div className="flex flex-col justify-center space-y-4">
                      {featured.category && (
                        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm w-fit">{featured.category}</span>
                      )}
                      <h2 className="text-2xl md:text-3xl font-heading font-bold group-hover:text-primary transition-colors">{featured.title}</h2>
                      {featured.excerpt && <p className="text-muted-foreground">{featured.excerpt}</p>}
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center"><Calendar className="h-4 w-4 mr-1" />{formatDate(featured.published_at)}</span>
                        {featured.read_time && <span className="flex items-center"><Clock className="h-4 w-4 mr-1" />{featured.read_time}</span>}
                      </div>
                    </div>
                  </Link>
                </ScaleIn>
              )}

              {rest.length > 0 && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rest.map((post) => (
                    <Link
                      key={post.id}
                      to={`/blog/${post.slug}`}
                      className="group flex flex-col rounded-2xl bg-card border border-border hover:border-primary/50 transition-all overflow-hidden"
                    >
                      {post.cover_image_url && (
                        <div className="aspect-video overflow-hidden bg-muted">
                          <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                      )}
                      <div className="p-5 space-y-3 flex-1 flex flex-col">
                        {post.category && (
                          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs w-fit">{post.category}</span>
                        )}
                        <h3 className="font-heading font-bold group-hover:text-primary transition-colors">{post.title}</h3>
                        {post.excerpt && <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto pt-2">
                          <span className="flex items-center"><Calendar className="h-3 w-3 mr-1" />{formatDate(post.published_at)}</span>
                          {post.read_time && <span className="flex items-center"><Clock className="h-3 w-3 mr-1" />{post.read_time}</span>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <FadeInUp className="max-w-2xl mx-auto text-center space-y-6">
            <h2 className="text-3xl font-heading font-bold">
              Receba nossos <span className="gradient-text">insights</span>
            </h2>
            <p className="text-muted-foreground">
              Cadastre-se para receber as últimas novidades sobre IA diretamente no seu email
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="seu@email.com"
                className="flex-1 px-4 py-3 rounded-lg bg-background border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
              <Button className="glow-cyan w-full sm:w-auto">Inscrever-se</Button>
            </div>
          </FadeInUp>
        </div>
      </section>
    </Layout>
  );
};

export default Blog;
