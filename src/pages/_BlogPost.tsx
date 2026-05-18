import { Link } from "@/lib/astro-router";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Clock, User } from "lucide-react";
import DOMPurify from "dompurify";
import type { SanityBlogPostDetail } from "@/integrations/sanity/blog";
import Layout from "@/components/layout/Layout";
import { FadeInUp } from "@/components/animations/MotionWrapper";
import NotFound from "./_NotFound";

interface BlogPostProps {
  post: SanityBlogPostDetail | null;
}

const BlogPost = ({ post }: BlogPostProps) => {
  if (!post) return <NotFound />;

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : "";

  const sanitized = DOMPurify.sanitize(post.content);

  return (
    <Layout>
      <article className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          <FadeInUp>
            <Link to="/blog" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-8">
              <ArrowLeft className="h-4 w-4 mr-2" />Voltar ao Blog
            </Link>
          </FadeInUp>

          <div className="max-w-3xl mx-auto">
            <FadeInUp>
              {post.category && (
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">{post.category}</span>
              )}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold leading-tight mt-4">
                {post.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 mt-6 text-sm text-muted-foreground">
                {post.author_name && (
                  <span className="flex items-center"><User className="h-4 w-4 mr-1" />{post.author_name}</span>
                )}
                {post.published_at && (
                  <span className="flex items-center"><Calendar className="h-4 w-4 mr-1" />{formatDate(post.published_at)}</span>
                )}
                {post.read_time && (
                  <span className="flex items-center"><Clock className="h-4 w-4 mr-1" />{post.read_time} de leitura</span>
                )}
              </div>
            </FadeInUp>

            {post.cover_image_url && (
              <FadeInUp delay={0.1}>
                <motion.div className="my-10 rounded-2xl overflow-hidden border border-border" whileHover={{ scale: 1.01 }}>
                  <img src={post.cover_image_url} alt={post.title} className="w-full h-auto object-cover" />
                </motion.div>
              </FadeInUp>
            )}

            <FadeInUp delay={0.2}>
              <div
                className="prose prose-invert max-w-none text-muted-foreground leading-relaxed prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:rounded-r-lg prose-blockquote:not-italic"
                dangerouslySetInnerHTML={{ __html: sanitized }}
              />
            </FadeInUp>

            {post.author_name && (
              <FadeInUp delay={0.3}>
                <div className="mt-16 p-6 rounded-2xl bg-card border border-border flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">
                    {post.author_name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                  </div>
                  <div>
                    <p className="font-heading font-semibold">{post.author_name}</p>
                    <p className="text-sm text-muted-foreground">Amplify</p>
                  </div>
                </div>
              </FadeInUp>
            )}
          </div>
        </div>
      </article>
    </Layout>
  );
};

export default BlogPost;
