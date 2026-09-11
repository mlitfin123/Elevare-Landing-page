-- Test-only fault injection. This function is never part of the product migration.
create or replace function public.test_publication_read_failure(enabled boolean)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if enabled then revoke select on public.professional_publication_outbox from service_role;
 else grant select on public.professional_publication_outbox to service_role; end if;
end; $$;
revoke all on function public.test_publication_read_failure(boolean) from public,anon,authenticated;
grant execute on function public.test_publication_read_failure(boolean) to service_role;
