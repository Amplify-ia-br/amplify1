import groq from "groq";
import { hasSanityConfig, sanityClient } from "./client";

export interface SanityBlogPostListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category: string | null;
  read_time: string | null;
  published_at: string | null;
}

export interface SanityBlogPostDetail extends SanityBlogPostListItem {
  author_name: string | null;
  content: string;
}

const POSTS_LIST_QUERY = groq`*[_type == "post" && published == true] | order(publishedAt desc) {
  "id": _id,
  title,
  "slug": slug.current,
  excerpt,
  "cover_image_url": coverImage.asset->url,
  category,
  "read_time": readTime,
  "published_at": publishedAt
}`;

const POST_BY_SLUG_QUERY = groq`*[_type == "post" && published == true && slug.current == $slug][0]{
  "id": _id,
  title,
  "slug": slug.current,
  excerpt,
  "cover_image_url": coverImage.asset->url,
  category,
  "read_time": readTime,
  "published_at": publishedAt,
  "author_name": authorName,
  "content": coalesce(contentHtml, "")
}`;

export async function getSanityPosts() {
  if (!hasSanityConfig || !sanityClient) return null;
  const data = await sanityClient.fetch<SanityBlogPostListItem[]>(POSTS_LIST_QUERY);
  return data ?? [];
}

export async function getSanityPostBySlug(slug: string) {
  if (!hasSanityConfig || !sanityClient) return null;
  const data = await sanityClient.fetch<SanityBlogPostDetail | null>(POST_BY_SLUG_QUERY, { slug });
  return data;
}

