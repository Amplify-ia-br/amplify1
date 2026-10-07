import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Code2,
  Database,
  FileText,
  KeyRound,
  Lock,
  MessageSquare,
  Plug,
  Server,
  ShieldCheck,
  Workflow,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";

type IconCard = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const architectureSteps: IconCard[] = [
  {
    icon: MessageSquare,
    title: "Aplicação de IA",
    description: "O lugar onde a pessoa conversa ou trabalha: ChatGPT, Claude, um IDE ou um agente interno.",
  },
  {
    icon: Plug,
    title: "Cliente MCP",
    description: "A camada que entende o protocolo e conecta a aplicação aos servidores autorizados.",
  },
  {
    icon: Server,
    title: "Servidor MCP",
    description: "O serviço que expõe dados, ferramentas e fluxos de um sistema externo de forma padronizada.",
  },
  {
    icon: Database,
    title: "Sistemas da empresa",
    description: "Arquivos, bancos de dados, CRMs, ERPs, APIs, repositórios, calendários e outros sistemas operacionais.",
  },
];

const capabilities: IconCard[] = [
  {
    icon: Wrench,
    title: "Tools",
    description: "Funções que a IA pode chamar, como consultar um pedido, criar uma tarefa ou rodar uma análise.",
  },
  {
    icon: FileText,
    title: "Resources",
    description: "Contextos e dados que podem ser lidos, como documentos, registros, tabelas ou arquivos.",
  },
  {
    icon: Workflow,
    title: "Prompts",
    description: "Modelos de mensagens e fluxos reutilizáveis para guiar tarefas recorrentes com mais consistência.",
  },
];

const businessCases: IconCard[] = [
  {
    icon: Bot,
    title: "Assistentes internos com contexto real",
    description: "Um agente pode responder usando base de conhecimento, histórico de clientes e políticas internas atualizadas.",
  },
  {
    icon: Code2,
    title: "Menos integrações sob medida",
    description: "Em vez de criar um conector diferente para cada app de IA, a empresa publica um servidor MCP reutilizável.",
  },
  {
    icon: KeyRound,
    title: "Governança mais clara",
    description: "Permissões, escopos e logs podem ser pensados na camada de integração, não espalhados por automações soltas.",
  },
];

const safetyChecks = [
  "Definir quais dados cada servidor MCP pode acessar.",
  "Exigir autenticação, autorização e consentimento para ações sensíveis.",
  "Registrar chamadas, erros e mudanças feitas por ferramentas.",
  "Validar entradas e saídas antes de executar ações irreversíveis.",
  "Tratar descrições de ferramentas e dados externos como conteúdo não confiável.",
];

const misconceptions = [
  "MCP não é um modelo de IA.",
  "MCP não substitui APIs, bancos de dados ou permissões.",
  "MCP não torna uma automação segura por padrão.",
  "MCP não resolve sozinho a qualidade dos dados da empresa.",
];

