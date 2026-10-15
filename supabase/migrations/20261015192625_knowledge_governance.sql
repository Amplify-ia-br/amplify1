create schema if not exists private;

do $$ begin
  create type public.knowledge_area_role as enum ('owner', 'editor');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.knowledge_revision_status as enum (
    'draft', 'review', 'changes_requested', 'approved', 'publishing', 'published', 'rejected'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.knowledge_annotation_kind as enum ('like', 'comment', 'suggestion');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.knowledge_annotation_status as enum ('open', 'accepted', 'rejected', 'resolved', 'orphaned');
exception when duplicate_object then null;
end $$;

create table if not exists public.knowledge_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_areas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 120),
  description text not null default '',
  owner_key text not null check (owner_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  default_visibility text not null default 'internal' check (default_visibility in ('public', 'internal', 'restricted')),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_area_members (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.knowledge_areas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.knowledge_area_role not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (area_id, user_id, role)
);

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  okf_id text not null unique check (okf_id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 2 and 200),
  description text not null default '',
  area_id uuid not null references public.knowledge_areas(id) on delete restrict,
  owner_key text not null,
  reviewer_key text,
  document_type text not null default 'reference',
  visibility text not null default 'internal' check (visibility in ('public', 'internal', 'restricted')),
  status text not null default 'draft' check (status in ('draft', 'review', 'approved', 'active', 'deprecated')),
  source_of_truth boolean not null default true,
  tags text[] not null default '{}',
  published_revision_id uuid,
  published_commit_sha text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_revisions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  revision_number integer not null check (revision_number > 0),
  content_markdown text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  change_summary text not null default '',
  status public.knowledge_revision_status not null default 'draft',
  author_id uuid not null references auth.users(id) on delete restrict,
  submitted_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, revision_number)
);

alter table public.knowledge_documents
  drop constraint if exists knowledge_documents_published_revision_id_fkey;
alter table public.knowledge_documents
  add constraint knowledge_documents_published_revision_id_fkey
  foreign key (published_revision_id) references public.knowledge_revisions(id) on delete set null;

create table if not exists public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  provider text not null default 'google_docs' check (provider = 'google_docs'),
  external_id text not null,
  source_url text not null,
  source_revision text,
  source_modified_at timestamptz,
  content_checksum text,
  sync_status text not null default 'current' check (sync_status in ('current', 'changed', 'access_lost', 'detached')),
  connected_by uuid not null references auth.users(id) on delete restrict,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_id, document_id)
);

create table if not exists public.knowledge_annotations (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  revision_id uuid references public.knowledge_revisions(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind public.knowledge_annotation_kind not null,
  exact_quote text not null check (char_length(exact_quote) between 1 and 4000),
  prefix_text text not null default '',
  suffix_text text not null default '',
  heading text,
  body text,
  suggested_text text,
  status public.knowledge_annotation_status not null default 'open',
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind <> 'suggestion' or suggested_text is not null),
  check (kind = 'like' or body is not null)
);

create unique index if not exists knowledge_like_once
  on public.knowledge_annotations(document_id, revision_id, user_id, exact_quote)
  where kind = 'like';

create table if not exists public.knowledge_audit_events (
  id bigint generated always as identity primary key,
  document_id uuid references public.knowledge_documents(id) on delete set null,
  revision_id uuid references public.knowledge_revisions(id) on delete set null,
  area_id uuid references public.knowledge_areas(id) on delete set null,
  actor_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists knowledge_documents_area_idx on public.knowledge_documents(area_id, status);
create index if not exists knowledge_revisions_document_idx on public.knowledge_revisions(document_id, revision_number desc);
create index if not exists knowledge_sources_document_idx on public.knowledge_sources(document_id, sync_status);
create index if not exists knowledge_annotations_document_idx on public.knowledge_annotations(document_id, status, created_at desc);
create index if not exists knowledge_audit_document_idx on public.knowledge_audit_events(document_id, created_at desc);

create or replace function private.knowledge_is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.knowledge_admins where user_id = _user_id
  ) or public.has_role(_user_id, 'admin'::public.app_role)
$$;

