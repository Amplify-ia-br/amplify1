import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Linkedin, Instagram, Youtube } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo e Descrição */}
          <div className="space-y-4">
            <Link to="/" className="inline-block">
              <span className="text-2xl font-heading font-bold gradient-text">
                Amplify
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Transformando dados em inteligência para impulsionar sua empresa com IA.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="YouTube"
              >
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Links Rápidos */}
          <div>
            <h3 className="font-heading font-semibold mb-4">Links Rápidos</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/sobre" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Sobre
                </Link>
              </li>
              <li>
                <Link to="/cases" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Cases
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/contato" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Contato
                </Link>
              </li>
            </ul>
          </div>

          {/* Soluções */}
          <div>
            <h3 className="font-heading font-semibold mb-4">Soluções</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/solucoes/palestras" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Palestras
                </Link>
              </li>
              <li>
                <Link to="/solucoes/capacitacoes" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Capacitações
                </Link>
              </li>
              <li>
                <Link to="/solucoes/consultoria" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Consultoria
                </Link>
              </li>
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h3 className="font-heading font-semibold mb-4">Contato</h3>
            <ul className="space-y-3">
              <li className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 text-primary" />
                <span>contato@amplify.com.br</span>
              </li>
              <li className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 text-primary" />
                <span>+55 (11) 99999-9999</span>
              </li>
              <li className="flex items-start space-x-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary mt-0.5" />
                <span>São Paulo, SP - Brasil</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Amplify. Todos os direitos reservados.
            </p>
            <div className="flex space-x-6">
              <Link to="/privacidade" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Política de Privacidade
              </Link>
              <Link to="/termos" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Termos de Uso
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
