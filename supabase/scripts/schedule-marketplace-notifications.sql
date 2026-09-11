-- Run only in the verified Elevare-Prod project, after deploying the sender and
-- storing marketplace_email_service_role_key in Supabase Vault. No raw key is
-- embedded in this schedule or returned by this script.
begin;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
do $$
begin
  if to_regprocedure('public.marketplace_claim_notification()') is null then
    raise exception 'Apply the notification delivery migration first.';
  end if;
  if (select count(*) from vault.secrets where name = 'marketplace_email_service_role_key') <> 1 then
    raise exception 'Configure the notification scheduler credential in Vault first.';
  end if;
end;
$$;
select cron.schedule('marketplace-notification-delivery', '* * * * *', $job$
  select net.http_post(
    url := 'https://cnfqpfynjpwlzdtblzps.supabase.co/functions/v1/marketplace-notification-delivery',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'marketplace_email_service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
$job$);
commit;