create or replace function private.knowledge_has_area_role(
  _user_id uuid,
  _area_id uuid,
  _roles public.knowledge_area_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.knowledge_is_admin(_user_id) or exists (
    select 1
    from public.knowledge_area_members
    where user_id = _user_id
      and area_id = _area_id
      and role = any(_roles)
  )
$$;

revoke all on function private.knowledge_is_admin(uuid) from public, anon;
revoke all on function private.knowledge_has_area_role(uuid, uuid, public.knowledge_area_role[]) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.knowledge_is_admin(uuid) to authenticated;
grant execute on function private.knowledge_has_area_role(uuid, uuid, public.knowledge_area_role[]) to authenticated;

alter table public.knowledge_admins enable row level security;
alter table public.knowledge_areas enable row level security;
alter table public.knowledge_area_members enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_revisions enable row level security;
alter table public.knowledge_sources enable row level security;
alter table public.knowledge_annotations enable row level security;
alter table public.knowledge_audit_events enable row level security;

revoke all on public.knowledge_admins, public.knowledge_areas, public.knowledge_area_members,
  public.knowledge_documents, public.knowledge_revisions, public.knowledge_sources,
  public.knowledge_annotations, public.knowledge_audit_events from anon, authenticated;

grant select, insert, delete on public.knowledge_admins to authenticated;
grant select, insert, update, delete on public.knowledge_areas to authenticated;
grant select, insert, update, delete on public.knowledge_area_members to authenticated;
grant select, insert, update, delete on public.knowledge_documents to authenticated;
grant select, insert, update, delete on public.knowledge_revisions to authenticated;
grant select, insert, update, delete on public.knowledge_sources to authenticated;
grant select, insert, update, delete on public.knowledge_annotations to authenticated;
grant select, insert on public.knowledge_audit_events to authenticated;
grant usage, select on sequence public.knowledge_audit_events_id_seq to authenticated;

create policy "Knowledge admins can view administrators" on public.knowledge_admins
  for select to authenticated
  using (user_id = (select auth.uid()) or private.knowledge_is_admin((select auth.uid())));
create policy "Knowledge admins can add administrators" on public.knowledge_admins
  for insert to authenticated
  with check (private.knowledge_is_admin((select auth.uid())));
create policy "Knowledge admins can remove administrators" on public.knowledge_admins
  for delete to authenticated
  using (private.knowledge_is_admin((select auth.uid())) and user_id <> (select auth.uid()));

create policy "Authenticated users can view active knowledge areas" on public.knowledge_areas
  for select to authenticated using (active or private.knowledge_is_admin((select auth.uid())));
create policy "Knowledge admins can create areas" on public.knowledge_areas
  for insert to authenticated with check (private.knowledge_is_admin((select auth.uid())));
create policy "Knowledge admins can update areas" on public.knowledge_areas
  for update to authenticated
  using (private.knowledge_is_admin((select auth.uid())))
  with check (private.knowledge_is_admin((select auth.uid())));
create policy "Knowledge admins can delete areas" on public.knowledge_areas
  for delete to authenticated using (private.knowledge_is_admin((select auth.uid())));

create policy "Authenticated users can view area memberships" on public.knowledge_area_members
  for select to authenticated using (true);
create policy "Knowledge admins can create area memberships" on public.knowledge_area_members
  for insert to authenticated with check (private.knowledge_is_admin((select auth.uid())));
create policy "Knowledge admins can update area memberships" on public.knowledge_area_members
  for update to authenticated
  using (private.knowledge_is_admin((select auth.uid())))
  with check (private.knowledge_is_admin((select auth.uid())));
create policy "Knowledge admins can delete area memberships" on public.knowledge_area_members
  for delete to authenticated using (private.knowledge_is_admin((select auth.uid())));

create policy "Users can view accessible knowledge documents" on public.knowledge_documents
  for select to authenticated using (
    created_by = (select auth.uid())
    or private.knowledge_has_area_role((select auth.uid()), area_id, array['owner','editor']::public.knowledge_area_role[])
    or (status in ('approved', 'active') and visibility in ('public', 'internal'))
  );
create policy "Contributors can create knowledge documents" on public.knowledge_documents
  for insert to authenticated with check (
    (created_by = (select auth.uid()) and status = 'draft')
    or private.knowledge_is_admin((select auth.uid()))
  );
create policy "Authors and area staff can update knowledge documents" on public.knowledge_documents
  for update to authenticated
  using (
    (created_by = (select auth.uid()) and status = 'draft')
    or private.knowledge_has_area_role((select auth.uid()), area_id, array['owner','editor']::public.knowledge_area_role[])
  )
  with check (
    (created_by = (select auth.uid()) and status in ('draft', 'review'))
    or private.knowledge_has_area_role((select auth.uid()), area_id, array['owner','editor']::public.knowledge_area_role[])
  );
create policy "Authors and area owners can delete draft documents" on public.knowledge_documents
  for delete to authenticated using (
    (created_by = (select auth.uid()) and status = 'draft')
    or private.knowledge_has_area_role((select auth.uid()), area_id, array['owner']::public.knowledge_area_role[])
  );

create policy "Users can view accessible revisions" on public.knowledge_revisions
  for select to authenticated using (
    author_id = (select auth.uid())
    or exists (
      select 1 from public.knowledge_documents d
      where d.id = document_id and (
        private.knowledge_has_area_role((select auth.uid()), d.area_id, array['owner','editor']::public.knowledge_area_role[])
        or (public.knowledge_revisions.status = 'published' and d.visibility in ('public', 'internal'))
      )
    )
  );
create policy "Contributors can create revisions" on public.knowledge_revisions
  for insert to authenticated with check (
    (author_id = (select auth.uid()) and status = 'draft')
    and exists (select 1 from public.knowledge_documents d where d.id = document_id)
    or exists (
      select 1 from public.knowledge_documents d
      where d.id = document_id
        and private.knowledge_has_area_role((select auth.uid()), d.area_id, array['owner','editor']::public.knowledge_area_role[])
    )
  );
create policy "Authors and area staff can update revisions" on public.knowledge_revisions
  for update to authenticated
  using (
    (author_id = (select auth.uid()) and status in ('draft', 'changes_requested'))
    or exists (
      select 1 from public.knowledge_documents d
      where d.id = document_id
        and private.knowledge_has_area_role((select auth.uid()), d.area_id, array['owner','editor']::public.knowledge_area_role[])
    )
  )
  with check (
    (author_id = (select auth.uid()) and status in ('draft', 'review'))
    or exists (
      select 1 from public.knowledge_documents d
      where d.id = document_id
        and private.knowledge_has_area_role((select auth.uid()), d.area_id, array['owner','editor']::public.knowledge_area_role[])
    )
  );
create policy "Authors and area owners can delete draft revisions" on public.knowledge_revisions
  for delete to authenticated using (
    (author_id = (select auth.uid()) and status = 'draft')
    or exists (
      select 1 from public.knowledge_documents d
      where d.id = document_id
        and private.knowledge_has_area_role((select auth.uid()), d.area_id, array['owner']::public.knowledge_area_role[])
    )
  );

create policy "Document participants can view sources" on public.knowledge_sources
  for select to authenticated using (
    connected_by = (select auth.uid())
    or exists (
      select 1 from public.knowledge_documents d
      where d.id = document_id
        and private.knowledge_has_area_role((select auth.uid()), d.area_id, array['owner','editor']::public.knowledge_area_role[])
    )
  );
create policy "Contributors can connect sources" on public.knowledge_sources
  for insert to authenticated with check (
    connected_by = (select auth.uid())
    and exists (
      select 1 from public.knowledge_documents d
      where d.id = document_id and (
        d.created_by = (select auth.uid())
        or private.knowledge_has_area_role((select auth.uid()), d.area_id, array['owner','editor']::public.knowledge_area_role[])
      )
    )
  );
create policy "Source owners and area staff can update sources" on public.knowledge_sources
  for update to authenticated
  using (
    connected_by = (select auth.uid())
    or exists (
      select 1 from public.knowledge_documents d
      where d.id = document_id
        and private.knowledge_has_area_role((select auth.uid()), d.area_id, array['owner','editor']::public.knowledge_area_role[])
    )
  )
  with check (
    (connected_by = (select auth.uid()) and exists (
      select 1 from public.knowledge_documents d
      where d.id = document_id and d.created_by = (select auth.uid())
    ))
    or exists (
      select 1 from public.knowledge_documents d
      where d.id = document_id
        and private.knowledge_has_area_role((select auth.uid()), d.area_id, array['owner','editor']::public.knowledge_area_role[])
    )
  );
create policy "Source owners and area owners can delete sources" on public.knowledge_sources
  for delete to authenticated using (
    connected_by = (select auth.uid())
    or exists (
      select 1 from public.knowledge_documents d
      where d.id = document_id
        and private.knowledge_has_area_role((select auth.uid()), d.area_id, array['owner']::public.knowledge_area_role[])
    )
  );

create policy "Authenticated readers can view document annotations" on public.knowledge_annotations
  for select to authenticated using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.knowledge_documents d
      where d.id = document_id and (
        (d.status in ('approved', 'active') and d.visibility in ('public', 'internal'))
        or private.knowledge_has_area_role((select auth.uid()), d.area_id, array['owner','editor']::public.knowledge_area_role[])
      )
    )
  );
