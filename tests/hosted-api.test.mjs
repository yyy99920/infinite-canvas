import test from 'node:test';
import assert from 'node:assert/strict';
import {createHostedHandler} from '../hosted-api.mjs';

const env={MODEL_BASE_URL:'https://provider.example/v1',MODEL_NAME:'demo-model',MODEL_API_KEY:'test-only-provider-key',APP_ACCESS_CODE:'test-only-access-code-123',MODEL_VISION:'true'};
const request=(path,body,code=env.APP_ACCESS_CODE,extra={})=>new Request('https://canvas.example'+path,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'content-type':'application/json','x-frame-request':'1'}),...(code?{'x-frame-access':code}:{}),...extra},body:body===undefined?undefined:JSON.stringify(body)});
const brief={prompt:'中秋团圆短片',seconds:5,ratio:'9:16',required:'',excluded:'',references:[]};
const directions=Array.from({length:4},(_,i)=>({title:'创意 '+i,angle:'测试角度',hook:'测试钩子',synopsis:'测试故事',visualStyle:'暖色',fitReason:'适合竖屏',shots:[{seconds:5,visual:'月光下的家人',camera:'缓慢推近',audio:'轻柔音乐'}]}));

test('public hosted status reveals no provider configuration or credentials',async()=>{
  const handle=createHostedHandler({env});
  const response=await handle(request('/api/model/config',undefined,''));
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  const body=await response.json();assert.equal(body.hosted,true);assert.equal(body.ready,true);assert.equal(body.configured,false);
  const text=JSON.stringify(body);for(const value of [env.MODEL_BASE_URL,env.MODEL_NAME,env.MODEL_API_KEY,env.APP_ACCESS_CODE])assert.ok(!text.includes(value));
});

test('every provider call requires a valid access code, including rewritten routes',async()=>{
  let calls=0;const handle=createHostedHandler({env,fetchImpl:async()=>{calls++;throw Error('must not call');}});
  for(const path of ['/api/model/test','/api/model/models','/api/creative-directions','/api/index?route=creative-directions']){
    for(const code of ['', 'incorrect-access-code'])assert.equal((await handle(request(path,brief,code))).status,401);
  }
  assert.equal(calls,0);
});

test('cold starts use environment config and do not permit visitors to replace it',async()=>{
  for(let i=0;i<2;i++){
    const handle=createHostedHandler({env});
    const response=await handle(request('/api/index?route=model/config',{}));
    const data=await response.json();assert.equal(data.model,env.MODEL_NAME);assert.equal(data.configured,true);assert.equal(data.vision,true);
    assert.ok(!JSON.stringify(data).includes(env.MODEL_API_KEY));assert.ok(!JSON.stringify(data).includes(env.APP_ACCESS_CODE));
    assert.equal((await handle(request('/api/model/config',{baseURL:'https://other.example',apiKey:'override'}))).status,403);
    assert.equal((await handle(request('/api/model/clear',{}))).status,404);
  }
});

test('authenticated cloud generation forwards only server credentials and returns four directions',async()=>{
  let captured;const handle=createHostedHandler({env,fetchImpl:async(url,options)=>{captured={url,options};return Response.json({choices:[{message:{content:JSON.stringify({directions})}}]});}});
  const response=await handle(request('/api/index?route=creative-directions',brief));
  assert.equal(response.status,200);assert.equal((await response.json()).directions.length,4);
  assert.equal(captured.url,env.MODEL_BASE_URL+'/chat/completions');assert.equal(captured.options.headers.Authorization,'Bearer '+env.MODEL_API_KEY);
  assert.ok(!JSON.stringify(captured).includes(env.APP_ACCESS_CODE));
});

test('missing config fails closed and cross-origin or oversized requests do not reach provider',async()=>{
  const unavailable=createHostedHandler({env:{}});
  assert.equal((await (await unavailable(request('/api/model/config',undefined,''))).json()).ready,false);
  assert.equal((await unavailable(request('/api/creative-directions',brief))).status,503);
  const handle=createHostedHandler({env,fetchImpl:async()=>{throw Error('must not call');}});
  assert.equal((await handle(request('/api/model/test',{},env.APP_ACCESS_CODE,{origin:'https://other.example'}))).status,403);
  assert.equal((await handle(request('/api/model/test',{},env.APP_ACCESS_CODE,{'x-frame-request':'0'}))).status,403);
  assert.equal((await handle(request('/api/creative-directions',{...brief,prompt:'x'.repeat(4_000_001)}))).status,413);
  assert.equal((await handle(request('/api/model/test',undefined))).status,405);
});

test('access-code rotation takes effect on the next invocation',async()=>{
  const dynamicEnv={...env},handle=createHostedHandler({env:dynamicEnv});
  dynamicEnv.APP_ACCESS_CODE='replacement-access-code-456';
  assert.equal((await handle(request('/api/model/config',{}))).status,401);
  assert.equal((await handle(request('/api/model/config',{},dynamicEnv.APP_ACCESS_CODE))).status,200);
});
