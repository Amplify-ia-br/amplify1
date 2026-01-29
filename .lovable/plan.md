
# 🚀 Plano: Site Amplify - Completo com Área Administrativa

## Visão Geral
Replicar fielmente o site da Amplify conforme o design do Adobe XD, incluindo todas as páginas públicas e uma área administrativa completa para gerenciamento de conteúdo.

---

## 📄 Páginas Públicas

### 1. **Home (Página Inicial)**
- Hero section com título "Transforme dados em inteligência"
- Gradiente escuro com tons de ciano/verde
- CTA "Fale Conosco" e "Vamos transformar sua empresa conosco"
- Personagem/mascote da Amplify no canto inferior direito
- Background com efeito de gradiente suave

### 2. **Sobre**
- Hero com título "Alavancamos sua transformação digital com IA"
- Imagem estilo Matrix com pessoa no trono oferecendo pílulas
- Storytelling sobre a empresa
- Seção sobre valores e missão

### 3. **Cases**
- Hero com título "Onde a Inteligência Artificial transforma empresas"
- Grid de cases de sucesso com imagens
- Cards com logos de clientes (Ford, Globo Business, etc.)
- Cada case com título, descrição e imagem

### 4. **Soluções/Capacitações**
- Hero com título "Aprender, aplicar e transformar com IA"
- Seção "Palestras" com categorias:
  - Presencial
  - Online
  - Híbrida
  - Gravado
- Descrição dos serviços de aprendizado
- Botões de ação para cada tipo

### 5. **Blog**
- Listagem de artigos/posts
- Cards com imagem, título, data e resumo
- Página de leitura do artigo completo

### 6. **Contato**
- Formulário funcional (nome, email, empresa, mensagem)
- Dados salvos no banco de dados
- Integração com calendário para agendamento de reuniões

---

## 🎨 Design System

### Cores
- **Background**: Preto/cinza escuro (#0a0a0a)
- **Primária (Ciano)**: #00CED1 ou similar
- **Texto**: Branco e cinza claro
- **Accent**: Gradiente ciano/verde

### Tipografia
- Títulos grandes em estilo bold/light mix
- Texto em itálico para destaque
- Font clean e moderna

### Componentes
- Botões com borda ciano e hover suave
- Cards com bordas sutis
- Navegação fixa no topo

---

## 👤 Área Administrativa (Admin)

### Dashboard
- Visão geral de mensagens recebidas
- Contadores de cases e posts do blog
- Acesso rápido às principais funções

### Gerenciamento de Cases
- Listar todos os cases
- Adicionar novo case (título, descrição, imagem, cliente)
- Editar e excluir cases existentes

### Gerenciamento de Soluções
- Gerenciar palestras e capacitações
- Editar categorias (Presencial, Online, Híbrida, Gravado)
- Adicionar/remover serviços

### Gerenciamento de Blog
- Criar novos posts com editor de texto
- Publicar/despublicar artigos
- Editar e excluir posts

### Mensagens de Contato
- Listar todas as mensagens recebidas
- Visualizar detalhes de cada mensagem
- Marcar como lida/respondida

### Edição de Textos do Site
- Editar títulos e subtítulos das páginas
- Modificar descrições e CTAs
- Atualizar informações de contato

---

## 🔧 Backend (Lovable Cloud)

### Banco de Dados
- **cases**: id, título, descrição, imagem_url, cliente, ordem, criado_em
- **solutions**: id, tipo, título, descrição, ativo, ordem
- **blog_posts**: id, título, slug, conteúdo, imagem, publicado, criado_em
- **contacts**: id, nome, email, empresa, mensagem, lida, criado_em
- **site_content**: id, chave, valor, página, atualizado_em

### Autenticação
- Login para área administrativa
- Proteção de rotas do admin
- Perfil de administrador

### Integrações
- Formulário de contato funcional
- Integração com Calendly (ou similar) para agendamento

---

## 📱 Responsividade

- Design adaptado para mobile, tablet e desktop
- Menu hambúrguer em dispositivos móveis
- Imagens e layouts flexíveis

---

## 🧭 Navegação

**Menu Principal:**
- Logo Amplify (esquerda)
- Sobre | Cases | Soluções ▼ | Blog
- "Agende uma Reunião" | "Fale Conosco" (botão ciano)

---

## Próximos Passos
1. Configurar Lovable Cloud para banco de dados
2. Implementar páginas públicas com design fiel
3. Criar área administrativa com autenticação
4. Configurar formulários funcionais
5. Integrar calendário para agendamentos
