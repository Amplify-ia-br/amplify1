import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, FileText, Filter, FolderOpen, GraduationCap, Settings2, X } from "lucide-react";

export type KnowledgeListItem = {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  tags: string[];
  lastReviewed: string;
  content: string;
};

const ALL = "all";

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

function label(value: string) {
  return ({ approved: "Aprovado", active: "Ativo" } as Record<string, string>)[value] ?? value;
}

function typeLabel(value: string) {
  return ({ company: "Empresa", education: "Educação", glossary: "Glossário", method: "Método", offering: "Oferta", portfolio: "Portfólio" } as Record<string, string>)[value] ?? value;
}

function iconFor(type: string) {
  const icons: Record<string, typeof FileText> = { education: GraduationCap, glossary: BookOpen, method: Settings2, portfolio: FolderOpen };
  return icons[type] ?? FileText;
}

export default function KnowledgeDirectory({ items }: { items: KnowledgeListItem[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState(ALL);
  const [tag, setTag] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => setQuery((event as CustomEvent<string>).detail ?? "");
    window.addEventListener("knowledge-query", handler);
    return () => window.removeEventListener("knowledge-query", handler);
  }, []);

  const types = useMemo(() => [...new Set(items.map((item) => item.type))].sort(), [items]);
  const tags = useMemo(() => [...new Set(items.flatMap((item) => item.tags))].sort(), [items]);
  const statuses = useMemo(() => [...new Set(items.map((item) => item.status))].sort(), [items]);
  const filtered = useMemo(() => {
    const term = normalize(query.trim());
    return items.filter((item) => {
      const haystack = normalize([item.title, item.description, item.type, item.tags.join(" "), item.content].join(" "));
      return (!term || haystack.includes(term)) && (type === ALL || item.type === type) && (tag === ALL || item.tags.includes(tag)) && (status === ALL || item.status === status);
    });
  }, [items, query, status, tag, type]);

  const activeFilters = [type, tag, status].filter((value) => value !== ALL).length;
  const reset = () => { setType(ALL); setTag(ALL); setStatus(ALL); };

  return (
    <section className="kb-directory" aria-label="Documentos da base">
      <div className="kb-directory-toolbar">
        <p aria-live="polite">{filtered.length} {filtered.length === 1 ? "documento" : "documentos"}</p>
        <button type="button" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen}>
          <Filter aria-hidden="true" /> Filtros {activeFilters > 0 && <span>{activeFilters}</span>}
        </button>
      </div>

      {filtersOpen && (
        <div className="kb-filter-panel">
          <FilterSelect label="Tipo" value={type} options={types} onChange={setType} format={typeLabel} />
          <FilterSelect label="Tag" value={tag} options={tags} onChange={setTag} />
          <FilterSelect label="Status" value={status} options={statuses} onChange={setStatus} format={label} />
          {activeFilters > 0 && <button type="button" onClick={reset}><X aria-hidden="true" /> Limpar filtros</button>}
        </div>
      )}

      {filtered.length ? (
        <div className="kb-document-list">
          {filtered.map((item) => {
            const Icon = iconFor(item.type);
            return (
              <article key={item.id}>
                <a href={`/knowledge/${item.id}`}>
                  <span className="kb-document-icon"><Icon aria-hidden="true" /></span>
                  <span className="kb-document-copy">
                    <span className="kb-document-meta"><b>{typeLabel(item.type)}</b><i />{label(item.status)}</span>
                    <strong>{item.title}</strong>
                    <small>{item.description}</small>
                    <span className="kb-document-tags">{item.tags.slice(0, 3).map((itemTag) => <em key={itemTag}>{itemTag}</em>)}</span>
                  </span>
                  <ArrowRight className="kb-document-arrow" aria-hidden="true" />
                </a>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="kb-empty"><BookOpen aria-hidden="true" /><h2>Nenhum documento encontrado</h2><p>Tente outro termo ou limpe os filtros.</p><button type="button" onClick={reset}>Limpar filtros</button></div>
      )}
    </section>
  );
}

function FilterSelect({ label: title, value, options, onChange, format = (value: string) => value }: { label: string; value: string; options: string[]; onChange: (value: string) => void; format?: (value: string) => string }) {
  return <label><span>{title}</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value={ALL}>Todos</option>{options.map((option) => <option key={option} value={option}>{format(option)}</option>)}</select></label>;
}
