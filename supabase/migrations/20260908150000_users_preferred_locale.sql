alter table public.users
  add column if not exists preferred_locale text not null default 'en';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_preferred_locale_check'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_preferred_locale_check
      check (preferred_locale in ('en', 'es-419', 'pt-BR'));
  end if;
end
$$;

create or replace function public.set_my_preferred_locale(p_locale text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_locale not in ('en', 'es-419', 'pt-BR') then
    raise exception 'Unsupported locale';
  end if;

  update public.users
  set preferred_locale = p_locale
  where auth_id = auth.uid();
end;
$$;

revoke all on function public.set_my_preferred_locale(text) from public;
grant execute on function public.set_my_preferred_locale(text) to authenticated;