create policy "Authenticated readers can annotate accessible documents" on public.knowledge_annotations
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.knowledge_documents d
      where d.id = document_id and d.status in ('approved', 'active') and d.visibility in ('public', 'internal')
    )
  );
create policy "Annotation authors and area staff can update annotations" on public.knowledge_annotations
  for update to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.knowledge_documents d
      where d.id = document_id
        and private.knowledge_has_area_role((select auth.uid()), d.area_id, array['owner','editor']::public.knowledge_area_role[])
    )
  )
  with check (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.knowledge_documents d
      where d.id = document_id
        and private.knowledge_has_area_role((select auth.uid()), d.area_id, array['owner','editor']::public.knowledge_area_role[])
    )
  );
create policy "Annotation authors can delete annotations" on public.knowledge_annotations
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "Participants can view knowledge audit" on public.knowledge_audit_events
  for select to authenticated using (
    actor_id = (select auth.uid())
    or private.knowledge_is_admin((select auth.uid()))
    or (area_id is not null and private.knowledge_has_area_role((select auth.uid()), area_id, array['owner','editor']::public.knowledge_area_role[]))
  );
create policy "Authenticated actors can append knowledge audit" on public.knowledge_audit_events
  for insert to authenticated with check (
    actor_id = (select auth.uid()) and (
      private.knowledge_is_admin((select auth.uid()))
      or (document_id is not null and exists (
        select 1 from public.knowledge_documents d
        where d.id = document_id and (
          d.created_by = (select auth.uid())
          or private.knowledge_has_area_role((select auth.uid()), d.area_id, array['owner','editor']::public.knowledge_area_role[])
        )
      ))
      or (area_id is not null and private.knowledge_has_area_role((select auth.uid()), area_id, array['owner','editor']::public.knowledge_area_role[]))
    )
  );

