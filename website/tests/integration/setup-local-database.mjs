import { execFileSync } from 'node:child_process';
import path from 'node:path';
import './prepare-database.mjs';
const repo=path.resolve(import.meta.dirname,'../../..');
const container='elevare-runtime-test-db';
const docker=(args)=>execFileSync('docker',args,{encoding:'utf8',windowsHide:true,maxBuffer:2_000_000});
const image=docker(['inspect','--format','{{.Config.Image}}',container]).trim();
if(image!=='public.ecr.aws/supabase/postgres:17.6.1.127')throw Error('Refusing to reset a container other than the explicitly named test image');
const sql=(statement)=>docker(['exec',container,'psql','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-c',statement]);
sql("drop schema public cascade; create schema public; grant usage on schema public to anon,authenticated,service_role; delete from auth.users where id='33333333-3333-4333-8333-333333333333';");
for(const file of ['.tmp/runtime-fixture.sql','supabase/migrations/20260910120000_professional_runtime_publication.sql','website/tests/integration/seed.sql','website/tests/integration/failure-fixture.sql']){
 docker(['cp',path.join(repo,file),`${container}:/tmp/runtime-step.sql`]);
 docker(['exec',container,'psql','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-f','/tmp/runtime-step.sql']);
}
sql("notify pgrst, 'reload schema';");
console.log('Prepared isolated Supabase contract fixture and applied the final migration. No remote database was used.');
