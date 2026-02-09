import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Sobre from "./pages/Sobre";
import Cases from "./pages/Cases";
import Solucoes from "./pages/Solucoes";
import ServicosConsultoria from "./pages/ServicosConsultoria";
import Capacitacoes from "./pages/Capacitacoes";
import Comunidades from "./pages/Comunidades";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Contato from "./pages/Contato";
import Privacidade from "./pages/Privacidade";
import Termos from "./pages/Termos";
import FounderFernando from "./pages/FounderFernando";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/sobre" element={<Sobre />} />
          <Route path="/cases" element={<Cases />} />
          <Route path="/solucoes" element={<Solucoes />} />
          <Route path="/solucoes/capacitacoes" element={<Capacitacoes />} />
          <Route path="/solucoes/servicos-consultoria" element={<ServicosConsultoria />} />
          <Route path="/solucoes/comunidades" element={<Comunidades />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:id" element={<BlogPost />} />
          <Route path="/contato" element={<Contato />} />
          <Route path="/agendar" element={<Contato />} />
          <Route path="/privacidade" element={<Privacidade />} />
          <Route path="/termos" element={<Termos />} />
          <Route path="/founders/fernando-godoy" element={<FounderFernando />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
