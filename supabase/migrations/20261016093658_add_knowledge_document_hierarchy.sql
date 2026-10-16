alter table public.knowledge_documents
  add column if not exists parent_document_id uuid
  references public.knowledge_documents(id) on delete set null;

alter table public.knowledge_documents
  drop constraint if exists knowledge_documents_parent_not_self;
alter table public.knowledge_documents
  add constraint knowledge_documents_parent_not_self
  check (parent_document_id is null or parent_document_id <> id);

create index if not exists knowledge_documents_parent_idx
  on public.knowledge_documents(parent_document_id, updated_at desc);

create or replace function private.validate_knowledge_document_parent()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  parent_area_id uuid;
  creates_cycle boolean;
begin
  if new.parent_document_id is null then
    return new;
  end if;

  select area_id
    into parent_area_id
    from public.knowledge_documents
   where id = new.parent_document_id;

  if parent_area_id is null then
    raise exception 'Documento principal não encontrado.';
  end if;

  if parent_area_id <> new.area_id then
    raise exception 'O documento principal precisa pertencer à mesma área.';
  end if;

  with recursive ancestors as (
    select id, parent_document_id
      from public.knowledge_documents
     where id = new.parent_document_id
    union all
    select document.id, document.parent_document_id
      from public.knowledge_documents document
      join ancestors on document.id = ancestors.parent_document_id
  )
  select exists(select 1 from ancestors where id = new.id)
    into creates_cycle;

  if creates_cycle then
    raise exception 'O vínculo criaria um ciclo entre documentos.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_knowledge_document_parent on public.knowledge_documents;
create trigger validate_knowledge_document_parent
  before insert or update of parent_document_id, area_id
  on public.knowledge_documents
  for each row execute function private.validate_knowledge_document_parent();

-- Reconstitui vínculos já publicados a partir do contrato OKF. O primeiro
-- `document_of` válido e pertencente à mesma área passa a ser o pai editorial.
with candidate_parents as (
  select distinct on (child.id)
    child.id as child_id,
    parent.id as parent_id
  from public.knowledge_documents child
  join public.knowledge_revisions revision
    on revision.id = child.published_revision_id
  cross join lateral jsonb_array_elements(coalesce(revision.metadata->'relationships', '[]'::jsonb)) relationship
  join public.knowledge_documents parent
    on parent.okf_id = relationship->>'target'
   and parent.area_id = child.area_id
  where relationship->>'type' = 'document_of'
    and child.parent_document_id is null
    and child.id <> parent.id
  order by child.id, parent.updated_at desc
)
update public.knowledge_documents child
   set parent_document_id = candidate.parent_id
  from candidate_parents candidate
 where child.id = candidate.child_id;

-- A ficha 3.1 foi publicada antes de a hierarquia existir.
update public.knowledge_documents child
   set parent_document_id = parent.id,
       area_id = parent.area_id,
       owner_key = parent.owner_key,
       reviewer_key = parent.reviewer_key,
       visibility = parent.visibility
  from public.knowledge_documents parent
 where child.okf_id = 'l-e-i-a-ficha-do-produto-v3-1-1y4spp'
   and parent.okf_id = 'leia';

update public.knowledge_revisions revision
   set metadata = jsonb_set(
     revision.metadata,
     '{relationships}',
     jsonb_build_array(jsonb_build_object('type', 'document_of', 'target', 'leia')),
     true
   )
  from public.knowledge_documents document
 where revision.document_id = document.id
   and document.okf_id = 'l-e-i-a-ficha-do-produto-v3-1-1y4spp';
