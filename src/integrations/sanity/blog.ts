import groq from "groq";
import { hasSanityConfig, sanityClient } from "./client";

export interface SanityBlogPostListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  category: string | null;
  readTime: string | null;
  publishedAt: string | null;
}

export interface SanityBlogPostDetail extends SanityBlogPostListItem {
  authorName: string | null;
  content: string;
}

const POSTS_LIST_QUERY = groq`*[_type == "post" && published == true] | order(publishedAt desc) {
  "id": _id,
  title,
  "slug": slug.current,
  excerpt,
  "coverImage": coverImage.asset->url,
  category,
  "readTime": readTime,
  "publishedAt": publishedAt
}`;

const POST_BY_SLUG_QUERY = groq`*[_type == "post" && published == true && slug.current == $slug][0]{
  "id": _id,
  title,
  "slug": slug.current,
  excerpt,
  "coverImage": coverImage.asset->url,
  category,
  "readTime": readTime,
  "publishedAt": publishedAt,
  "authorName": authorName,
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
