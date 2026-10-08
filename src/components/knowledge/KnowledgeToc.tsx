import { useEffect, useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";

type Heading = { depth: number; slug: string; text: string };

export default function KnowledgeToc({ headings }: { headings: Heading[] }) {
  const visible = useMemo(() => headings.filter((heading) => heading.depth === 2 || heading.depth === 3), [headings]);
  const [active, setActive] = useState(visible[0]?.slug ?? "");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    const nodes = visible.map((heading) => document.getElementById(heading.slug)).filter(Boolean) as HTMLElement[];
    if (!nodes.length) return;
    const observer = new IntersectionObserver((entries) => {
      const current = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (current?.target.id) setActive(current.target.id);
    }, { rootMargin: "-16% 0px -70% 0px" });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [visible]);

  const copy = async (slug: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${slug}`;
    await navigator.clipboard.writeText(url);
    history.replaceState(null, "", `#${slug}`);
    setCopied(slug);
    window.setTimeout(() => setCopied(""), 1600);
  };

  if (!visible.length) return null;
  return (
    <nav className="kb-toc" aria-label="Nesta página">
      <strong>Nesta página</strong>
      <ul>{visible.map((heading) => (
        <li key={heading.slug} className={heading.depth === 3 ? "is-child" : ""}>
          <a className={active === heading.slug ? "is-active" : ""} href={`#${heading.slug}`}>{heading.text}</a>
          <button type="button" onClick={() => copy(heading.slug)} aria-label={`Copiar link para ${heading.text}`}>
            {copied === heading.slug ? <Check /> : <Copy />}
          </button>
        </li>
      ))}</ul>
    </nav>
  );
}
