import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createCreativeAPI} from './creative-api.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.json':'application/json'};
const files=new Set(['index.html','style.css','app.js','script-editor.js','creative-contract.js','creative-ui.js','assets/dunes.svg','assets/coast.svg','assets/arch.svg']);
export function createAppServer(options={}){
  const api=createCreativeAPI(options);
  return http.createServer(async(req,res)=>{
    const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
    try{
      if(!/^(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(req.headers.host||''))return json(403,{error:'仅允许本机访问'});
      const pathname=new URL(req.url,'http://localhost').pathname;
      if(pathname.startsWith('/api/')){
        if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)return json(403,{error:'请求来源无效'});
        if(req.method==='GET'&&pathname==='/api/model/config')return json(200,await api.handle(pathname,{__get:true}));
        if(req.method!=='POST'||req.headers['x-frame-request']!=='1'||!req.headers['content-type']?.startsWith('application/json'))return json(403,{error:'请求格式或来源无效'});
        const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>14000000)return json(413,{error:'请求过大，请减少参考图'});chunks.push(chunk);}
        let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return json(400,{error:'请求 JSON 无效'});}
        if(!body||typeof body!=='object'||Array.isArray(body))return json(400,{error:'请求格式无效'});
        delete body.__get;
        const controller=new AbortController();res.on('close',()=>{if(!res.writableFinished)controller.abort();});
        try{return json(200,await api.handle(pathname,body,controller.signal));}catch(err){if(!res.destroyed)return json(400,{error:err.message});}
      }
      const relative=decodeURIComponent(pathname==='/'?'/index.html':pathname).slice(1);
      if(!files.has(relative)||!['GET','HEAD'].includes(req.method)){res.writeHead(404);return res.end('Not found');}
      const data=await readFile(path.join(root,relative));res.writeHead(200,{'Content-Type':types[path.extname(relative)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(req.method==='HEAD'?undefined:data);
    }catch{if(!res.headersSent)json(500,{error:'服务暂时不可用'});else res.end();}
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))createAppServer().listen(Number(process.env.PORT)||4173,'127.0.0.1',()=>console.log('FRAME is ready at http://127.0.0.1:'+(process.env.PORT||4173)));
