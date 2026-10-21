'use strict';
/* Tokens are sent only to their fixed provider origin and never persisted. */
(() => {
  const $=id=>document.getElementById(id), repo='sykim-kr/fairway-golf';
  const google='https://tagmanager.googleapis.com/tagmanager/v2/';
  const github='https://api.github.com/repos/'+repo;
  const runKey='fairway_auto_install_v2', settingsKey='fairway_auto_public_v2';
  const fields=['mp-token','region','environment','gtm-id','account-id','container-id'];
  const hosts={us:'https://api.mixpanel.com',eu:'https://api-eu.mixpanel.com',in:'https://api-in.mixpanel.com'};
  let busy=false,lastGoogle=0,run=null;
  try{run=JSON.parse(sessionStorage.getItem(runKey)||'null');}catch{}
  function message(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
  function receipt(){ $('receipt').textContent=run?JSON.stringify({workspace:run.workspace,trigger_id:run.trigger,tag_id:run.tag,version:run.version,published:!!run.published,commit:run.commit,web_verified:!!run.verified,pending:run.pending||null},null,2):''; }
  function persist(){sessionStorage.setItem(runKey,JSON.stringify(run));receipt();}
  function clearTokens(){$('oauth-token').value='';$('github-token').value='';}
  function config(){return {mixpanel_token:$('mp-token').value.trim(),api_host:hosts[$('region').value],region:$('region').value,environment:$('environment').value,gtm_id:$('gtm-id').value.trim(),account:$('account-id').value.trim(),container:$('container-id').value.trim(),include_impressions:$('impressions').checked,template_version:2};}
  function restore(c){if(!c)return;$('mp-token').value=c.mixpanel_token||'';$('region').value=c.region||'us';$('environment').value=c.environment||'production';$('gtm-id').value=c.gtm_id||'';$('account-id').value=c.account||'';$('container-id').value=c.container||'';$('impressions').checked=c.include_impressions!==false;}
  try{restore(run?.config||JSON.parse(localStorage.getItem(settingsKey)||'null'));}catch{}
  receipt();if(run)message(run.pending?'중단된 요청의 결과가 불명확합니다. 작업 기록의 리소스를 확인해야 합니다. 자동 재시도는 차단됩니다.':run.verified?'이 탭에서 완료한 설치 기록을 불러왔습니다.':'이 탭의 작업 기록을 불러왔습니다. 동일 설정과 인증 토큰을 입력하면 이어서 실행합니다.');
  $('clear-tokens').addEventListener('click',clearTokens);window.addEventListener('pagehide',clearTokens);
  $('save').addEventListener('click',()=>{try{localStorage.setItem(settingsKey,JSON.stringify(config()));$('save-status').textContent='공개 설정만 저장했습니다. Google·GitHub 인증 토큰은 제외했습니다.';}catch{$('save-status').textContent='이 브라우저에서 설정을 저장할 수 없습니다.';}});
  function credentials(){const g=$('oauth-token').value.trim(),h=$('github-token').value.trim();if(!g||!h||/\s/.test(g)||/\s/.test(h))throw Error('공백 없는 Google·GitHub 액세스 토큰을 입력하세요. Bearer 접두사는 제외합니다.');return {g,h};}
  function validate(requireAuthorization){$('gtm-id').value=$('gtm-id').value.trim().toUpperCase();const auth=$('authorize');auth.required=requireAuthorization;const valid=$('settings').reportValidity();auth.required=true;return valid;}
  function setBusy(value){busy=value;document.querySelectorAll('#settings input,#settings select,#settings button').forEach(e=>e.disabled=value);$('verify').disabled=value;}
  async function request(provider,path,creds,method='GET',body,allow404=false){
    if(provider==='google'){const delay=Math.max(0,4200-(Date.now()-lastGoogle));if(delay)await new Promise(resolve=>setTimeout(resolve,delay));lastGoogle=Date.now();}
    const url=provider==='google'?google+path:github+path;
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),25000);
    try{
      const response=await fetch(url,{method,headers:{Authorization:'Bearer '+(provider==='google'?creds.g:creds.h),Accept:'application/json',...(body?{'Content-Type':'application/json'}:{}),...(provider==='github'?{'X-GitHub-Api-Version':'2022-11-28'}:{})},body:body?JSON.stringify(body):undefined,credentials:'omit',redirect:'error',cache:'no-store',referrerPolicy:'no-referrer',signal:ctl.signal});
      if(allow404&&response.status===404)return null;
      if(!response.ok){const err=Error((provider==='google'?'Google':'GitHub')+' API HTTP '+response.status+' — '+({401:'토큰이 만료되었거나 잘못되었습니다.',403:'OAuth 범위·사용자 권한·API 활성화 또는 호출 한도를 확인하세요.',404:'리소스 ID 또는 저장소 접근 권한을 확인하세요.',409:'동시 수정 또는 버전 충돌입니다. 파일·워크스페이스 상태를 확인하세요.',422:'요청 또는 브랜치 보호 정책을 확인하세요.',429:'호출 한도에 도달했습니다. 잠시 후 재개하세요.'}[response.status]||'요청을 완료하지 못했습니다.'));err.definitive=response.status>=400&&response.status<500;throw err;}
      return await response.json();
    }catch(error){if(error instanceof TypeError||error.name==='AbortError')throw Error('네트워크·CORS 오류 또는 시간 초과입니다. 쓰기 요청이었다면 원격 작업은 완료되었을 수 있습니다.');throw error;}finally{clearTimeout(timer);}
  }
  async function mutate(label,provider,path,creds,method,body,onSuccess){
    run.pending=label;persist();
    try{const result=await request(provider,path,creds,method,body);onSuccess(result);run.pending=null;persist();return result;}
    catch(error){if(error.definitive){run.pending=null;persist();}throw error;}
  }
  function fromBase64(content){return new TextDecoder().decode(Uint8Array.from(atob(content.replace(/\s/g,'')),c=>c.charCodeAt(0)));}
  function toBase64(content){let binary='';new TextEncoder().encode(content).forEach(b=>binary+=String.fromCharCode(b));return btoa(binary);}
  const begin='<!-- FAIRWAY-AUTO-GTM:START -->',end='<!-- FAIRWAY-AUTO-GTM:END -->';
  function installBlock(c){return begin+'\n<script>window.fairwayGtmId="'+c.gtm_id+'";</script>\n<script src="analytics-consent.js?v=2" defer></script>\n'+end;}
  function patchHtml(source,c){
    if(!/<\/head\s*>/i.test(source)||!source.includes('id="lesson-grid"'))throw Error('예상한 Fairway 홈페이지 구조가 아닙니다. 자동 수정을 중단합니다.');
    const starts=source.split(begin).length-1,ends=source.split(end).length-1;
    if(starts!==ends||starts>1)throw Error('설치 마커가 손상되거나 중복되어 있습니다.');
    let stripped=source;
    if(starts){const a=source.indexOf(begin),b=source.indexOf(end);if(b<a)throw Error('설치 마커 순서가 잘못되었습니다.');stripped=source.slice(0,a)+source.slice(b+end.length);}
    if(/googletagmanager\.com\/(?:gtm\.js|ns\.html)|fairwayGtmId/.test(stripped))throw Error('기존 GTM 설치 코드를 발견했습니다. 중복 삽입 없이 중단합니다.');
    if(starts)return source.replace(/<!-- FAIRWAY-AUTO-GTM:START -->[\s\S]*?<!-- FAIRWAY-AUTO-GTM:END -->/,()=>installBlock(c));
    return source.replace(/<\/head\s*>/i,()=>installBlock(c)+'\n</head>');
  }
  async function preflight(c,creds){
    const base='accounts/'+c.account+'/containers/'+c.container;
    const container=await request('google',base,creds);
    if(container.publicId!==c.gtm_id||!container.usageContext?.includes('web'))throw Error('GTM 공개 ID·API ID가 일치하는 Web 컨테이너인지 확인하세요.');
    const file=await request('github','/contents/index.html?ref=main',creds);
    if(file.type!=='file'||file.encoding!=='base64')throw Error('GitHub index.html 파일을 읽지 못했습니다.');
    patchHtml(fromBase64(file.content),c);
    const helper=await request('github','/contents/analytics-consent.js?ref=main',creds);
    if(helper.type!=='file')throw Error('분석 동의 로더 파일이 없습니다.');
    return {base,file};
  }
  function buildTag(c){return '<script>\n('+window.fairwayTagTemplate.toString()+')('+JSON.stringify({mixpanel_token:c.mixpanel_token,api_host:c.api_host,environment:c.environment,include_impressions:c.include_impressions})+');\n</script>';}
  function verifyVersion(v,tag){if(v.tag?.length!==1||v.tag[0].name!=='Fairway Mixpanel v1'||!v.tag[0].parameter?.some(p=>p.key==='html'&&p.value===tag))throw Error('다른 태그 또는 예상과 다른 태그 내용이 포함되어 있어 게시하지 않습니다.');}
  async function verifyWeb(){
    if(!run?.commit){message('GitHub 설치 코드 커밋이 아직 없습니다.',true);return false;}
    const response=await fetch('./?fairway_check='+Date.now(),{cache:'no-store',credentials:'omit'});
    if(!response.ok)throw Error('사이트 응답을 확인하지 못했습니다.');
    const html=await response.text();
    if(!html.includes(installBlock(run.config))){message('GTM 게시·GitHub 커밋 완료. GitHub Pages 반영 대기 중입니다. 잠시 후 설치 반영 다시 확인을 누르세요.');return false;}
    run.verified=true;persist();message('설치 및 게시 완료: GTM 버전 게시와 GitHub Pages 설치 코드 반영을 확인했습니다. 홈페이지에서 분석 동의 후 레슨을 클릭하고 Mixpanel에서 수신을 확인하세요.');return true;
  }
  $('preflight').addEventListener('click',async()=>{if(busy||!validate(false))return;setBusy(true);try{await preflight(config(),credentials());message('컨테이너 ID와 GitHub 파일 읽기 확인 완료. 쓰기·게시 권한 및 Mixpanel 토큰 유효성은 아직 검증하지 않았습니다.');}catch(e){message(e.message,true);}finally{setBusy(false);}});
  $('settings').addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!validate(true))return;
    const c=config();let creds;
    try{creds=credentials();if(run?.pending)throw Error('쓰기 결과가 불명확한 이전 요청이 있습니다: '+run.pending+'. 아래 작업 기록으로 GTM/GitHub 상태를 먼저 확인하세요. 중복 생성을 방지하기 위해 재실행하지 않습니다.');if(run&&JSON.stringify(run.config)!==JSON.stringify(c))throw Error('진행 중인 작업과 입력 설정이 다릅니다. 이 탭의 기존 설정으로 복원해 재개하세요.');}catch(e){message(e.message,true);return;}
    setBusy(true);
    try{
      message('1/5 컨테이너 및 GitHub 파일 확인 중…');const {base}=await preflight(c,creds);
      if(!run){run={config:c,operation:crypto.randomUUID(),pending:null};persist();}
      if(run.verified){await verifyWeb();return;}
      const tag=buildTag(c);
      if(!run.version){
        if(!run.workspace){
          const live=await request('google',base+'/versions:live',creds,'GET',undefined,true);
          if(live?.tag?.length)throw Error('이미 게시된 태그가 있는 컨테이너입니다. 최초 설치용 빈 컨테이너를 사용하세요.');
          message('2/5 전용 워크스페이스 생성 중…');
          await mutate('워크스페이스 생성','google',base+'/workspaces',creds,'POST',{name:'Fairway Auto '+run.operation,description:'Fairway Analytics Studio v2 dedicated installation'},r=>{if(!r.workspaceId)throw Error('Workspace ID 응답이 없습니다.');run.workspace=base+'/workspaces/'+r.workspaceId;});
        }
        const listed=await request('google',run.workspace+'/tags',creds);
        if(listed.nextPageToken||(listed.tag||[]).some(t=>t.tagId!==run.tag))throw Error('전용 워크스페이스에 예상하지 못한 태그가 있습니다. 게시를 중단합니다.');
        if(!run.trigger)await mutate('트리거 생성','google',run.workspace+'/triggers',creds,'POST',{name:'Fairway DOM Ready v1',type:'domReady'},r=>{if(!r.triggerId)throw Error('Trigger ID 응답이 없습니다.');run.trigger=r.triggerId;});
        if(!run.tag)await mutate('태그 생성','google',run.workspace+'/tags',creds,'POST',{name:'Fairway Mixpanel v1',type:'html',parameter:[{type:'template',key:'html',value:tag},{type:'boolean',key:'supportDocumentWrite',value:'false'}],firingTriggerId:[run.trigger],tagFiringOption:'oncePerLoad',notes:'Fairway taxonomy 1.0. Homepage only. GTM loaded after visitor consent.'},r=>{if(!r.tagId)throw Error('Tag ID 응답이 없습니다.');run.tag=r.tagId;});
        message('3/5 버전 생성 및 컴파일 확인 중…');
        const created=await mutate('버전 생성','google',run.workspace+':create_version',creds,'POST',{name:'Fairway '+run.operation,notes:'Install Fairway taxonomy 1.0'},r=>{if(r.containerVersion?.containerVersionId)run.version=base+'/versions/'+r.containerVersion.containerVersionId;run.compileError=!!r.compilerError;run.syncError=!!(r.syncStatus?.mergeConflict||r.syncStatus?.syncError);if(!run.version)throw Error('버전 생성 결과를 확인하지 못했습니다.');});
        if(created.compilerError||run.syncError)throw Error('GTM 컴파일·동기화 오류가 발생했습니다. 생성 버전을 검토하세요.');
      }
      if(run.compileError||run.syncError)throw Error('저장된 버전에 컴파일·동기화 오류가 있습니다. GTM에서 검토해야 합니다.');
      if(!run.published){
        const version=await request('google',run.version,creds);verifyVersion(version,tag);
        const live=await request('google',base+'/versions:live',creds,'GET',undefined,true);
        if(live?.containerVersionId===version.containerVersionId){run.published=true;persist();}
        else {
          if(live?.tag?.length)throw Error('다른 태그가 새로 게시되어 있습니다. 덮어쓰지 않고 중단합니다.');
          await mutate('버전 게시','google',run.version+':publish?fingerprint='+encodeURIComponent(version.fingerprint),creds,'POST',undefined,r=>{if(r.compilerError||r.containerVersion?.containerVersionId!==version.containerVersionId)throw Error('게시 응답을 검증하지 못했습니다.');run.published=true;});
        }
      }
      const live=await request('google',base+'/versions:live',creds);if(base+'/versions/'+live.containerVersionId!==run.version)throw Error('현재 라이브 버전이 예상 버전과 다릅니다.');verifyVersion(live,tag);
      message('4/5 GitHub 설치 코드 반영 중…');
      const file=await request('github','/contents/index.html?ref=main',creds),source=fromBase64(file.content),updated=patchHtml(source,c);
      if(updated!==source)await mutate('GitHub 파일 커밋','github','/contents/index.html',creds,'PUT',{message:'Install consent-gated GTM '+c.gtm_id,content:toBase64(updated),sha:file.sha,branch:'main'},r=>{if(!r.commit?.sha)throw Error('커밋 SHA 응답이 없습니다.');run.commit=r.commit.sha;});
      else {run.commit=run.commit||'existing_installation';persist();}
      message('5/5 GitHub Pages 반영 확인 중…');
      for(let attempt=0;attempt<6;attempt++){if(await verifyWeb())break;if(attempt<5)await new Promise(resolve=>setTimeout(resolve,10000));}
    }catch(e){message(e.message+(run?.pending?'\n결과가 불명확하여 자동 재시도를 차단했습니다. 완료된 단계는 아래에 표시됩니다.':'\n완료된 단계는 보존됩니다. 같은 설정과 유효한 토큰으로 이어서 실행할 수 있습니다.'),true);}
    finally{creds=null;clearTokens();setBusy(false);receipt();}
  });
  $('verify').addEventListener('click',async()=>{if(busy)return;try{await verifyWeb();}catch(e){message(e.message,true);}});
  // Pure helpers for repeatable local tests; no credentials exposed.
  window.fairwayAutoHelpers={patchHtml,toBase64,fromBase64,installBlock};
})();