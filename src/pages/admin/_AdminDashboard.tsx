import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Edit, Trash2, Eye, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Post {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  published: boolean;
  published_at: string | null;
  updated_at: string;
}

const AdminDashboard = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");

  const loadPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blog_posts")
      .select("id, title, slug, category, published, published_at, updated_at")
      .order("updated_at", { ascending: false });
    if (error) {
      toast.error(`Erro ao carregar posts: ${error.message}`);
    } else {
      setPosts(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { loadPosts(); }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Post excluído");
    loadPosts();
  };

  const filtered = posts.filter((p) =>
    filter === "all" ? true : filter === "published" ? p.published : !p.published
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">Posts do Blog</h1>
          <p className="text-sm text-muted-foreground">Gerencie todos os artigos do blog Amplify.</p>
        </div>
        <Button asChild className="glow-cyan">
          <Link to="/admin/posts/new"><Plus className="h-4 w-4 mr-2" />Novo Post</Link>
        </Button>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="all">Todos ({posts.length})</TabsTrigger>
          <TabsTrigger value="published">Publicados ({posts.filter((p) => p.published).length})</TabsTrigger>
          <TabsTrigger value="draft">Rascunhos ({posts.filter((p) => !p.published).length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <p className="text-muted-foreground text-center py-12">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground mb-4">Nenhum post encontrado.</p>
          <Button asChild><Link to="/admin/posts/new">Criar primeiro post</Link></Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((post) => (
            <div key={post.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-card border border-border rounded-lg hover:border-primary/40 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold truncate">{post.title}</h3>
                  {post.published ? (
                    <Badge className="bg-primary/15 text-primary hover:bg-primary/20">Publicado</Badge>
                  ) : (
                    <Badge variant="secondary">Rascunho</Badge>
                  )}
                  {post.category && <Badge variant="outline">{post.category}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-3">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />
                    {new Date(post.published_at ?? post.updated_at).toLocaleDateString("pt-BR")}
                  </span>
                  <span className="truncate">/{post.slug}</span>
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {post.published && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/blog/${post.slug}`} target="_blank"><Eye className="h-4 w-4" /></Link>
                  </Button>
                )}
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/admin/posts/${post.id}/edit`}><Edit className="h-4 w-4" /></Link>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir post?</AlertDialogTitle>
                      <AlertDialogDescription>Esta ação não pode ser desfeita. O post "{post.title}" será removido.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(post.id)} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
