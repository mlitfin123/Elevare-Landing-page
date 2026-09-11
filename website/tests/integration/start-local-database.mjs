// Creates/reuses only the explicitly named disposable loopback test services.
import { execFileSync } from 'node:child_process';
import { jwtSecret } from './local-environment.mjs';
const run=(args)=>execFileSync('docker',args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}).trim();
const inspect=(kind,name)=>{try{return JSON.parse(run([kind,'inspect',name]))[0];}catch{return null;}};
const network='elevare-runtime-test';
if(!inspect('network',network))run(['network','create',network]);
const services=[
  {name:'elevare-runtime-test-db',image:'public.ecr.aws/supabase/postgres:17.6.1.127',port:'55432:5432',env:['POSTGRES_PASSWORD=local-test-only']},
  {name:'elevare-runtime-test-rest',image:'postgrest/postgrest:v14.5',port:'55433:3000',env:[
    'PGRST_DB_URI=postgres://authenticator:local-test-only@elevare-runtime-test-db:5432/postgres',
    'PGRST_DB_SCHEMAS=public','PGRST_DB_ANON_ROLE=anon',`PGRST_JWT_SECRET=${jwtSecret}`,
  ]},
];
for(const service of services){
  const existing=inspect('container',service.name);
  if(existing){
    if(existing.Config.Image!==service.image)throw Error(`Refusing to reuse unexpected image for ${service.name}`);
    if(!existing.State.Running)run(['start',service.name]);
  }else{
    run(['run','-d','--name',service.name,'--network',network,'-p',`127.0.0.1:${service.port}`,
      ...service.env.flatMap(value=>['-e',value]),service.image]);
  }
  console.log(`Local fixture service ready: ${service.name}`);
}
console.log('Wait for database readiness, then run setup-local-database.mjs. No remote Supabase project is used.');
