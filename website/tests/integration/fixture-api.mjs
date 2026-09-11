// Local URL-prefix adapter; all auth, reads, and writes go to real PostgREST.
import http from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { jwtSecret } from './local-environment.mjs';
http.createServer((request,response)=>{
  // A local GoTrue-shaped test response after checking the fixture JWT signature.
  // This is never a production auth service and accepts only our test signing key.
  if (request.url === '/auth/v1/user' && request.method === 'GET') {
    try {
      const jwt = request.headers.authorization?.replace(/^Bearer\s+/i, '') ?? '';
      const [header, payload, signature] = jwt.split('.');
      const expected = createHmac('sha256', jwtSecret).update(`${header}.${payload}`).digest();
      const actual = Buffer.from(signature ?? '', 'base64url');
      const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
      if (expected.length !== actual.length || !timingSafeEqual(expected, actual)
        || claims.role !== 'authenticated' || !claims.sub || claims.exp <= Date.now() / 1000) throw Error('Invalid fixture JWT');
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ id: claims.sub, aud: 'authenticated', role: claims.role, email: 'runtime-test@example.invalid' }));
    } catch {
      response.writeHead(401, { 'content-type': 'application/json' }); response.end(JSON.stringify({ message: 'Invalid local test token' }));
    }
    return;
  }
  if(!request.url?.startsWith('/rest/v1/')) {response.writeHead(404);response.end();return;}
  const upstream=http.request({hostname:'127.0.0.1',port:55433,path:request.url.slice('/rest/v1'.length),method:request.method,headers:request.headers},incoming=>{
    response.writeHead(incoming.statusCode??502,incoming.headers);incoming.pipe(response);
  });
  upstream.on('error',()=>{response.writeHead(502);response.end();}); request.pipe(upstream);
}).listen(55434,'127.0.0.1',()=>console.log('Local Supabase REST adapter listening on 127.0.0.1:55434'));
