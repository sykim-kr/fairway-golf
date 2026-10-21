'use strict';
/* Tokens are sent only to their fixed provider origin and never persisted. */
(() => {
  const $=id=>document.getElementById(id), repo='sykim-kr/fairway-golf';
  const google='https://tagmanager.googleapis.com/tagmanager/v2/';
  const github='https://api.github.com/repos/'+repo;
  const runKey='fairway_auto_install_v5', settingsKey='fairway_auto_public_v2';
  const fields=['mp-token','region','environment','gtm-id','account-id','container-id'];
  const hosts={us:'https://api.mixpanel.com',eu:'https://api-eu.mixpanel.com',in:'https://api-in.mixpanel.com'};
  let busy=false,lastGoogle=0,run=null,stage='입력 정보 확인';
  try{run=JSON.parse(sessionStorage.getItem(runKey)||'null');}catch{}
  function message(text,error=false){
    const success=!error&&!!run?.verified, pending=!error&&!success&&!!run?.commit;
    $('status').textContent=text;$('status').classList.toggle('error',error);
    $('result').hidden=false;$('result').className='card result'+(error?' error':success?' success':pending?' pending':'');
    $('result-title').textContent=error?'설정 실패 · '+stage:success?'설정 성공':pending?'사이트 반영 대기 중':'설정 진행 중';
    $('verify').hidden=!run?.commit||success;
  }
  function fail(error){
    const field=error.field;
    if(field){$(field).setAttribute('aria-invalid','true');$(field).setAttribute('aria-describedby','status');}
    const completed=run?.pending?'마지막 쓰기 요청의 적용 여부 미확인':run?.commit?'GTM 게시와 GitHub 코드 반영 완료':run?.published?'GTM 게시 완료 · 사이트 코드 미반영':run?.version?'GTM 버전 생성 완료 · 게시 미완료':run?.workspace?'GTM 작업 공간 생성 완료 · 설치 미완료':'GTM·GitHub 변경 없음';
    message(error.message+'\n\n현재 상태: '+completed+(run?.pending?'\n쓰기 결과 확인이 필요합니다. 중복 방지를 위해 재시도를 중단했습니다. 작업 기록을 확인하세요.':''),true);
    $('result').scrollIntoView?.({behavior:'smooth',block:'center'});
  }
  function fieldError(field,text){const error=Error(text);error.field=field;return error;}

  function receipt(){ $('receipt').textContent=run?JSON.stringify({workspace:run.workspace,resources:run.resources,counts:run.counts,version:run.version,published:!!run.published,commit:run.commit,web_verified:!!run.verified,pending:run.pending||null},null,2):''; }
  function persist(){sessionStorage.setItem(runKey,JSON.stringify(run));receipt();}
  function clearTokens(){$('oauth-token').value='';$('github-token').value='';}
  function config(){return {mixpanel_token:$('mp-token').value.trim(),api_host:hosts[$('region').value],region:$('region').value,environment:$('environment').value,gtm_id:$('gtm-id').value.trim(),account:$('account-id').value.trim(),container:$('container-id').value.trim(),include_impressions:$('impressions').checked,template_version:5};}
  function restore(c){if(!c)return;$('mp-token').value=c.mixpanel_token||'';$('region').value=c.region||'us';$('environment').value=c.environment||'production';$('gtm-id').value=c.gtm_id||'';$('account-id').value=c.account||'';$('container-id').value=c.container||'';$('impressions').checked=c.include_impressions!==false;}
  try{restore(run?.config||JSON.parse(localStorage.getItem(settingsKey)||'null'));}catch{}
  receipt();if(run)message(run.pending?'중단된 요청의 결과가 불명확합니다. 작업 기록의 리소스를 확인해야 합니다. 자동 재시도는 차단됩니다.':run.verified?'이 탭에서 완료한 설치 기록을 불러왔습니다.':'이 탭의 작업 기록을 불러왔습니다. 동일 설정과 인증 토큰을 입력하면 이어서 실행합니다.');
  $('clear-tokens').addEventListener('click',clearTokens);window.addEventListener('pagehide',clearTokens);
  $('save').addEventListener('click',()=>{try{localStorage.setItem(settingsKey,JSON.stringify(config()));$('save-status').textContent='공개 설정만 저장했습니다. Google·GitHub 인증 토큰은 제외했습니다.';}catch{$('save-status').textContent='이 브라우저에서 설정을 저장할 수 없습니다.';}});
  function credentials(){const g=$('oauth-token').value.trim(),h=$('github-token').value.trim();if(!g||!h||/\s/.test(g)||/\s/.test(h))throw Error('공백 없는 Google·GitHub 액세스 토큰을 입력하세요. Bearer 접두사는 제외합니다.');return {g,h};}
  function validate(requireAuthorization){
    stage='입력 정보 확인';
    document.querySelectorAll('[aria-invalid]').forEach(e=>{e.removeAttribute('aria-invalid');e.removeAttribute('aria-describedby');});
    $('gtm-id').value=$('gtm-id').value.trim().toUpperCase();
    const checks=[['mp-token','Mixpanel Project Token',/^[a-fA-F0-9]{32}$/,'32자리 프로젝트 토큰을 입력하세요.'],['gtm-id','GTM 공개 컨테이너 ID',/^GTM-[A-Z0-9]+$/,'GTM-으로 시작하는 ID를 입력하세요.'],['account-id','GTM Account ID',/^[0-9]+$/,'숫자 ID만 입력하세요.'],['container-id','GTM API Container ID',/^[0-9]+$/,'숫자 ID만 입력하세요.'],['oauth-token','Google OAuth Access Token',/^\S+$/,'access_token 전체 값만 입력하세요. 공백·Bearer 접두사는 제외하세요.'],['github-token','GitHub Fine-grained PAT',/^\S+$/,'GitHub 토큰 전체 값만 입력하세요.']];
    for(const [id,label,pattern,hint] of checks){$(id).value=$(id).value.trim();if(!pattern.test($(id).value)){fail(fieldError(id,label+': '+hint));$(id).focus?.({preventScroll:true});return false;}}
    if(requireAuthorization&&!$('authorize').checked){fail(fieldError('authorize','GTM 게시 및 사이트 적용 동의에 체크한 뒤 다시 눌러주세요.'));return false;}
    return true;
  }
  function setBusy(value){busy=value;document.querySelectorAll('#settings input,#settings select,#settings button').forEach(e=>e.disabled=value);$('verify').disabled=value;$('install').textContent=value?'설정 중… 잠시 기다려 주세요':'태그 매니저 설정하기';}
  async function request(provider,path,creds,method='GET',body,allow404=false){
    stage=provider==='github'?(method==='PUT'?'GitHub 사이트 코드 반영':'GitHub 저장소 접근 확인'):path.includes(':publish')?'GTM 버전 게시':path.includes(':create_version')?'GTM 버전 생성':path.includes('/triggers')?'GTM 트리거 생성':path.includes('/tags')?'GTM 태그 확인·생성':path.includes('/variables')?'GTM 변수 확인·생성':path.includes('/versions')?'GTM 버전 확인':path.includes('/workspaces')?'GTM 작업 공간 생성·확인':'GTM 컨테이너 확인';
    if(run?.pending)stage+=' · '+run.pending;
    if(provider==='google'){const delay=Math.max(0,4200-(Date.now()-lastGoogle));if(delay)await new Promise(resolve=>setTimeout(resolve,delay));lastGoogle=Date.now();}
    const url=provider==='google'?google+path:github+path;
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),25000);
    try{
      const response=await fetch(url,{method,headers:{Authorization:'Bearer '+(provider==='google'?creds.g:creds.h),Accept:'application/json',...(body?{'Content-Type':'application/json'}:{}),...(provider==='github'?{'X-GitHub-Api-Version':'2022-11-28'}:{})},body:body?JSON.stringify(body):undefined,credentials:'omit',redirect:'error',cache:'no-store',referrerPolicy:'no-referrer',signal:ctl.signal});
      if(allow404&&response.status===404)return null;
      if(!response.ok){
        const g=provider==='google',who=g?'Google':'GitHub',status=response.status;
        const hint=status===401?(g?'Google OAuth Access Token이 만료되었거나 유효하지 않습니다. OAuth Playground에서 새 access_token을 발급받아 교체하세요.':'GitHub Fine-grained PAT가 만료되었거나 유효하지 않습니다. 새 토큰을 입력하세요.')
          :status===403?(g?'Google 권한을 확인하세요: edit.containers, edit.containerversions, publish 범위와 GTM 사용자 게시 권한, Tag Manager API 활성화가 필요합니다. 호출 한도 초과일 수도 있습니다.':'GitHub 토큰의 소유자 sykim-kr, 대상 fairway-golf, Contents: Read and write 권한을 확인하세요. 브랜치 보호 정책도 확인하세요.')
          :status===404?(g?'GTM Account ID·API Container ID 및 해당 계정의 접근 권한을 확인하세요.':'GitHub 토큰이 fairway-golf 저장소에 접근할 수 있는지 확인하세요.')
          :status===409?'동시 수정으로 충돌했습니다. GTM/GitHub의 최신 상태를 확인한 뒤 다시 시도하세요.'
          :status===429?'API 호출 한도를 초과했습니다. 잠시 후 다시 시도하세요.'
          :status===400||status===422?'API가 요청 내용을 거부했습니다. 이 오류 단계와 HTTP 번호를 전달해 주세요. 권한·리소스 설정 또는 설치 요청 확인이 필요합니다.'
          :'서비스 오류입니다. 잠시 후 상태를 확인하세요.';
        const err=Error(who+' API HTTP '+status+'\n'+hint);err.definitive=status>=400&&status<500;
        if(status===401||status===403)err.field=g?'oauth-token':'github-token';
        throw err;
      }
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
    const publicIds=[container.publicId,...(Array.isArray(container.tagIds)?container.tagIds:[])].filter(v=>typeof v==='string'&&/^GTM-[A-Z0-9]+$/i.test(v)).map(v=>v.toUpperCase());
    const contexts=Array.isArray(container.usageContext)?container.usageContext:[];
    const detail='Account ID: '+c.account+' / API Container ID: '+c.container+' / Google 공개 ID: '+(publicIds.join(', ')||'응답 없음')+' / 유형: '+(contexts.join(', ')||'응답 없음');
    if(!publicIds.includes(c.gtm_id))throw fieldError('gtm-id','공개 컨테이너 ID가 일치하지 않습니다. 입력값: '+c.gtm_id+'\n'+detail+'\nGTM 화면에서 같은 컨테이너의 GTM- ID를 확인하세요.');
    if(!contexts.includes('web'))throw fieldError('container-id','Web 컨테이너가 아닙니다.\n'+detail+'\n이 설치 도구에는 웹사이트용 Web 컨테이너가 필요합니다.');
    const file=await request('github','/contents/index.html?ref=main',creds);
    if(file.type!=='file'||file.encoding!=='base64')throw Error('GitHub index.html 파일을 읽지 못했습니다.');
    patchHtml(fromBase64(file.content),c);
    const helper=await request('github','/contents/analytics-consent.js?ref=main',creds);
    if(helper.type!=='file')throw Error('분석 동의 로더 파일이 없습니다.');
    return {base,file};
  }
  const taxonomy=window.fairwayTaxonomy;
  function empty(v){return !['tag','trigger','variable','zone','customTemplate'].some(k=>(v?.[k]||[]).length);}
  function signature(v){return v?String(v.containerVersionId)+':'+String(v.fingerprint||''):null;}
  async function listResources(kind,creds){
    let items=[],page='';do{const result=await request('google',run.workspace+'/'+kind+'s'+(page?'?pageToken='+encodeURIComponent(page):''),creds);items=items.concat(result[kind]||[]);page=result.nextPageToken||'';}while(page);return items;
  }
  async function configure(c,creds){
    run.resources=run.resources||{variable:{},trigger:{},tag:{}};
    const initial=taxonomy.plan(c);
    for(const kind of ['variable','trigger','tag']){
      const current=await listResources(kind,creds),desired=taxonomy.plan(c,run.resources.trigger)[kind];
      if(current.some(r=>!desired.some(d=>d.name===r.name)))throw Error('다른 '+kind+' 설정이 발견되었습니다. 전용 작업 공간을 확인하세요.');
      for(let i=0;i<desired.length;i++){
        const item=desired[i],matches=current.filter(x=>x.name===item.name);
        if(matches.length>1)throw Error('중복 리소스: '+item.name);
        const existing=matches[0],idKey=kind+'Id';
        message('2/5 '+({variable:'변수',trigger:'트리거',tag:'태그'}[kind])+' 설정 '+(i+1)+'/'+desired.length+' · '+item.name);
        if(existing&&taxonomy.equal(item,existing)){run.resources[kind][item.name]=existing[idKey];persist();continue;}
        const endpoint=run.workspace+'/'+kind+'s'+(existing?'/'+existing[idKey]:'');
        await mutate(item.name+' 설정','google',endpoint,creds,existing?'PUT':'POST',{...item,...(existing?{fingerprint:existing.fingerprint}:{})},r=>{if(!r[idKey])throw Error('리소스 ID 응답이 없습니다: '+item.name);run.resources[kind][item.name]=r[idKey];});
      }
    }
    run.counts={tags:initial.tag.length,triggers:initial.trigger.length,variables:initial.variable.length};persist();
  }
  async function verifyWeb(){
    if(!run?.commit){message('GitHub 설치 코드 커밋이 아직 없습니다.',true);return false;}
    stage='GitHub Pages 사이트 반영 확인';
    const response=await fetch('./?fairway_check='+Date.now(),{cache:'no-store',credentials:'omit'});
    if(!response.ok)throw Error('사이트 응답을 확인하지 못했습니다.');
    const html=await response.text();
    if(!html.includes(installBlock(run.config))){message('GTM 게시·GitHub 커밋 완료. GitHub Pages 반영 대기 중입니다. 잠시 후 설치 반영 다시 확인을 누르세요.');return false;}
    run.verified=true;persist();message('택소노미 설정 성공: 태그 '+run.counts.tags+'개 · 변수 '+run.counts.variables+'개 · 트리거 '+run.counts.triggers+'개를 검증하고 게시했습니다. 사이트 설치 코드도 반영되었습니다.\n홈페이지에서 분석 동의 후 레슨을 클릭하고 Mixpanel에서 실제 수신을 확인하세요.');return true;
  }
  $('settings').addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!validate(true))return;
    const c=config();let creds;
    try{creds=credentials();if(run?.pending)throw Error('쓰기 결과가 불명확한 이전 요청이 있습니다: '+run.pending+'. 아래 작업 기록으로 GTM/GitHub 상태를 먼저 확인하세요. 중복 생성을 방지하기 위해 재실행하지 않습니다.');if(run&&JSON.stringify(run.config)!==JSON.stringify(c))throw Error('진행 중인 작업과 입력 설정이 다릅니다. 이 탭의 기존 설정으로 복원해 재개하세요.');}catch(e){fail(e);return;}
    setBusy(true);
    try{
      message('1/5 컨테이너 및 GitHub 파일 확인 중…');const {base}=await preflight(c,creds);
      if(!run){run={config:c,operation:crypto.randomUUID(),pending:null};persist();}
      run.verified=false;persist();
      const desired=taxonomy.plan(c);
      if(!run.version){
        if(!run.workspace){
          const live=await request('google',base+'/versions:live',creds,'GET',undefined,true);
          let matches=false;try{if(live){taxonomy.verify(live,c);matches=true;}}catch{}
          if(matches){run.version=base+'/versions/'+live.containerVersionId;run.published=true;run.counts={tags:desired.tag.length,triggers:desired.trigger.length,variables:desired.variable.length};persist();}
          else if(!empty(live)&&!taxonomy.legacy(live,c))throw Error('기존 설정이 현재 Fairway 택소노미와 다릅니다. 다른 태그를 덮어쓰지 않았습니다. 빈 Web 컨테이너 또는 동일 입력값으로 설치한 Fairway 컨테이너를 사용하세요.');
          run.baseline=signature(live);persist();
          if(!run.version){message('2/5 전용 워크스페이스 생성 중…');
          await mutate('워크스페이스 생성','google',base+'/workspaces',creds,'POST',{name:'Fairway Auto '+run.operation,description:'Fairway taxonomy v5 dedicated installation'},r=>{if(!r.workspaceId)throw Error('Workspace ID 응답이 없습니다.');run.workspace=base+'/workspaces/'+r.workspaceId;});}
        }
        if(!run.version){await configure(c,creds);
        message('3/5 버전 생성 및 컴파일 확인 중…');
        const created=await mutate('버전 생성','google',run.workspace+':create_version',creds,'POST',{name:'Fairway '+run.operation,notes:'Install Fairway taxonomy 1.0'},r=>{if(r.containerVersion?.containerVersionId)run.version=base+'/versions/'+r.containerVersion.containerVersionId;run.compileError=!!r.compilerError;run.syncError=!!(r.syncStatus?.mergeConflict||r.syncStatus?.syncError);if(!run.version)throw Error('버전 생성 결과를 확인하지 못했습니다.');});
        if(created.compilerError||run.syncError)throw Error('GTM 컴파일·동기화 오류가 발생했습니다. 생성 버전을 검토하세요.');}
      }
      if(run.compileError||run.syncError)throw Error('저장된 버전에 컴파일·동기화 오류가 있습니다. GTM에서 검토해야 합니다.');
      if(!run.published){
        const version=await request('google',run.version,creds);taxonomy.verify(version,c);
        const live=await request('google',base+'/versions:live',creds,'GET',undefined,true);
        if(live?.containerVersionId===version.containerVersionId){run.published=true;persist();}
        else {
          if(signature(live)!==run.baseline)throw Error('설치 중 다른 GTM 버전이 게시되었습니다. 덮어쓰지 않고 중단합니다.');
          await mutate('버전 게시','google',run.version+':publish?fingerprint='+encodeURIComponent(version.fingerprint),creds,'POST',undefined,r=>{if(r.compilerError||r.containerVersion?.containerVersionId!==version.containerVersionId)throw Error('게시 응답을 검증하지 못했습니다.');run.published=true;});
        }
      }
      const live=await request('google',base+'/versions:live',creds);if(base+'/versions/'+live.containerVersionId!==run.version)throw Error('현재 라이브 버전이 예상 버전과 다릅니다.');taxonomy.verify(live,c);
      message('4/5 GitHub 설치 코드 반영 중…');
      const file=await request('github','/contents/index.html?ref=main',creds),source=fromBase64(file.content),updated=patchHtml(source,c);
      if(updated!==source)await mutate('GitHub 파일 커밋','github','/contents/index.html',creds,'PUT',{message:'Install consent-gated GTM '+c.gtm_id,content:toBase64(updated),sha:file.sha,branch:'main'},r=>{if(!r.commit?.sha)throw Error('커밋 SHA 응답이 없습니다.');run.commit=r.commit.sha;});
      else {run.commit=run.commit||'existing_installation';persist();}
      message('5/5 GitHub Pages 반영 확인 중…');
      for(let attempt=0;attempt<6;attempt++){if(await verifyWeb())break;if(attempt<5)await new Promise(resolve=>setTimeout(resolve,10000));}
    }catch(e){fail(e);}
    finally{creds=null;clearTokens();setBusy(false);receipt();}
  });
  $('verify').addEventListener('click',async()=>{if(busy)return;try{await verifyWeb();}catch(e){fail(e);}});
  // Pure helpers for repeatable local tests; no credentials exposed.
  window.fairwayAutoHelpers={patchHtml,toBase64,fromBase64,installBlock};
})();