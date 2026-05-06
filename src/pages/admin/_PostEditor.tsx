import { Suspense, lazy, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, Loader2, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { slugify } from "@/lib/slugify";
import ImageUpload from "@/components/admin/ImageUpload";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const postSchema = z.object({
  title: z.string().trim().min(3, "Título precisa ter pelo menos 3 caracteres").max(200),
  slug: z.string().trim().min(3, "Slug inválido").max(120).regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífens"),
  excerpt: z.string().max(500).optional(),
  category: z.string().max(50).optional(),
  read_time: z.string().max(20).optional(),
  author_name: z.string().max(100).optional(),
  content: z.string().min(10, "Conteúdo muito curto"),
});

const RichTextEditor = lazy(() => import("@/components/admin/RichTextEditor"));
const EditorFallback = () => (
  <div className="min-h-[220px] rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
    Carregando editor...
  </div>
);

const PostEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = !id || id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("");
  const [readTime, setReadTime] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(false);

  useEffect(() => {
    if (isNew) {
      setAuthorName(user?.user_metadata?.full_name ?? user?.email ?? "");
      return;
    }
    (async () => {
      const { data, error } = await supabase.from("blog_posts").select("*").eq("id", id).maybeSingle();
      if (error || !data) {
        toast.error("Post não encontrado");
        navigate("/admin");
        return;
      }
      setTitle(data.title);
      setSlug(data.slug);
      setSlugTouched(true);
      setExcerpt(data.excerpt ?? "");
      setCategory(data.category ?? "");
      setReadTime(data.read_time ?? "");
      setAuthorName(data.author_name ?? "");
      setCoverImage(data.cover_image_url);
      setContent(data.content ?? "");
      setPublished(data.published);
      setLoading(false);
    })();
  }, [id, isNew, navigate, user]);

  useEffect(() => {
    if (!slugTouched && title) setSlug(slugify(title));
  }, [title, slugTouched]);

  const handleSave = async (publishNow?: boolean) => {
    const finalPublished = publishNow ?? published;
    const parsed = postSchema.safeParse({
      title, slug, excerpt, category, read_time: readTime, author_name: authorName, content,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setSaving(true);
    const payload = {
      title: parsed.data.title,
      slug: parsed.data.slug,
      excerpt: parsed.data.excerpt || null,
      category: parsed.data.category || null,
      read_time: parsed.data.read_time || null,
      author_name: parsed.data.author_name || null,
      content: parsed.data.content,
      cover_image_url: coverImage,
      published: finalPublished,
      published_at: finalPublished ? (new Date().toISOString()) : null,
      author_id: user?.id ?? null,
    };

    if (isNew) {
      const { data, error } = await supabase.from("blog_posts").insert(payload).select("id").single();
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success(finalPublished ? "Post publicado!" : "Rascunho salvo!");
      navigate(`/admin/posts/${data.id}/edit`, { replace: true });
    } else {
      // Preserve existing published_at when already published
      if (finalPublished) {
        const { data: existing } = await supabase.from("blog_posts").select("published, published_at").eq("id", id).single();
        if (existing?.published && existing.published_at) {
          payload.published_at = existing.published_at;
        }
      }
      const { error } = await supabase.from("blog_posts").update(payload).eq("id", id!);
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      setPublished(finalPublished);
      toast.success("Post salvo!");
    }
  };

  const handleDelete = async () => {
    if (isNew) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", id!);
    if (error) { toast.error(error.message); return; }
    toast.success("Post excluído");
    navigate("/admin");
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" asChild>
          <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Link>
        </Button>
        <div className="flex items-center gap-2">
          {!isNew && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir post?</AlertDialogTitle>
                  <AlertDialogDescription>Esta ação é permanente.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar rascunho
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving} className="glow-cyan">
            {published ? "Atualizar publicação" : "Publicar"}
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Título *</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Como a IA transforma vendas" className="text-lg" />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (URL) *</Label>
            <Input id="slug" value={slug} onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }} />
            <p className="text-xs text-muted-foreground">/blog/{slug || "exemplo-slug"}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Estratégia" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="author">Autor</Label>
            <Input id="author" value={authorName} onChange={(e) => setAuthorName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="readtime">Tempo de leitura</Label>
            <Input id="readtime" value={readTime} onChange={(e) => setReadTime(e.target.value)} placeholder="4 min" />
          </div>
        </div>

        <ImageUpload value={coverImage} onChange={setCoverImage} />

        <div className="space-y-2">
          <Label htmlFor="excerpt">Resumo</Label>
          <Textarea id="excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={3} placeholder="Breve resumo que aparece na listagem do blog" />
        </div>

        <div className="space-y-2">
          <Label>Conteúdo *</Label>
          <Suspense fallback={<EditorFallback />}>
            <RichTextEditor value={content} onChange={setContent} />
          </Suspense>
        </div>

        <div className="flex items-center justify-between p-4 bg-muted/40 rounded-lg">
          <div>
            <Label htmlFor="published" className="text-base">Publicado</Label>
            <p className="text-sm text-muted-foreground">Quando ativo, o post aparece no blog público.</p>
          </div>
          <Switch id="published" checked={published} onCheckedChange={setPublished} />
        </div>
      </div>
    </div>
  );
};

export default PostEditor;
