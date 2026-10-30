import { handleAnaSite } from '../src/lib/ana-site/http.js';
import { fileKnowledgeService } from '../src/lib/okf/file-service.js';
export const POST=(request:Request)=>handleAnaSite(request,fileKnowledgeService);
export const GET=POST;
