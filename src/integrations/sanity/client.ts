import { createClient } from "@sanity/client";

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID || "1jj2oia3";
const dataset = import.meta.env.PUBLIC_SANITY_DATASET || "production";
const apiVersion = import.meta.env.PUBLIC_SANITY_API_VERSION || "2025-01-01";
const token = import.meta.env.SANITY_API_READ_TOKEN || import.meta.env.SANITY_API_WRITE_TOKEN;

export const hasSanityConfig = Boolean(projectId && dataset);

export const sanityClient = hasSanityConfig
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      token: token || undefined,
      useCdn: !token,
      perspective: "published",
    })
  : null;
