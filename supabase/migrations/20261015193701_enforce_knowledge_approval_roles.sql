drop policy if exists "Contributors can create revisions" on public.knowledge_revisions;
create policy "Contributors can create revisions" on public.knowledge_revisions
  for insert to authenticated with check (
    (
      author_id = (select auth.uid())
      and status = 'draft'
      and exists (select 1 from public.knowledge_documents d where d.id = document_id)
    )
    or exists (
      select 1 from public.knowledge_documents d
      where d.id = document_id
        and private.knowledge_has_area_role(
          (select auth.uid()),
          d.area_id,
          array['owner']::public.knowledge_area_role[]
        )
    )
  );

create or replace function private.enforce_knowledge_document_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
    and new.status in ('approved', 'active', 'deprecated')
    and current_user not in ('postgres', 'service_role')
    and not private.knowledge_has_area_role(
      (select auth.uid()),
      new.area_id,
      array['owner']::public.knowledge_area_role[]
    )
  then
    raise exception 'Only an area owner or knowledge administrator can set status %', new.status
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function private.enforce_knowledge_revision_review()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_area_id uuid;
  requires_owner boolean;
begin
  requires_owner := (
    (new.status is distinct from old.status and new.status in ('changes_requested', 'approved', 'publishing', 'published', 'rejected'))
    or new.reviewed_by is distinct from old.reviewed_by
    or new.reviewed_at is distinct from old.reviewed_at
    or new.review_note is distinct from old.review_note
    or new.published_at is distinct from old.published_at
  );

  if requires_owner and current_user not in ('postgres', 'service_role') then
    select area_id into target_area_id
    from public.knowledge_documents
    where id = new.document_id;

    if not private.knowledge_has_area_role(
      (select auth.uid()),
      target_area_id,
      array['owner']::public.knowledge_area_role[]
    ) then
      raise exception 'Only an area owner or knowledge administrator can review or publish a revision'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_knowledge_document_status() from public, anon, authenticated;
revoke all on function private.enforce_knowledge_revision_review() from public, anon, authenticated;

create trigger enforce_knowledge_document_status
  before update on public.knowledge_documents
  for each row execute function private.enforce_knowledge_document_status();

create trigger enforce_knowledge_revision_review
  before update on public.knowledge_revisions
  for each row execute function private.enforce_knowledge_revision_review();
