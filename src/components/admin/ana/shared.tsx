import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Kpi({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function Panel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function RankList({
  items,
  empty = "Sem dados ainda.",
  format,
}: {
  items: Array<{ name: string; total: number }>;
  empty?: string;
  format?: (name: string) => string;
}) {
  if (!items.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  const max = Math.max(...items.map((item) => item.total));
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.name} className="text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate">{format ? format(item.name) : item.name}</span>
            <span className="tabular-nums text-muted-foreground">{item.total}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(item.total / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{children}</p>;
}
