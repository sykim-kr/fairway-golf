'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const storageKey = 'fairway_analytics_public_settings_v1';
  const publicFields = ['mp-token','region','environment','gtm-id','account-id','container-id','workspace-id'];
  const hosts = {us:'https://api.mixpanel.com',eu:'https://api-eu.mixpanel.com',in:'https://api-in.mixpanel.com'};
  let generated = null;
  let controller = null;
  function status(id, message, error=false) {$(id).textContent=message;$(id).classList.toggle('error',error);}
  function invalidate() {generated=null;$('output').hidden=true;}
  function readConfig() {
    return {site_id:'fairway_golf',taxonomy_version:'1.0',mixpanel_token:$('mp-token').value.trim(),region:$('region').value,api_host:hosts[$('region').value],environment:$('environment').value,gtm_public_id:$('gtm-id').value.trim(),account_id:$('account-id').value.trim(),container_id:$('container-id').value.trim(),workspace_id:$('workspace-id').value.trim(),include_impressions:$('impressions').checked};
  }
  function validate() {
    $('mp-token').value=$('mp-token').value.trim();
    $('gtm-id').value=$('gtm-id').value.trim().toUpperCase();
    return $('settings').reportValidity();
  }
  try {
    const saved=JSON.parse(localStorage.getItem(storageKey)||'null');
    if(saved && saved.version===1){publicFields.forEach(id=>{if(typeof saved[id]==='string')$(id).value=saved[id];});$('impressions').checked=saved.impressions!==false;status('status','이 브라우저에 저장된 비인증 설정을 불러왔습니다.');}
  } catch {status('status','브라우저 저장소를 사용할 수 없습니다. 저장 없이 코드 생성은 가능합니다.');}
  $('settings').addEventListener('input',invalidate);
  $('settings').addEventListener('change',invalidate);
  $('settings').addEventListener('submit',event=>{
    event.preventDefault();
    if(!validate())return;
    const cfg=readConfig();
    const tagConfig={mixpanel_token:cfg.mixpanel_token,api_host:cfg.api_host,environment:cfg.environment,include_impressions:cfg.include_impressions};
    const tag='<script>\n('+window.fairwayTagTemplate.toString()+')('+JSON.stringify(tagConfig)+');\n</script>';
    const head="<!-- Google Tag Manager -->\n<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','"+cfg.gtm_public_id+"');</script>\n<!-- End Google Tag Manager -->";
    const body='<!-- Google Tag Manager (noscript) -->\n<noscript><iframe src="https://www.googletagmanager.com/ns.html?id='+cfg.gtm_public_id+'" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>\n<!-- End Google Tag Manager (noscript) -->';
    generated={config:cfg,tag,head,body};
    $('tag-code').value=tag;$('head-code').value=head;$('body-code').value=body;
    $('summary').textContent=`${cfg.gtm_public_id} · ${cfg.region.toUpperCase()} · ${cfg.environment} · ${cfg.include_impressions?7:5}개 이벤트`;
    $('output').hidden=false;status('status','코드를 생성했습니다. 아래 설치·검증 단계를 진행하세요.');$('output').scrollIntoView({behavior:'smooth'});
  });
  $('save').addEventListener('click',()=>{
    const data={version:1,impressions:$('impressions').checked};
    publicFields.forEach(id=>data[id]=$(id).value.trim());
    try{localStorage.setItem(storageKey,JSON.stringify(data));status('status','비인증 설정을 이 브라우저에 저장했습니다. OAuth 토큰은 저장하지 않았습니다.');}catch{status('status','저장하지 못했습니다. 브라우저 저장소 권한을 확인하세요.',true);}
  });
  function clearAuth(){if(controller)controller.abort();$('oauth-token').value='';}
  $('clear-token').addEventListener('click',()=>{clearAuth();status('api-status','인증 토큰을 지웠습니다.');});
  $('reset').addEventListener('click',()=>{
    clearAuth();try{localStorage.removeItem(storageKey);}catch{}
    HTMLFormElement.prototype.reset.call($('settings'));publicFields.filter(id=>!['region','environment'].includes(id)).forEach(id=>$(id).value='');invalidate();
    $('tag-code').value='';$('head-code').value='';$('body-code').value='';status('status','입력값·생성 코드·저장값을 삭제했습니다.');status('api-status','');status('copy-status','');
  });
  window.addEventListener('pagehide',clearAuth);
  $('test-api').addEventListener('click',async()=>{
    const account=$('account-id').value.trim(), container=$('container-id').value.trim(), workspace=$('workspace-id').value.trim();
    const token=$('oauth-token').value.trim();
    const publicId=$('gtm-id').value.trim();
    if(![account,container,workspace].every(v=>/^\d+$/.test(v))){status('api-status','Account ID, API Container ID, Workspace ID를 숫자로 입력하세요.',true);return;}
    if(!token || /\s/.test(token)){status('api-status','공백 없는 OAuth 액세스 토큰을 입력하세요. Bearer 접두사는 제외하세요.',true);return;}
    if(!/^GTM-[A-Z0-9]+$/.test(publicId)){status('api-status','GTM 공개 컨테이너 ID를 먼저 입력하세요.',true);return;}
    const base='https://tagmanager.googleapis.com/tagmanager/v2/accounts/'+account+'/containers/'+container;
    controller=new AbortController();const currentController=controller;
    const timeout=setTimeout(()=>currentController.abort(),15000);
    $('test-api').disabled=true;status('api-status','Google에서 컨테이너와 워크스페이스 접근 권한을 확인하고 있습니다…');
    try {
      async function get(url){
        const response=await fetch(url,{method:'GET',headers:{Authorization:'Bearer '+token},signal:currentController.signal,credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',redirect:'error'});
        if(!response.ok){const messages={401:'토큰이 만료되었거나 유효하지 않습니다. 새 OAuth 액세스 토큰을 입력하세요.',403:'접근 권한 또는 OAuth 범위가 부족하거나 Tag Manager API가 비활성화되어 있습니다.',404:'리소스를 찾을 수 없습니다. 계정·컨테이너·워크스페이스 ID를 확인하세요.',429:'요청이 너무 많습니다. 잠시 후 다시 시도하세요.'};throw new Error(messages[response.status]||'Google API 요청 실패 (HTTP '+response.status+').');}
        return response.json();
      }
      const containerInfo=await get(base);
      if(containerInfo.publicId!==publicId)throw new Error('API Container ID와 GTM 공개 ID가 서로 다른 컨테이너를 가리킵니다. ID를 확인하세요.');
      if(!containerInfo.usageContext || !containerInfo.usageContext.includes('web'))throw new Error('웹(Web) 컨테이너만 지원합니다.');
      const workspaceInfo=await get(base+'/workspaces/'+workspace);
      status('api-status','접근 확인 완료: '+(workspaceInfo.name || workspace)+' · '+publicId+'\n읽기 권한을 확인했습니다. 태그 게시나 Mixpanel 수신 확인은 수행하지 않았습니다. 인증 토큰은 입력란에서 지웠습니다.');
    } catch(error){status('api-status',error.name==='AbortError'?'요청이 취소되었거나 15초 제한을 초과했습니다.':error instanceof TypeError?'Google API에 연결하지 못했습니다. 네트워크·브라우저 CORS 정책을 확인하세요.':error.message,true);}
    finally{clearTimeout(timeout);$('oauth-token').value='';$('test-api').disabled=false;if(controller===currentController)controller=null;}
  });
  document.querySelectorAll('[data-copy]').forEach(button=>button.addEventListener('click',async()=>{
    const area=$(button.dataset.copy);
    try{await navigator.clipboard.writeText(area.value);status('copy-status','코드를 복사했습니다.');}catch{area.focus();area.select();status('copy-status','자동 복사를 사용할 수 없습니다. 선택된 코드를 Ctrl+C 또는 ⌘C로 복사하세요.');}
  }));
  function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type}));const link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  $('download-tag').addEventListener('click',()=>{if(generated)download('fairway-mixpanel-gtm-tag.html',generated.tag,'text/html;charset=utf-8');});
  $('download-config').addEventListener('click',()=>{if(generated)download('fairway-analytics-settings.json',JSON.stringify(generated.config,null,2),'application/json');});
})();