create trigger update_knowledge_areas_updated_at before update on public.knowledge_areas
  for each row execute function public.update_updated_at_column();
create trigger update_knowledge_documents_updated_at before update on public.knowledge_documents
  for each row execute function public.update_updated_at_column();
create trigger update_knowledge_revisions_updated_at before update on public.knowledge_revisions
  for each row execute function public.update_updated_at_column();
create trigger update_knowledge_sources_updated_at before update on public.knowledge_sources
  for each row execute function public.update_updated_at_column();
create trigger update_knowledge_annotations_updated_at before update on public.knowledge_annotations
  for each row execute function public.update_updated_at_column();

insert into public.knowledge_areas (slug, name, description, owner_key, default_visibility)
values
  ('company', 'Empresa e estratégia', 'Identidade, posicionamento e decisões institucionais.', 'leadership', 'public'),
  ('education', 'Amplify Educação', 'Produtos, formações e materiais educacionais.', 'academy', 'public'),
  ('offers', 'Produtos e ofertas', 'Catálogo, portfólio e condições das ofertas.', 'commercial', 'public'),
  ('commercial', 'Comercial', 'Políticas, qualificação e playbooks comerciais.', 'commercial', 'internal'),
  ('operations', 'Operações', 'Processos internos e padrões operacionais.', 'operations', 'internal'),
  ('brand', 'Marca e comunicação', 'Marca, linguagem e comunicação da Amplify.', 'brand', 'internal'),
  ('technology', 'Tecnologia e agentes', 'Sistemas, integrações, agentes e contratos técnicos.', 'product', 'internal')
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  owner_key = excluded.owner_key,
  default_visibility = excluded.default_visibility;

insert into public.knowledge_admins (user_id, created_by)
select id, id from auth.users where lower(email) = 'leonardo.camacho@amplify.ia.br'
on conflict (user_id) do nothing;
