import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown } from "lucide-react";
import logoAmplify from "@/assets/logo-amplify-branco.png";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { name: "Sobre", path: "/sobre" },
    { name: "Cases", path: "/cases" },
  ];

  const navLinksAfter = [
    { name: "Agenda", path: "/agenda" },
  ];

  const conteudoLinks = [
    { name: "Aprenda", path: "/aprenda" },
    { name: "Blog", path: "/blog" },
  ];

  const solucoesLinks = [
    { name: "Capacitação", path: "/solucoes/capacitacoes" },
    { name: "Serviços e Consultoria", path: "/solucoes/servicos-consultoria" },
    { name: "Comunidades", path: "/solucoes/comunidades" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img 
              src={logoAmplify} 
              alt="Amplify" 
              className="h-8 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  isActive(link.path) ? "text-primary" : "text-muted-foreground"
                )}
              >
                {link.name}
              </Link>
            ))}

            {/* Soluções Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex items-center text-sm font-medium transition-colors hover:text-primary",
                    location.pathname.startsWith("/solucoes")
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  Soluções
                  <ChevronDown className="ml-1 h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="bg-card border-border">
                {solucoesLinks.map((link) => (
                  <DropdownMenuItem key={link.path} asChild>
                    <Link to={link.path} className="cursor-pointer">
                      {link.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          {/* Links after Soluções */}
            {navLinksAfter.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  isActive(link.path) ? "text-primary" : "text-muted-foreground"
                )}
              >
                {link.name}
              </Link>
            ))}

            {/* Conteúdo Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex items-center text-sm font-medium transition-colors hover:text-primary",
                    location.pathname === "/blog" || location.pathname === "/aprenda"
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  Conteúdo
                  <ChevronDown className="ml-1 h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="bg-card border-border">
                {conteudoLinks.map((link) => (
                  <DropdownMenuItem key={link.path} asChild>
                    <Link to={link.path} className="cursor-pointer">
                      {link.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Club */}
            <Link
              to="/solucoes/comunidades"
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                isActive("/solucoes/comunidades") ? "text-primary" : "text-muted-foreground"
              )}
            >
              Club
            </Link>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <Button asChild className="glow-cyan">
              <a href="https://wa.me/5511918252109?text=Olá! Gostaria de falar com um especialista." target="_blank" rel="noopener noreferrer">Fale com o Especialista</a>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-foreground"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 space-y-4 animate-fade-in">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "block text-sm font-medium transition-colors hover:text-primary",
                  isActive(link.path) ? "text-primary" : "text-muted-foreground"
                )}
              >
                {link.name}
              </Link>
            ))}

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Soluções</p>
              {solucoesLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className="block pl-4 text-sm text-muted-foreground hover:text-primary"
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {navLinksAfter.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "block text-sm font-medium transition-colors hover:text-primary",
                  isActive(link.path) ? "text-primary" : "text-muted-foreground"
                )}
              >
                {link.name}
              </Link>
            ))}

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Conteúdo</p>
              {conteudoLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className="block pl-4 text-sm text-muted-foreground hover:text-primary"
                >
                  {link.name}
                </Link>
              ))}
            </div>

            <Link
              to="/solucoes/comunidades"
              onClick={() => setIsOpen(false)}
              className={cn(
                "block text-sm font-medium transition-colors hover:text-primary",
                isActive("/solucoes/comunidades") ? "text-primary" : "text-muted-foreground"
              )}
            >
              Club
            </Link>

            <div className="pt-4 space-y-2">
              <Button asChild className="w-full">
                <a href="https://wa.me/5511918252109?text=Olá! Gostaria de falar com um especialista." target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)}>
                  Fale com o Especialista
                </a>
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
