-- Public site sessions use the existing signed-cookie conversations. No Lab access is opened.
create table public.ana_site_state (
 conversation_id uuid primary key references public.ana_conversations(id) on delete cascade,
 memory jsonb not null default '[]'::jsonb,
 lock_token uuid,
 locked_until timestamptz
);
create table public.ana_site_deliveries (
 id uuid primary key default gen_random_uuid(),
 conversation_id uuid not null unique references public.ana_conversations(id) on delete cascade,
 payload jsonb not null,
 status text not null default 'pending' check(status in ('pending','delivered')),
 routing_prepared boolean not null default false,
 contact_id text, opportunity_id text, note_id text,
 attempts integer not null default 0,
 last_error text,
 lock_token uuid, locked_until timestamptz,
 created_at timestamptz not null default now(), delivered_at timestamptz
);
alter table public.ana_site_state enable row level security;
alter table public.ana_site_deliveries enable row level security;
revoke all on public.ana_site_state, public.ana_site_deliveries from public, anon, authenticated;
grant select,insert,update,delete on public.ana_site_state, public.ana_site_deliveries to service_role;

create or replace function public.begin_ana_site_turn(p_key uuid, p_hash text, p_request uuid, p_path text, p_context text)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare cid uuid; state public.ana_site_state; cached jsonb; history jsonb;
begin
 cid := public.claim_ana_conversation(p_key,p_hash,p_path);
 if cid is null then return jsonb_build_object('kind','forbidden'); end if;
 insert into public.ana_site_state(conversation_id) values(cid) on conflict do nothing;
 select * into state from public.ana_site_state where conversation_id=cid for update;
 select metadata->'siteResponse' into cached from public.ana_messages where conversation_id=cid and external_id='assistant:'||p_request::text;
 if cached is not null then return jsonb_build_object('kind','cached','response',cached); end if;
 if state.locked_until > now() then return jsonb_build_object('kind','busy'); end if;
 update public.ana_site_state set lock_token=p_request, locked_until=now()+interval '120 seconds' where conversation_id=cid;
 update public.ana_conversations set page_path=p_path,page_context=p_context where id=cid;
 select coalesce(jsonb_agg(jsonb_build_object('role',role,'text',content) order by created_at,id),'[]'::jsonb) into history
 from (select role,content,created_at,id from public.ana_messages where conversation_id=cid and role in ('user','assistant') order by created_at desc,id desc limit 80) h;
 return jsonb_build_object('kind','ready','id',cid,'history',history,'memory',state.memory);
end $$;

create or replace function public.finish_ana_site_turn(p_id uuid,p_hash text,p_request uuid,p_user text,p_assistant text,p_memory jsonb,p_response jsonb,p_handoff jsonb,p_metadata jsonb)
returns boolean language plpgsql security invoker set search_path=public as $$
declare state public.ana_site_state;
begin
 select s.* into state from public.ana_site_state s join public.ana_conversations c on c.id=s.conversation_id where c.id=p_id and c.session_hash=p_hash for update of s;
 if not found or state.lock_token is distinct from p_request then return false; end if;
 insert into public.ana_messages(conversation_id,external_id,role,content,metadata,created_at)
 values(p_id,'user:'||p_request::text,'user',p_user,'{}',clock_timestamp()),
 (p_id,'assistant:'||p_request::text,'assistant',p_assistant,p_metadata||jsonb_build_object('siteResponse',p_response),clock_timestamp()+interval '1 millisecond');
 update public.ana_site_state set memory=p_memory,lock_token=null,locked_until=null where conversation_id=p_id;
 update public.ana_conversations set last_message_at=now(),status=case when p_handoff is not null then 'handoff' else status end where id=p_id;
 if p_handoff is not null then
  insert into public.ana_site_deliveries(conversation_id,payload) values(p_id,p_handoff) on conflict(conversation_id) do nothing;
 end if;
 return true;
end $$;

create or replace function public.claim_ana_site_delivery(p_id uuid,p_token uuid)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare d public.ana_site_deliveries;
begin
 select * into d from public.ana_site_deliveries where id=p_id for update;
 if not found then return null; end if;
 if d.status='delivered' then return to_jsonb(d); end if;
 if d.locked_until>now() then return null; end if;
 update public.ana_site_deliveries set lock_token=p_token,locked_until=now()+interval '180 seconds',attempts=attempts+1 where id=p_id;
 return to_jsonb(d);
end $$;
revoke all on function public.begin_ana_site_turn(uuid,text,uuid,text,text) from public,anon,authenticated;
revoke all on function public.finish_ana_site_turn(uuid,text,uuid,text,text,jsonb,jsonb,jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.claim_ana_site_delivery(uuid,uuid) from public,anon,authenticated;
grant execute on function public.begin_ana_site_turn(uuid,text,uuid,text,text) to service_role;
grant execute on function public.finish_ana_site_turn(uuid,text,uuid,text,text,jsonb,jsonb,jsonb,jsonb) to service_role;
grant execute on function public.claim_ana_site_delivery(uuid,uuid) to service_role;
