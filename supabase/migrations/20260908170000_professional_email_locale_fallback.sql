begin;

-- A null preference lets transactional email resolution fall through to the
-- locale captured during professional/account signup. Explicit preferences
-- continue to use the existing constrained preferred_locale field.
alter table public.users
  alter column preferred_locale drop default,
  alter column preferred_locale drop not null;

comment on column public.users.preferred_locale is
  'Explicit account locale preference. Null falls back to normalized signup locale metadata.';

commit;
