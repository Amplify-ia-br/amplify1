-- A corrected contact or route is a new request; a repeated request is not.
alter table public.ana_site_deliveries drop constraint ana_site_deliveries_conversation_id_key;
create unique index ana_site_delivery_identity on public.ana_site_deliveries(conversation_id, (payload->>'dedupeKey'));

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
  insert into public.ana_site_deliveries(conversation_id,payload) values(p_id,p_handoff) on conflict do nothing;
 end if;
 return true;
end $$;
