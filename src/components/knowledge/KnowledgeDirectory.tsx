import { useMemo, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";

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

type Props = {
  items: KnowledgeListItem[];
};

const ALL = "all";

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

function label(value: string) {
  const labels: Record<string, string> = {
    approved: "Aprovado",
    active: "Ativo",
    review: "Em revisão",
    draft: "Rascunho",
    deprecated: "Descontinuado",
  };

  return labels[value] ?? value;
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

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export default function KnowledgeDirectory({ items }: Props) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState(ALL);
  const [tag, setTag] = useState(ALL);
  const [status, setStatus] = useState(ALL);

  const types = useMemo(() => [...new Set(items.map((item) => item.type))].sort(), [items]);
  const tags = useMemo(() => [...new Set(items.flatMap((item) => item.tags))].sort(), [items]);
  const statuses = useMemo(() => [...new Set(items.map((item) => item.status))].sort(), [items]);

  const filtered = useMemo(() => {
    const term = normalize(query.trim());

    return items.filter((item) => {
      const haystack = normalize(
        [item.title, item.description, item.type, item.tags.join(" "), item.content].join(" "),
      );

      return (
        (!term || haystack.includes(term)) &&
        (type === ALL || item.type === type) &&
        (tag === ALL || item.tags.includes(tag)) &&
        (status === ALL || item.status === status)
      );
    });
  }, [items, query, status, tag, type]);

  const reset = () => {
    setQuery("");
    setType(ALL);
    setTag(ALL);
    setStatus(ALL);
  };

  return (
    <div>
      <section aria-label="Busca e filtros" className="border-y border-border bg-card/40">
        <div className="container mx-auto grid gap-4 px-4 py-6 lg:grid-cols-[minmax(18rem,1fr)_repeat(3,minmax(9rem,0.36fr))]">
          <label className="relative block">
            <span className="sr-only">Buscar na base de conhecimento</span>
            <Search aria-hidden="true" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por tema, termo ou conteúdo"
              className="h-12 w-full rounded-md border border-input bg-background pl-12 pr-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <Filter label="Tipo" value={type} onChange={setType} options={types} format={typeLabel} />
          <Filter label="Tag" value={tag} onChange={setTag} options={tags} />
          <Filter label="Status" value={status} onChange={setStatus} options={statuses} format={label} />
        </div>
      </section>

      <section className="container mx-auto px-4 py-10 md:py-14">
        <div className="mb-6 flex items-center justify-between gap-4 border-b border-border pb-4">
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "documento encontrado" : "documentos encontrados"}
          </p>
          {(query || type !== ALL || tag !== ALL || status !== ALL) && (
            <button type="button" onClick={reset} className="text-sm font-medium text-primary hover:underline">
              Limpar filtros
            </button>
          )}
        </div>

        {filtered.length ? (
          <div className="divide-y divide-border border-y border-border">
            {filtered.map((item) => (
              <article key={item.id} className="group grid gap-5 py-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    <span className="text-primary">{typeLabel(item.type)}</span>
                    <span>{label(item.status)}</span>
                    <span>Revisado em {formatDate(item.lastReviewed)}</span>
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                    <a href={`/knowledge/${item.id}`} className="transition-colors group-hover:text-primary">
                      {item.title}
                    </a>
                  </h2>
                  <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">{item.description}</p>
                  {item.tags.length > 0 && (
                    <ul className="mt-4 flex flex-wrap gap-2" aria-label="Tags">
                      {item.tags.map((itemTag) => (
                        <li key={itemTag} className="rounded border border-border px-2.5 py-1 text-xs text-muted-foreground">
                          {itemTag}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <a
                  href={`/knowledge/${item.id}`}
                  aria-label={`Abrir ${item.title}`}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border text-muted-foreground transition group-hover:border-primary group-hover:text-primary"
                >
                  <ArrowUpRight aria-hidden="true" className="h-5 w-5" />
                </a>
              </article>
            ))}
          </div>
        ) : (
          <div className="border-y border-border py-16 text-center">
            <h2 className="text-2xl font-semibold">Nenhum documento encontrado</h2>
            <p className="mt-3 text-muted-foreground">Tente outro termo ou limpe os filtros.</p>
            <button type="button" onClick={reset} className="mt-6 text-sm font-semibold text-primary hover:underline">
              Limpar busca e filtros
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

type FilterProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  format?: (value: string) => string;
};

function Filter({ label: filterLabel, value, options, onChange, format = (item) => item }: FilterProps) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
      {filterLabel}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 rounded-md border border-input bg-background px-3 text-sm font-medium normal-case tracking-normal text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        <option value={ALL}>Todos</option>
        {options.map((option) => (
          <option key={option} value={option}>{format(option)}</option>
        ))}
      </select>
    </label>
  );
}
