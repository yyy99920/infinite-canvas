import {createHash,timingSafeEqual} from 'node:crypto';
import {createCreativeAPI,normalizeBaseURL} from './creative-api.mjs';

const MAX_BODY_BYTES=4_000_000;
const routes=new Set(['/api/model/config','/api/model/test','/api/model/models','/api/creative-directions']);
const json=(status,data)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const digest=value=>createHash('sha256').update(value).digest();

function deploymentConfig(env){
  const baseURL=normalizeBaseURL(env.MODEL_BASE_URL||'');
  if(!baseURL.startsWith('https://'))throw Error('线上模型服务需要 HTTPS');
  const model=String(env.MODEL_NAME||'').trim(),apiKey=String(env.MODEL_API_KEY||'').trim();
  const accessCode=String(env.APP_ACCESS_CODE||'');
  if(!model||model.length>200||!apiKey||apiKey.length>4096||/[\r\n]/.test(model+apiKey)||accessCode.length<16||accessCode.length>256||/[^\x21-\x7e]/.test(accessCode))throw Error('部署配置不完整');
  return {config:{baseURL,model,apiKey,vision:env.MODEL_VISION==='true'},accessCode};
}

async function readBody(request){
  if(Number(request.headers.get('content-length'))>MAX_BODY_BYTES)throw Object.assign(Error('参考图总量过大，请减少图片后重试'),{status:413});
  const chunks=[];let size=0;
  if(request.body){const reader=request.body.getReader();try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BODY_BYTES){await reader.cancel();throw Object.assign(Error('参考图总量过大，请减少图片后重试'),{status:413});}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}}
  let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Error('请求 JSON 无效');}
  if(!body||typeof body!=='object'||Array.isArray(body))throw Error('请求格式无效');
  delete body.__get;
  return body;
}

// Configuration is read on every invocation; no credentials or login state are
// shared between visitors or dependent on a warm function instance.
export function createHostedHandler({env=process.env,fetchImpl=fetch}={}){
  return async function handle(request){
    const url=new URL(request.url),route=url.searchParams.get('route');
    const pathname=route?'/api/'+route.replace(/^\/+|\/+$/g,''):url.pathname;
    if(!routes.has(pathname))return json(404,{error:'接口不存在'});
    const origin=request.headers.get('origin');
    if(origin&&origin!==url.origin)return json(403,{error:'请求来源无效'});
    let deployment;try{deployment=deploymentConfig(env);}catch{}
    const publicStatus={hosted:true,ready:!!deployment,configured:false,hasKey:false,model:'',baseURL:'',vision:false};
    const code=request.headers.get('x-frame-access')||'';
    const authorized=!!deployment&&code.length<=256&&timingSafeEqual(digest(code),digest(deployment.accessCode));
    if(request.method==='GET'&&pathname==='/api/model/config'){
      if(!authorized)return json(200,publicStatus);
      const api=createCreativeAPI({initialConfig:deployment.config,fetchImpl});
      return json(200,{...await api.handle(pathname,{__get:true}),hosted:true,ready:true});
    }
    if(request.method!=='POST')return json(405,{error:'请求方法无效'});
    if(!deployment)return json(503,{error:'请先在 Vercel 配置模型环境变量和至少 16 位访问码，再重新部署'});
    if(!authorized)return json(401,{error:'访问码无效或已更换，请重新连接'});
    if(request.headers.get('x-frame-request')!=='1'||!request.headers.get('content-type')?.startsWith('application/json'))return json(403,{error:'请求格式无效'});
    try{
      const body=await readBody(request);
      const api=createCreativeAPI({initialConfig:deployment.config,fetchImpl});
      if(pathname==='/api/model/config'){
        if(Object.keys(body).length)return json(403,{error:'线上模型配置请在 Vercel 环境变量中修改'});
        return json(200,{...await api.handle(pathname,{__get:true}),hosted:true,ready:true});
      }
      return json(200,await api.handle(pathname,body,request.signal));
    }catch(error){return json(error.status||400,{error:error.message});}
  };
}
