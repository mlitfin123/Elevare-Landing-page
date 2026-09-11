// Local URL-prefix adapter; all auth, reads, and writes go to real PostgREST.
import http from 'node:http';
http.createServer((request,response)=>{
  if(!request.url?.startsWith('/rest/v1/')) {response.writeHead(404);response.end();return;}
  const upstream=http.request({hostname:'127.0.0.1',port:55433,path:request.url.slice('/rest/v1'.length),method:request.method,headers:request.headers},incoming=>{
    response.writeHead(incoming.statusCode??502,incoming.headers);incoming.pipe(response);
  });
  upstream.on('error',()=>{response.writeHead(502);response.end();}); request.pipe(upstream);
}).listen(55434,'127.0.0.1',()=>console.log('Local Supabase REST adapter listening on 127.0.0.1:55434'));
