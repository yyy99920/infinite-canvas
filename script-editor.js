import {DIRECTION_COUNT,RATIOS,validateDirections} from './creative-contract.js';
import {renderCreativeHeader,renderCreativeResults,renderModelLine,creativeRuntime} from './creative-ui.js';
/** Serializable editor plus creative direction selection. */
export function createScriptDraft(){return {mode:'story',prompt:'',body:'',durationMode:'5',customDuration:15,references:[],ratio:'9:16',required:'',excluded:'',directions:[],selectedDirectionId:null,generatedFor:null,creativeView:'directions'};}
export function durationSeconds(draft){return draft.durationMode==='custom'?draft.customDuration:Number(draft.durationMode);}
export function validCustomDuration(value){return String(value).trim()!==''&&Number.isSafeInteger(Number(value))&&Number(value)>0;}
export function validateScriptDraft(value){
  if(value===undefined)return createScriptDraft();
  if(!value||!['story','character','manual'].includes(value.mode)||!['5','8','10','custom'].includes(value.durationMode)||!validCustomDuration(value.customDuration)||typeof value.prompt!=='string'||typeof value.body!=='string'||value.prompt.length>100000||value.body.length>100000||!Array.isArray(value.references)||value.references.length>4)throw Error('脚本编辑器数据无效');
  const references=value.references.map(r=>{if(!r||typeof r.src!=='string'||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(r.src)||r.src.length>3000000||typeof r.name!=='string')throw Error('脚本参考图无效');return {src:r.src,name:r.name.slice(0,100)};});
  const ratio=value.ratio??'9:16';if(!RATIOS.includes(ratio))throw Error('画幅比例无效');
  const required=value.required??'',excluded=value.excluded??'';if(typeof required!=='string'||typeof excluded!=='string'||required.length>2000||excluded.length>2000)throw Error('创意约束无效');
  let directions=[],generatedFor=null;if(value.directions?.length){const g=value.generatedFor;if(!g||!Number.isSafeInteger(g.seconds)||g.seconds<=0||!RATIOS.includes(g.ratio)||typeof g.fingerprint!=='string'||g.fingerprint.length>100)throw Error('创意方向记录无效');generatedFor={seconds:g.seconds,ratio:g.ratio,fingerprint:g.fingerprint,model:String(g.model||'').slice(0,200)};directions=validateDirections(value.directions,g.seconds,{allowLegacy:true});}
  return {ratio,required,excluded,directions,generatedFor,selectedDirectionId:directions.some(d=>d.id===value.selectedDirectionId)?value.selectedDirectionId:null,creativeView:value.creativeView==='script'?'script':'directions',mode:value.mode,prompt:value.prompt,body:value.body,durationMode:value.durationMode,customDuration:Number(value.customDuration),references};
}
export function renderScriptEditor(n,esc,icon,expanded=false){
  const d=n.script,seconds=durationSeconds(d),busy=!!creativeRuntime.get(n.id)?.busy,showDirections=d.creativeView!=='script'||(!d.body&&d.mode!=='manual'),hasResults=busy||!!d.directions.length||!!creativeRuntime.get(n.id)?.error;
  return `<div class="script-editor" data-script-id="${esc(n.id)}">
    <div class="script-preview">
      <div class="creative-header">${renderCreativeHeader(n,esc)}</div>
      <div class="creative-workspace${hasResults?' has-results':''}" ${showDirections?'':'hidden'}>
        <div class="creative-brief">
          <div class="script-preview-heading"><span>${icon('text')} 说说你想拍什么</span><span class="creative-input-hint">一句模糊的想法也可以</span></div>
          <textarea class="script-prompt" data-script-field="prompt" aria-label="需求简述" placeholder="不必想得很完整。例如：中秋开屏，想用几个温暖的镜头营造团圆、陪伴的节日氛围…" maxlength="10000" ${busy?'disabled':''}>${esc(d.prompt)}</textarea>
          <div class="script-preview-bottom"><span>生成 ${DIRECTION_COUNT} 个创意方向供你选择 · 自动保存</span><span class="script-prompt-count">${d.prompt.length} 字</span></div>
        </div>
        <div class="creative-results" ${hasResults?'':'hidden'}>${renderCreativeResults(n,esc,icon)}</div>
      </div>
      <div class="script-original" ${showDirections?'hidden':''}>
      <div class="script-preview-heading"><span>${icon('note')} 可直接修改分镜内容</span><span class="script-duration-summary">${seconds}s</span><button data-script-action="export" title="导出脚本文本" aria-label="导出脚本">${icon('export')}</button></div>
      <div class="script-welcome" ${d.body||d.mode==='manual'?'hidden':''}>
        <div class="script-glyph">${icon('text')}</div><p>从一个故事开始</p><small>整理想法，再把每个镜头写下来。</small>
        <div class="script-starters"><span>尝试：</span><button data-script-mode="story">${icon('text')} 从剧情构思分镜 <small>›</small></button><button data-script-mode="character">${icon('cursor')} 从角色构思分镜 <small>›</small></button><button data-script-mode="manual">${icon('note')} 自己编写分镜脚本 <small>›</small></button></div>
      </div>
      <textarea class="script-body" data-script-field="body" aria-label="分镜脚本正文" placeholder="镜头 01｜场景与画面\n景别 / 运镜：\n角色动作：\n对白 / 声音：" maxlength="100000" ${!d.body&&d.mode!=='manual'?'hidden':''}>${esc(d.body)}</textarea>
      <div class="script-preview-bottom"><span>可直接编辑 · 自动保存</span><span class="script-body-count">${d.body.length} 字</span></div>
      </div>
    </div>
    <div class="script-composer">
      <fieldset class="creative-fields" ${busy?'disabled':''}>
      <div class="script-options">
        <button class="reference-button" data-script-action="reference">${icon('plus')}参考图${d.references.length?` <small>${d.references.length}/4</small>`:''}</button>
        <label class="script-select-control"><span>时长</span><select data-duration-select aria-label="脚本时长">${['5','8','10','custom'].map(v=>`<option value="${v}" ${d.durationMode===v?'selected':''}>${v==='custom'?'自定义':v+' 秒'}</option>`).join('')}</select></label>
        <label class="script-select-control script-ratio-select"><span>比例</span><select data-ratio-select aria-label="视频比例">${[['9:16','竖屏'],['16:9','横屏'],['1:1','方形']].map(([value,label])=>`<option value="${value}" ${d.ratio===value?'selected':''}>${value} ${label}</option>`).join('')}</select></label>
        <button class="script-expand" data-script-action="${expanded?'collapse':'expand'}" aria-label="${expanded?'收起编辑器':'展开编辑器'}" title="${expanded?'收起':'展开'}">${icon('fit')}</button>
      </div>
      <div class="custom-duration" ${d.durationMode!=='custom'?'hidden':''}><label>自定义时长 <input type="number" min="1" step="1" value="${d.customDuration}" data-script-field="customDuration" aria-label="自定义时长（秒）"> 秒</label><span class="duration-error" role="status"></span></div>
      <div class="script-references" ${d.references.length?'':'hidden'}>${d.references.map((r,i)=>`<div class="script-reference"><img src="${esc(r.src)}" alt="参考图：${esc(r.name)}"><button data-remove-reference="${i}" aria-label="移除参考图 ${i+1}">×</button><span>${esc(r.name)}</span></div>`).join('')}</div>
      <details class="creative-constraints" ${d.required||d.excluded?'open':''}><summary>可选约束 <span>必须出现 / 不要出现</span></summary><div><label>必须出现<input data-script-field="required" aria-label="必须出现" maxlength="2000" value="${esc(d.required)}" placeholder="例：月饼、灯笼、地图定位气泡"></label><label>不要出现<input data-script-field="excluded" aria-label="不要出现" maxlength="2000" value="${esc(d.excluded)}" placeholder="例：大段字幕、复杂 UI"></label></div></details>
      </fieldset>
      <div class="creative-model-line">${renderModelLine(esc)}</div>
      <div class="script-composer-footer" ${showDirections||busy?'':'hidden'}><span class="generation-note">${busy?`正在构思 ${DIRECTION_COUNT} 个不同方向…`:`先看 ${DIRECTION_COUNT} 个方向，再选择喜欢的脚本`}</span><button class="script-write" data-creative-action="${busy?'cancel':'generate'}" ${!busy&&!d.prompt.trim()?'disabled':''}>${busy?'取消生成':'生成创意方向'} ${icon(busy?'minus':'plus')}</button></div>
    </div>
  </div>`;
}
