-- Synthetic, disposable integration identity. Never run against a live project.
begin;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
insert into auth.users(id,email,email_confirmed_at) values ('33333333-3333-4333-8333-333333333333','runtime-test@example.invalid',now());
insert into public.users(id,auth_id,first_name,last_name,email,is_active)
values ('22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','Runtime','Professional','runtime-test@example.invalid',true);
insert into public.trainer_profiles(id,user_id,public_slug,public_display_name,professional_title,bio,years_experience,profile_live,verification_status,accepting_clients,client_acceptance_status,typical_availability,marketplace_specialties,marketplace_goal_tags,experience_levels_served,languages,public_headline,best_fit_summary,consultation_expectations,country_code,location_city,location_state,modality,marketplace_currency_code,marketplace_price_min_cents,approved_at)
values ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','runtime-professional','Runtime Professional','Personal Trainer','Published biography for runtime integration testing.',8,true,'verified',true,'accepting',array['mornings'],array['Strength Training'],array['strength'],array['beginner']::public.fitness_level[],array['English'],'Strength coaching for busy adults','Adults building consistent strength habits','Discuss your goals and next steps','US','Miami','FL','online','USD',7500,now());
insert into public.service_categories(id,slug,public_slug,name,public_label,public_headline,description)
values ('44444444-4444-4444-8444-444444444444','personal_training','personal-training','Personal Training','Personal Training','Personal Training','Personal training support.');
insert into public.trainer_services values ('11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444',true);
insert into public.trainer_locations(trainer_profile_id,location_city,location_state,country_code,service_radius_meters) values ('11111111-1111-4111-8111-111111111111','Miami','FL','US',16093);
insert into public.provider_matching_profiles(trainer_profile_id,delivery_modes,goal_tags,experience_tags,price_min_cents,currency_code,pricing_basis)
values ('11111111-1111-4111-8111-111111111111',array['online'],array['strength'],array['beginner'],7500,'USD','session');
insert into public.trainer_service_offerings(id,trainer_profile_id,name,description,service_mode,price_min_cents,pricing_basis,is_active,currency_code)
values ('55555555-5555-4555-8555-555555555555','11111111-1111-4111-8111-111111111111','Strength consultation','Build a sustainable training plan','online',7500,'session',true,'USD');
insert into public.certifications(id,trainer_profile_id,cert_name,cert_org,issuing_body,credential_type,verification_status,verified_at,public_display)
values ('66666666-6666-4666-8666-666666666666','11111111-1111-4111-8111-111111111111','Fitness Certification','Test Institute','Test Institute','fitness','verified',now(),true);
commit;
