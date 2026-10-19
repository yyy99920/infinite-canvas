// Shared validation and serialization for genuine model-generated creative directions.
export const DIRECTION_COUNT=4;
export const RATIOS=['9:16','16:9','1:1'];
export function validateDirections(value,seconds,{allowLegacy=false}={}){
  if(!Array.isArray(value)||(value.length!==DIRECTION_COUNT&&!(allowLegacy&&value.length===3)))throw Error(`模型需返回 ${DIRECTION_COUNT} 个创意方向，请重试`);
  const titles=new Set();
  const text=(v,max=3000)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw Error('创意方向内容不完整，请重试');return v.trim();};
  return value.map((d,i)=>{
    if(!d||!Array.isArray(d.shots)||d.shots.length<1||d.shots.length>12)throw Error('分镜结构无效，请重试');
    const title=text(d.title,120);if(titles.has(title))throw Error('创意方向重复，请重试');titles.add(title);
    let cursor=0;
    const shots=d.shots.map(s=>{if(!s||typeof s.seconds!=='number'||!Number.isFinite(s.seconds)||s.seconds<=0)throw Error('分镜时长无效，请重试');const shot={seconds:s.seconds,visual:text(s.visual),camera:text(s.camera),audio:text(s.audio)};cursor+=s.seconds;return shot;});
    if(Math.abs(cursor-seconds)>.05)throw Error('分镜总时长与设定不符，请重试');
    return {id:`direction-${i+1}`,title,angle:text(d.angle,200),hook:text(d.hook),synopsis:text(d.synopsis),visualStyle:text(d.visualStyle),fitReason:text(d.fitReason),shots};
  });
}
export function directionToScript(direction,seconds,ratio){let elapsed=0;const stamp=n=>Number(n.toFixed(2));return `${direction.title}\n时长：${seconds}s · 比例：${ratio}\n\n创意方向：${direction.angle}\n创意钩子：${direction.hook}\n故事梗概：${direction.synopsis}\n视觉风格：${direction.visualStyle}\n\n${direction.shots.map((s,i)=>{const start=elapsed;elapsed+=s.seconds;return `镜头 ${String(i+1).padStart(2,'0')}｜${stamp(start)}–${stamp(elapsed)}s\n画面：${s.visual}\n景别 / 运镜：${s.camera}\n对白 / 声音：${s.audio}`;}).join('\n\n')}`;}
export function requestFingerprint(d){const text=JSON.stringify({prompt:d.prompt.trim(),seconds:d.durationMode==='custom'?d.customDuration:Number(d.durationMode),ratio:d.ratio,required:d.required,excluded:d.excluded,references:d.references});let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}return `${text.length}-${hash>>>0}`;}
