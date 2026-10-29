import { SiteDeliveriesTab } from '@/components/admin/ana/SiteDeliveriesTab';
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { ContentTab } from "@/components/admin/ana/ContentTab";
import { EvolutionTab } from "@/components/admin/ana/EvolutionTab";
import { InvitesTab } from "@/components/admin/ana/InvitesTab";
import { OverviewTab } from "@/components/admin/ana/OverviewTab";
import { RecommendationsTab } from "@/components/admin/ana/RecommendationsTab";
import { SessionsTab } from "@/components/admin/ana/SessionsTab";
import { adminGet, errorMessage, type OverviewResponse } from "@/components/admin/ana/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Filters } from "@/lib/ana-zero/admin/types";
import { profileLabel } from "@/lib/ana-zero/lab/profiles";

const ALL = "all";
const TAB_VALUES = ["overview", "sessions", "content", "recommendations", "evolution", "invites", "site"] as const;
type TabValue = (typeof TAB_VALUES)[number];

function isTabValue(value: string | null): value is TabValue {
  return value !== null && TAB_VALUES.includes(value as TabValue);
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  formatOption = (option) => option,
}: {
  label: string;
  value?: string;
  options: string[];
  onChange: (value?: string) => void;
  formatOption?: (option: string) => string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value ?? ALL} onValueChange={(next) => onChange(next === ALL ? undefined : next)}>
        <SelectTrigger className="w-44" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {formatOption(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const AnaCenter = () => {
  const [filters, setFilters] = useState<Filters>({});
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = isTabValue(searchParams.get("tab")) ? searchParams.get("tab") as TabValue : "overview";
  const showsConversationFilters = activeTab !== "recommendations" && activeTab !== "invites" && activeTab !== "site";
  const patch = (next: Partial<Filters>) => setFilters((current) => ({ ...current, ...next }));
  const selectTab = (tab: string) => {
    if (!isTabValue(tab)) return;
    const next = new URLSearchParams(searchParams);
    if (tab === "overview") next.delete("tab");
    else next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  const overview = useQuery({
    queryKey: ["ana-admin", "overview", filters],
    queryFn: () => adminGet<OverviewResponse>("overview", filters),
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Central da Ana</h1>
        <p className="text-sm text-muted-foreground">
          Conversas de teste, avaliações e recomendações para ajustar a Ana.
          {overview.data ? ` Prompt atual: ${overview.data.promptVersion}.` : ""}
        </p>
      </header>

      {showsConversationFilters ? <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="ana-from" className="text-xs text-muted-foreground">
            De
          </Label>
          <Input id="ana-from" type="date" className="w-40" value={filters.from ?? ""} onChange={(e) => patch({ from: e.target.value || undefined })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ana-to" className="text-xs text-muted-foreground">
            Até
          </Label>
          <Input id="ana-to" type="date" className="w-40" value={filters.to ?? ""} onChange={(e) => patch({ to: e.target.value || undefined })} />
        </div>
        <FilterSelect label="Missão" value={filters.mission} options={overview.data?.options.missions ?? []} onChange={(mission) => patch({ mission })} />
        <FilterSelect
          label="Perfil real"
          value={filters.profile}
          options={overview.data?.options.profiles ?? []}
          onChange={(profile) => patch({ profile })}
          formatOption={profileLabel}
        />
        <FilterSelect
          label="Origem da missão"
          value={filters.missionOrigin}
          options={overview.data?.options.missionOrigins ?? []}
          onChange={(missionOrigin) => patch({ missionOrigin })}
          formatOption={(origin) => origin === "recommended" ? "Recomendada" : "Escolhida manualmente"}
        />
        <FilterSelect label="Modelo" value={filters.model} options={overview.data?.options.models ?? []} onChange={(model) => patch({ model })} />
        <FilterSelect
          label="Versão do prompt"
          value={filters.promptVersion}
          options={overview.data?.options.promptVersions ?? []}
          onChange={(promptVersion) => patch({ promptVersion })}
        />
      </div> : null}

      {overview.isError ? <p className="text-sm text-destructive">{errorMessage(overview.error)}</p> : null}

      <Tabs value={activeTab} onValueChange={selectTab}>
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="sessions">Conversas</TabsTrigger>
          <TabsTrigger value="content">Conteúdo</TabsTrigger>
          <TabsTrigger value="recommendations">Recomendações</TabsTrigger>
          <TabsTrigger value="evolution">Evolução</TabsTrigger>
          <TabsTrigger value="invites">Convites</TabsTrigger>
          <TabsTrigger value="site">Site CRIATOWN</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          {overview.data ? <OverviewTab data={overview.data} /> : null}
        </TabsContent>
        <TabsContent value="sessions" className="mt-4">
          <SessionsTab filters={filters} />
        </TabsContent>
        <TabsContent value="content" className="mt-4">
          <ContentTab filters={filters} />
        </TabsContent>
        <TabsContent value="recommendations" className="mt-4">
          <RecommendationsTab />
        </TabsContent>
        <TabsContent value="evolution" className="mt-4">
          <EvolutionTab filters={filters} />
        </TabsContent>
        <TabsContent value="invites" className="mt-4">
          <InvitesTab />
        </TabsContent>
      <TabsContent value="site" className="mt-4"><SiteDeliveriesTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default AnaCenter;
