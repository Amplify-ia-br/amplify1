-- Server-only, durable round robin for the explicitly configured DF team.
alter table public.ana_site_deliveries add column assigned_owner text;
create sequence public.ana_site_df_rotation;
revoke all on sequence public.ana_site_df_rotation from public, anon, authenticated;
grant usage, select on sequence public.ana_site_df_rotation to service_role;

create function public.assign_ana_site_df_owner(p_id uuid, p_token uuid, p_owners text[])
returns text language plpgsql security invoker set search_path=public as $$
declare d public.ana_site_deliveries; owner_id text;
begin
 if cardinality(p_owners) is distinct from 3
    or (select count(distinct x) from unnest(p_owners) x where length(trim(x))>0)<>3 then
  raise exception 'invalid_df_team';
 end if;
 select * into d from public.ana_site_deliveries where id=p_id for update;
 if not found or d.lock_token is distinct from p_token or d.locked_until<=now()
    or d.payload->>'route' is distinct from 'leia' or d.payload->>'uf' is distinct from 'DF' then
  return null;
 end if;
 if d.assigned_owner is not null then return d.assigned_owner; end if;
 owner_id:=p_owners[1+((nextval('public.ana_site_df_rotation')-1)%3)::integer];
 update public.ana_site_deliveries set assigned_owner=owner_id where id=p_id;
 return owner_id;
end $$;
revoke all on function public.assign_ana_site_df_owner(uuid,uuid,text[]) from public,anon,authenticated;
grant execute on function public.assign_ana_site_df_owner(uuid,uuid,text[]) to service_role;
