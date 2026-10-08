import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  FileText,
  FolderOpen,
  GraduationCap,
  Menu,
  Search,
  Settings2,
  X,
} from "lucide-react";
import logoAmplify from "@/assets/logo-amplify-branco.png";
import { assetSrc } from "@/lib/assets";
import type { KnowledgeListItem } from "./KnowledgeDirectory";

type Props = {
  items: KnowledgeListItem[];
  activeId?: string;
  isIndex?: boolean;
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

function iconFor(type: string) {
  const icons: Record<string, typeof FileText> = {
    education: GraduationCap,
    glossary: BookOpen,
    method: Settings2,
    portfolio: FolderOpen,
  };
  return icons[type] ?? FileText;
}

function typeLabel(value: string) {
  const labels: Record<string, string> = {
    company: "Empresa",
    education: "Educação",
    glossary: "Glossário",
    method: "Método",
    offering: "Oferta",
    portfolio: "Portfólio",
  };
  return labels[value] ?? value;
}

export default function KnowledgeChrome({ items, activeId, isIndex = false }: Props) {
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const term = normalize(query.trim());
    if (!term) return items.slice(0, 5);
    return items.filter((item) => normalize([item.title, item.description, item.tags.join(" "), item.content].join(" ")).includes(term)).slice(0, 6);
  }, [items, query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const updateQuery = (value: string) => {
    setQuery(value);
    window.dispatchEvent(new CustomEvent("knowledge-query", { detail: value }));
  };

  return (
    <>
      <header className="kb-topbar">
        <a href="/knowledge" className="kb-brand" aria-label="Amplify Knowledge — início">
          <img src={assetSrc(logoAmplify)} alt="Amplify" />
          <span aria-hidden="true" />
          <strong>Knowledge</strong>
        </a>

        <div className={`kb-search-wrap ${searchOpen ? "is-open" : ""}`}>
          <Search aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onFocus={() => setSearchOpen(true)}
            onChange={(event) => updateQuery(event.target.value)}
            placeholder="Buscar na documentação..."
            aria-label="Buscar na documentação"
          />
          <kbd>⌘ K</kbd>
          <button type="button" className="kb-mobile-search-close" onClick={() => setSearchOpen(false)} aria-label="Fechar busca"><X /></button>
          {searchOpen && (
            <div className="kb-search-results" role="dialog" aria-label="Resultados da busca">
              <p>{query ? `${results.length} resultado${results.length === 1 ? "" : "s"}` : "Documentos"}</p>
              {results.length ? results.map((item) => {
                const Icon = iconFor(item.type);
                return (
                  <a key={item.id} href={`/knowledge/${item.id}`}>
                    <Icon aria-hidden="true" />
                    <span><strong>{item.title}</strong><small>{typeLabel(item.type)}</small></span>
                  </a>
                );
              }) : <div className="kb-search-empty">Nenhum documento encontrado.</div>}
              {isIndex && query && <button type="button" className="kb-search-view" onClick={() => setSearchOpen(false)}>Ver resultados na página</button>}
            </div>
          )}
        </div>

        <button type="button" className="kb-search-mobile" onClick={() => { setSearchOpen(true); window.setTimeout(() => inputRef.current?.focus(), 0); }} aria-label="Abrir busca"><Search /></button>
        <button type="button" className="kb-menu-button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Menu /></button>
      </header>

      <aside className="kb-sidebar" aria-label="Documentação">
        <KnowledgeNavigation items={items} activeId={activeId} isIndex={isIndex} />
      </aside>

      {menuOpen && (
        <div className="kb-drawer-layer">
          <button type="button" className="kb-drawer-scrim" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" />
          <aside className="kb-drawer" aria-label="Menu da documentação">
            <div><strong>Documentação</strong><button type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><X /></button></div>
            <KnowledgeNavigation items={items} activeId={activeId} isIndex={isIndex} />
          </aside>
        </div>
      )}
      {searchOpen && <button type="button" className="kb-search-scrim" onClick={() => setSearchOpen(false)} aria-label="Fechar resultados" />}
    </>
  );
}

function KnowledgeNavigation({ items, activeId, isIndex }: Props) {
  return (
    <nav>
      <p>DOCUMENTAÇÃO</p>
      <a className={isIndex ? "is-active" : ""} href="/knowledge"><BookOpen aria-hidden="true" /><span>Visão geral</span></a>
      <p>CONTEÚDO</p>
      {items.map((item) => {
        const Icon = iconFor(item.type);
        return <a key={item.id} className={activeId === item.id ? "is-active" : ""} href={`/knowledge/${item.id}`}><Icon aria-hidden="true" /><span>{item.title}</span></a>;
      })}
    </nav>
  );
}