const Mcp = () => {
  return (
    <Layout>
      <section className="relative overflow-hidden border-b border-border bg-background">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,hsl(var(--background))_0%,hsl(var(--card))_56%,rgba(17,24,39,0.92)_100%)]" />
        <div className="container relative mx-auto grid min-h-[calc(100svh-4rem)] grid-cols-1 items-center gap-12 px-4 py-20 lg:grid-cols-[1fr_0.9fr] lg:py-24">
          <div className="max-w-3xl space-y-8">
            <div className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
              <Plug className="h-4 w-4" />
              Model Context Protocol
            </div>

            <div className="space-y-6">
              <h1 className="text-4xl font-bold leading-tight text-balance md:text-6xl">
                MCP é o padrão que conecta IAs a dados, ferramentas e sistemas.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground md:text-xl">
                Model Context Protocol é um protocolo aberto para que aplicações de IA acessem contexto e executem ações em sistemas externos de forma padronizada, em vez de depender de integrações isoladas para cada ferramenta.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild className="glow-cyan">
                <a href="#como-funciona">
                  Ver como funciona
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild className="border-primary/40">
                <a href="https://modelcontextprotocol.io/docs/2026-07-28/getting-started/intro" target="_blank" rel="noopener noreferrer">
                  Documentação oficial
                </a>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-lg border border-border bg-card/70 p-5 shadow-2xl shadow-black/30 backdrop-blur">
              <div className="mb-5 flex items-center justify-between border-b border-border pb-4">
                <div>
                  <p className="text-sm font-medium text-primary">Fluxo MCP</p>
                  <p className="text-sm text-muted-foreground">Uma interface comum entre IA e sistemas</p>
                </div>
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>

              <div className="space-y-3">
                {architectureSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.title} className="grid grid-cols-[2.5rem_1fr] gap-4 rounded-lg border border-border bg-background/70 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-muted-foreground">0{index + 1}</span>
                          <h2 className="text-base font-semibold">{step.title}</h2>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="bg-card/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase text-primary">Como funciona</p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">O MCP separa a conversa da integração.</h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              A aplicação de IA continua sendo a interface com o usuário. O servidor MCP é quem traduz capacidades de um sistema externo em recursos seguros e chamáveis pela IA.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
            {capabilities.map((capability) => {
              const Icon = capability.icon;
              return (
                <article key={capability.title} className="rounded-lg border border-border bg-card p-6">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold">{capability.title}</h3>
                  <p className="mt-3 leading-7 text-muted-foreground">{capability.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto grid grid-cols-1 gap-12 px-4 lg:grid-cols-[0.85fr_1fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">Por que importa</p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">Para empresas, MCP é infraestrutura de IA aplicada.</h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              O valor aparece quando a organização quer que agentes e copilotos trabalhem com dados internos, sem reinventar a mesma integração em cada canal.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {businessCases.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="grid grid-cols-[3rem_1fr] gap-5 rounded-lg border border-border bg-card p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{item.title}</h3>
                    <p className="mt-2 leading-7 text-muted-foreground">{item.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-card/30 py-20">
        <div className="container mx-auto grid grid-cols-1 gap-8 px-4 lg:grid-cols-2">
          <article className="rounded-lg border border-border bg-card p-6 md:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Lock className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold">Cuidados antes de usar</h2>
            </div>
            <ul className="mt-6 space-y-4">
              {safetyChecks.map((item) => (
                <li key={item} className="flex gap-3 text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-lg border border-border bg-card p-6 md:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-amber-500/10 text-amber-300">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold">O que MCP não é</h2>
            </div>
            <ul className="mt-6 space-y-4">
              {misconceptions.map((item) => (
                <li key={item} className="flex gap-3 text-muted-foreground">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 gap-10 rounded-lg border border-primary/30 bg-primary/10 p-6 md:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase text-primary">Quando considerar MCP</p>
              <h2 className="mt-3 text-3xl font-bold">Quando IA precisa sair do chat e operar com contexto da empresa.</h2>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                MCP faz sentido quando há dados privados, ferramentas internas e processos recorrentes que precisam ser acessados por diferentes assistentes ou agentes com controle de permissão.
              </p>
            </div>
            <Button size="lg" asChild className="glow-cyan">
              <a href="https://wa.me/5511918252109?text=Olá! Quero entender como MCP pode entrar na operação da minha empresa." target="_blank" rel="noopener noreferrer">
                Falar com a Amplify
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </div>

          <div className="mt-10 text-sm leading-7 text-muted-foreground">
            <p>
              Referências:{" "}
              <a className="text-primary hover:underline" href="https://modelcontextprotocol.io/docs/2026-07-28/getting-started/intro" target="_blank" rel="noopener noreferrer">
                introdução oficial ao MCP
              </a>{" "}
              e{" "}
              <a className="text-primary hover:underline" href="https://modelcontextprotocol.io/specification/2026-07-28" target="_blank" rel="noopener noreferrer">
                especificação 2026-07-28 do Model Context Protocol
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Mcp;
