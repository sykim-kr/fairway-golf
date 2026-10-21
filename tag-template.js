/* This file only defines a generator. It never initializes analytics on the setup page. */
window.fairwayTagTemplate = function (config) {
  if (location.hostname !== 'sykim-kr.github.io' || !/^\/fairway-golf\/(?:index\.html)?$/.test(location.pathname)) return;
  if (window.__fairwayTrackingV1) return;
  function start() {
    if (window.__fairwayTrackingV1 || !document.querySelector('#lesson-grid')) return;
    window.__fairwayTrackingV1 = true;
    var mp = window.mixpanel;
    // The official SDK queue pattern allows collection while the library loads.
    if (!mp || !mp.__SV) {
      mp = window.mixpanel = mp || [];
      mp._i = mp._i || [];
      mp.init = function (token, options, name) {
        var instance = mp[name] = [];
        instance.track = function () { instance.push(['track'].concat(Array.prototype.slice.call(arguments))); };
        instance.people = [];
        mp._i.push([token, options, name]);
      };
      mp.__SV = 1.2;
      var sdk = document.createElement('script');
      sdk.async = true;
      sdk.src = 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js';
      document.head.appendChild(sdk);
    }
    mp.init(config.mixpanel_token, {
      api_host: config.api_host,
      autocapture: false,
      track_pageview: false,
      record_sessions_percent: 0,
      stop_utm_persistence: true
    }, 'fairway');
    var pageId = window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + '-' + Math.random().toString(36).slice(2);
    var selected = (document.querySelector('.filter[aria-pressed="true"]') || {}).dataset;
    var activeFilter = selected ? selected.filter : 'all';
    var lessonIds = ['grip_basics','setup_basics','takeaway_basics','backswing_basics','impact_basics','finish_basics'];
    var stepIds = ['watch_lesson','rehearse_swing','range_practice'];
    var checks = Array.prototype.slice.call(document.querySelectorAll('.checklist input'));
    var lastChecks = checks.map(function (c) { return c.checked; });
    function count(values) { return values.filter(Boolean).length; }
    function track(name, props) {
      var data = {site_id:'fairway_golf', environment:config.environment, taxonomy_version:'1.0', content_version:'1.0', page_name:'golf_swing_guide', page_path:'/fairway-golf/', page_view_id:pageId, viewport_group:innerWidth<=580?'mobile':innerWidth<=850?'tablet':'desktop'};
      Object.keys(props || {}).forEach(function (key) { data[key] = props[key]; });
      window.dataLayer = window.dataLayer || [];
      if(config.data_layer_only) window.dataLayer.push({fairway_properties:null});
      window.dataLayer.push({event:'fairway_' + name, fairway_event:name, fairway_properties:data});
      if(config.data_layer_only) return;
      try { window.mixpanel.fairway.track(name, data); } catch (error) { /* Analytics must never block navigation. */ }
    }
    function lessonData(card) {
      var cards = Array.prototype.slice.call(document.querySelectorAll('#lesson-grid .card'));
      var index = cards.indexOf(card);
      return {lesson_id:lessonIds[index], lesson_order:index+1, swing_stage:card.dataset.stage, selected_filter:activeFilter};
    }
    track('page_viewed', {initial_filter:activeFilter, initial_checked_count:count(lastChecks)});
    function activation(event) {
      if (event.type === 'auxclick' && event.button !== 1) return;
      var target = event.target.closest ? event.target : event.target.parentElement;
      if (!target) return;
      var lessonLink = target.closest('#lesson-grid a');
      if (lessonLink) {
        var card = lessonLink.closest('.card');
        var props = lessonData(card);
        props.youtube_video_id = new URL(lessonLink.href).searchParams.get('v');
        props.click_surface = lessonLink.classList.contains('watch') ? 'watch_link' : 'card_link';
        props.destination_host = 'www.youtube.com';
        track('lesson_link_clicked',props);
        return;
      }
      if (event.type !== 'click') return;
      var filter = target.closest('.filter');
      if (filter && activeFilter !== filter.dataset.filter) {
        var previous = activeFilter;
        activeFilter = filter.dataset.filter;
        track('lesson_filter_changed', {previous_filter:previous,selected_filter:activeFilter,visible_lesson_count:document.querySelectorAll('.card:not([hidden])').length});
        refreshCards();
        return;
      }
      var link = target.closest('a[href^="#"]');
      if (!link) return;
      var id, source, destination = link.getAttribute('href').slice(1) || 'top';
      if (link.closest('header')) {
        source='header';
        id=link.classList.contains('brand')?'header_logo':link.classList.contains('nav-cta')?'nav_find_swing':destination==='practice'?'nav_practice':'nav_lessons';
      } else if (link.closest('footer')) {
        source='footer'; id=link.classList.contains('brand')?'footer_logo':'footer_back_top';
      } else { source='hero'; id='hero_explore'; }
      track('section_link_clicked',{link_id:id,source_section:source,target_section:destination});
    }
    document.addEventListener('click',activation);
    document.addEventListener('auxclick',activation);
    checks.forEach(function (check,index) {
      check.addEventListener('change',function () {
        var before=count(lastChecks), values=checks.map(function(c){return c.checked;});
        var saved=false;
        try { saved=localStorage.getItem('fairway-practice')===JSON.stringify(values); } catch (error) {}
        lastChecks=values;
        track('practice_step_changed',{practice_step_id:stepIds[index],is_checked:check.checked,checked_count_before:before,checked_count_after:count(values),state_saved:saved});
      });
    });
    var seen={}, timers={}, observer, targets=[];
    function key(item) {return item.card?'card:'+lessonData(item.el).lesson_id+':'+activeFilter:'section:'+item.id;}
    function cancel(item) {if(timers[item.id]) {clearTimeout(timers[item.id]);delete timers[item.id];}}
    function refreshCards() {
      if (!observer) return;
      targets.forEach(function(item){cancel(item);observer.unobserve(item.el);observer.observe(item.el);});
    }
    if (config.include_impressions && window.IntersectionObserver) {
      observer=new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          var item=targets.filter(function(t){return t.el===entry.target;})[0];
          cancel(item);
          if(entry.intersectionRatio<0.5 || document.hidden || seen[key(item)]) return;
          var currentKey=key(item);
          timers[item.id]=setTimeout(function(){
            if(document.hidden || currentKey!==key(item) || (item.card && item.el.hidden) || seen[currentKey]) return;
            seen[currentKey]=true;
            track(item.card?'lesson_card_viewed':'section_viewed',item.card?lessonData(item.el):{section_id:item.id});
          },1000);
        });
      },{threshold:[0,0.5]});
      document.querySelectorAll('.hero, #lessons, #practice').forEach(function(section){
        var marker=document.createElement('span');marker.style.cssText='display:block;width:1px;height:1px;position:absolute;pointer-events:none';
        section.insertBefore(marker,section.firstChild);
        targets.push({el:marker,id:section.id || 'hero',card:false});
      });
      document.querySelectorAll('#lesson-grid .card').forEach(function(card,index){targets.push({el:card,id:'card_'+index,card:true});});
      refreshCards();
      document.addEventListener('visibilitychange',function(){targets.forEach(cancel);if(!document.hidden)refreshCards();});
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
};