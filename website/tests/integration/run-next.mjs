import { spawn } from 'node:child_process';
import { testEnvironment } from './local-environment.mjs';
const mode=process.argv[2];
if(!['build','start'].includes(mode))throw Error('Expected build or start');
const child=spawn(process.execPath,['node_modules/next/dist/bin/next',mode,...(mode==='start'?['--hostname','127.0.0.1','--port','3100']:[])],{
  stdio:'inherit',windowsHide:true,env:{...process.env,...testEnvironment,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1'},
});
child.on('exit',code=>process.exit(code??1));
