/* Loaded only by the auto-installed homepage, never the setup page. */
(() => {
  const key='fairway_analytics_consent_v1';
  const id=window.fairwayGtmId;
  if(!/^GTM-[A-Z0-9]+$/.test(id||''))return;
  let choice='';try{choice=localStorage.getItem(key)||'';}catch{}
  const panel=document.createElement('section');panel.setAttribute('aria-label','분석 수집 설정');
  panel.style.cssText='position:fixed;bottom:18px;left:18px;right:18px;max-width:560px;z-index:9999;background:#fffef6;color:#183e33;padding:20px;border:1px solid #b1c29d;border-radius:10px;box-shadow:0 6px 32px #0002;font:14px/1.6 system-ui';
  const text=document.createElement('p');text.textContent='Fairway는 동의 시 Google Tag Manager와 Mixpanel을 사용해 레슨 선택·필터·연습 체크 등의 이용 행동과 브라우저 식별자를 수집합니다. 거절해도 레슨을 이용할 수 있습니다. 아래 버튼에서 언제든 동의를 변경할 수 있습니다.';
  panel.appendChild(text);
  function load(){if(window.__fairwayGtmLoaded)return;window.__fairwayGtmLoaded=true;window.dataLayer=window.dataLayer||[];window.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtm.js?id='+id;document.head.appendChild(script);}
  ['동의하고 계속','거절 / 동의 철회'].forEach((label,index)=>{const button=document.createElement('button');button.textContent=label;button.style.cssText='margin:6px 10px 0 0;padding:10px 14px;border-radius:6px;border:1px solid #183e33;background:#183e33;color:white;cursor:pointer';button.addEventListener('click',()=>{const next=index===0?'granted':'denied';try{localStorage.setItem(key,next);}catch{}panel.hidden=true;if(next==='granted')load();else if(window.__fairwayGtmLoaded)location.reload();});panel.appendChild(button);});
  document.body.appendChild(panel);panel.hidden=!!choice;
  const toggle=document.createElement('button');toggle.textContent='분석 수집 설정';toggle.style.cssText='margin:12px;padding:8px 12px;border:1px solid #96a88d;border-radius:5px;cursor:pointer';toggle.addEventListener('click',()=>{panel.hidden=false;panel.querySelector('button').focus();});(document.querySelector('footer')||document.body).appendChild(toggle);
  if(choice==='granted')load();
})();