grant usage on schema private to service_role;
grant execute on function private.knowledge_is_admin(uuid) to service_role;
grant execute on function private.knowledge_has_area_role(uuid, uuid, public.knowledge_area_role[]) to service_role;
