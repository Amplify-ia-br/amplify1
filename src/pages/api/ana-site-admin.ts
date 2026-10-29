import type { APIRoute } from 'astro';
import { handleSiteAdmin } from '../../lib/ana-site/admin.js';
export const prerender=false;
export const ALL:APIRoute=({request})=>handleSiteAdmin(request);
