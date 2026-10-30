import type { APIRoute } from 'astro';
import { handleAnaSite } from '../../lib/ana-site/http.js';
import { fileKnowledgeService } from '../../lib/okf/file-service.js';
export const prerender=false;
export const ALL:APIRoute=({request})=>handleAnaSite(request,fileKnowledgeService);
