// Synthetic DOM/VM only. No browser, Google request, cookies or customer data are accessed.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const file=path.resolve(__dirname,'assets/site-analytics.js');
const api=require(file),ORIGIN='https://corretorluisfernando.com.br',KEY='lf_site_analytics_consent_v1',ID='G-TEST12345';
function fixture(overrides={}){
  const all=[],listeners=new Map(),cookieMap=new Map([['_ga','SYNTHETIC'],['_ga_TEST12345','SYNTHETIC'],['unrelated','PRESERVE']]),cookieWrites=[];
  function element(tag){
    const n={tagName:String(tag).toUpperCase(),children:[],attrs:{},listeners:new Map(),parentNode:null,hidden:false,textContent:'',style:{},
      setAttribute(k,v){this.attrs[k]=String(v);},getAttribute(k){return this.attrs[k]??(k==='href'?this.href:null);},
      appendChild(c){c.parentNode=this;this.children.push(c);return c;},addEventListener(type,fn){const list=this.listeners.get(type)||[];list.push(fn);this.listeners.set(type,list);},
      focus(){doc.activeElement=this;},emit(type){for(const fn of this.listeners.get(type)||[])fn({target:this});},
      querySelector(sel){if(sel==='.code')return this.marker||null;return null;},
      closest(sel){if(sel==='a[href]')return this.tagName==='A'&&(this.attrs.href||this.href)?this:this.parentNode?.closest(sel)||null;if(sel==='[data-property-code]')return this.attrs['data-property-code']?this:this.parentNode?.closest(sel)||null;if(sel==='.propertyCard')return this.className==='propertyCard'?this:this.parentNode?.closest(sel)||null;return null;}
    };all.push(n);return n;
  }
  const doc={createElement:element,getElementById:id=>all.find(n=>n.id===id)||null,
    addEventListener(type,fn){const list=listeners.get(type)||[];list.push(fn);listeners.set(type,list);},
    emit(type,target){for(const fn of listeners.get(type)||[])fn({target});},referrer:'https://www.google.com/search?q=PRIVATE_QUERY&email=PRIVATE_EMAIL#PRIVATE_HASH',readyState:'complete'};
  doc.head=element('head');doc.body=element('body');
  Object.defineProperty(doc,'cookie',{get:()=>{if(overrides.cookiesFail)throw Error('Synthetic cookie access denied');return [...cookieMap].map(([k,v])=>k+'='+v).join('; ');},set:value=>{if(overrides.cookiesFail)throw Error('Synthetic cookie access denied');cookieWrites.push(value);const [name,content]=value.split(';')[0].split('=');if(value.includes('Max-Age=0'))cookieMap.delete(name);else cookieMap.set(name,content);}});
  const stored=new Map();let clock=Date.UTC(2026,10,17,12);
  const win={document:doc,location:{origin:ORIGIN,hostname:'corretorluisfernando.com.br',pathname:'/imovel/TEST001/',search:'?email=PRIVATE_EMAIL&phone=PRIVATE_PHONE',hash:'#PRIVATE_HASH'},navigator:{},
    localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)}};
  if(overrides.saved!==undefined)stored.set(KEY,JSON.stringify(overrides.saved));
  if(overrides.storageFails)win.localStorage={getItem(){throw Error('Synthetic blocked storage');},setItem(){throw Error('Synthetic blocked storage');}};
  Object.assign(win.location,overrides.location||{});Object.assign(win.navigator,overrides.navigator||{});
  const config={measurementId:ID,privacyReviewed:true,pagePath:'/imovel/TEST001/',detailCode:'TEST001',...overrides.config};
  const controller=api.createController({window:win,document:doc,config,now:()=>clock});
  function anchor(href,id){const a=element('a');a.setAttribute('href',href);if(id)a.setAttribute('data-property-code',id);return a;}
  const commands=()=>Array.from(win.dataLayer||[],args=>Array.from(args));
  return {win,doc,all,listeners,controller,config,commands,stored,cookieMap,cookieWrites,anchor,
    scripts:()=>doc.head.children.filter(n=>n.tagName==='SCRIPT'),events:()=>commands().filter(a=>a[0]==='event'),tick:ms=>clock+=ms,now:()=>clock};
}
const results=[];function test(name,run){try{run();results.push({name,pass:true});console.log('PASS '+name);}catch(e){results.push({name,pass:false,error:e.message});console.error('FAIL '+name+': '+e.stack);}}
test('No ID, invalid ID, unreviewed privacy or nonofficial origin disables all collection and UI',()=>{
  for(const opts of [{config:{measurementId:''}},{config:{measurementId:'G-INVALID?<script>'}},{config:{privacyReviewed:false}},{config:{enabled:false}},{location:{origin:'https://preview.example.test'}},{location:{origin:'http://127.0.0.1:8099'}}]){
    const f=fixture(opts);assert.equal(f.controller.start(),false);assert.equal(f.scripts().length,0);assert.equal(f.doc.body.children.length,0);assert.equal(f.listeners.size,0);assert.equal(f.commands().length,0);
  }
});
test('First visit creates equivalent accept/reject choices but no Google script or event',()=>{
  const f=fixture();assert.equal(f.controller.start(),true);assert.equal(f.controller.state().consent,null);assert.equal(f.scripts().length,0);assert.equal(f.commands().length,0);
  const panel=f.doc.getElementById('lf-analytics-consent');assert.equal(panel.hidden,false);assert.equal(panel.attrs.role,'region');
  const choices=f.all.filter(n=>n.tagName==='BUTTON'&&/^(Aceitar|Recusar) medição$/.test(n.textContent));assert.equal(choices.length,2);assert.equal(choices[0].className,choices[1].className);assert.equal(choices[0].style.background,choices[1].style.background);
});
test('Explicit denial preserves navigation, persists a choice and never downloads Google',()=>{
  const f=fixture();f.controller.start();f.all.find(n=>n.textContent==='Recusar medição').emit('click');
  assert.equal(f.controller.state().consent,'denied');assert.equal(f.scripts().length,0);assert.equal(f.commands().length,0);assert.equal(f.doc.getElementById('lf-analytics-consent').hidden,true);
  assert.equal(JSON.parse(f.stored.get(KEY)).value,'denied');assert.equal(f.cookieMap.get('unrelated'),'PRESERVE');assert(!f.cookieMap.has('_ga'));
  f.doc.getElementById('lf-analytics-preferences').emit('click');assert.equal(f.doc.getElementById('lf-analytics-consent').hidden,false);
});
test('Explicit grant sends only safe page/property metadata, no private URL, title or referrer query',()=>{
  const f=fixture();f.controller.start();f.all.find(n=>n.textContent==='Aceitar medição').emit('click');assert.equal(f.scripts().length,1);
  assert.equal(f.scripts()[0].src,'https://www.googletagmanager.com/gtag/js?id='+ID);assert.equal(f.scripts()[0].referrerPolicy,'origin');
  const events=f.events();assert.deepEqual(events.map(x=>x[1]),['page_view','view_item']);
  assert.equal(events[0][2].page_location,ORIGIN+'/imovel/TEST001/');assert.equal(events[0][2].page_referrer,'https://www.google.com/');
  assert.deepEqual(events[1][2].items,[{item_id:'TEST001',item_name:'TEST001',item_category:'Imóvel'}]);
  const serialized=JSON.stringify(f.commands());for(const secret of ['PRIVATE_QUERY','PRIVATE_EMAIL','PRIVATE_PHONE','PRIVATE_HASH'])assert(!serialized.includes(secret));
  assert.equal(f.commands().find(x=>x[0]==='config')[2].send_page_view,false);
});
test('Ads consent remains denied and signal/personalization collection is disabled',()=>{
  const f=fixture();f.controller.start();f.controller.choose('granted');
  for(const command of f.commands().filter(x=>x[0]==='consent')){
    for(const key of ['ad_storage','ad_user_data','ad_personalization'])assert.equal(command[2][key],'denied');
  }
  const parameters=f.commands().find(x=>x[0]==='config')[2];assert.equal(parameters.allow_google_signals,false);assert.equal(parameters.allow_ad_personalization_signals,false);
});
test('Revocation disables future events, removes only GA cookies and does not duplicate loader or page events',()=>{
  const f=fixture();f.controller.start();f.controller.choose('granted');const before=f.events().length;f.controller.choose('denied');
  assert.equal(f.win['ga-disable-'+ID],true);assert.equal(f.commands().at(-1)[2].analytics_storage,'denied');
  assert(!f.cookieMap.has('_ga'));assert(!f.cookieMap.has('_ga_TEST12345'));assert.equal(f.cookieMap.get('unrelated'),'PRESERVE');
  f.doc.emit('click',f.anchor('https://wa.me/5511000000000?text=PRIVATE_MESSAGE','TEST001'));assert.equal(f.events().length,before);
  f.controller.choose('granted');assert.equal(f.scripts().length,1);assert.equal(f.events().length,before);f.tick(1000);
  f.doc.emit('click',f.anchor('https://wa.me/5511000000000?text=PRIVATE_MESSAGE','TEST001'));assert.equal(f.events().length,before+1);
});
test('Repeated start cannot add duplicate handlers, scripts or initial page events',()=>{
  const f=fixture();f.controller.start();f.controller.choose('granted');assert.equal(f.controller.start(),false);assert.equal(f.listeners.get('click').length,1);assert.equal(f.scripts().length,1);assert.equal(f.events().length,2);
});
test('Stored denial does not download Google; recent stored opt-in can resume and old/future choices cannot',()=>{
  const at=Date.UTC(2026,10,17,12);
  for(const [value,count]of [['denied',0],['granted',1]]){const f=fixture({saved:{version:1,value,at}});f.controller.start();assert.equal(f.scripts().length,count);assert.equal(f.controller.state().consent,value);}
  for(const saved of [{version:1,value:'granted',at:at+1},{version:1,value:'granted',at:at-181*86400000},{version:0,value:'granted',at},{version:1,value:'unknown',at}]){const f=fixture({saved});f.controller.start();assert.equal(f.controller.state().consent,null);assert.equal(f.scripts().length,0);}
});
test('Privacy signals override remembered consent until a fresh explicit choice',()=>{
  const at=Date.UTC(2026,10,17,12);
  for(const navigator of [{globalPrivacyControl:true},{doNotTrack:'1'}]){const f=fixture({navigator,saved:{version:1,value:'granted',at}});f.controller.start();assert.equal(f.controller.state().consent,'denied');assert.equal(f.scripts().length,0);f.controller.choose('granted');assert.equal(f.scripts().length,1);}
});
test('Blocked local storage does not accidentally consent or prevent an explicit in-memory opt-in',()=>{
  const f=fixture({storageFails:true});f.controller.start();assert.equal(f.controller.state().consent,null);assert.equal(f.scripts().length,0);f.controller.choose('granted');assert.equal(f.scripts().length,1);
});
test('Blocked cookie access and Google loader failure do not break privacy controls or navigation',()=>{
  const f=fixture({cookiesFail:true});f.controller.start();assert.doesNotThrow(()=>f.controller.choose('denied'));assert.equal(f.controller.state().consent,'denied');
  f.controller.choose('granted');f.scripts()[0].onerror();assert.equal(f.controller.state().tagLoadFailed,true);assert.doesNotThrow(()=>f.controller.choose('denied'));assert.equal(f.win['ga-disable-'+ID],true);
});
test('Property selection uses only public code and deduplicates the same rapid click',()=>{
  const f=fixture();f.controller.start();f.controller.choose('granted');const a=f.anchor('/imovel/TEST002/?email=PRIVATE_EMAIL#PRIVATE_HASH','TEST002');
  f.doc.emit('click',a);f.doc.emit('click',a);assert.equal(f.events().filter(x=>x[1]==='select_item').length,1);
  f.tick(751);f.doc.emit('click',a);assert.equal(f.events().filter(x=>x[1]==='select_item').length,2);
  assert(!JSON.stringify(f.events()).includes('PRIVATE_'));assert.deepEqual(f.events().at(-1)[2].items,[{item_id:'TEST002',item_name:'TEST002',item_category:'Imóvel'}]);
});
test('WhatsApp links record contact intent, never URLs, telephone, message, form fields or confirmed leads',()=>{
  const f=fixture();f.controller.start();f.controller.choose('granted');
  f.doc.emit('click',f.anchor('https://wa.me/5511000000000?text=PRIVATE_MESSAGE%20PRIVATE_EMAIL','TEST003'));f.tick(1000);
  f.doc.emit('click',f.anchor('https://api.whatsapp.com/send?phone=5511000000000&text=PRIVATE_MESSAGE','TEST003'));
  const events=f.events().filter(x=>x[1]==='contact_click');assert.equal(events.length,2);assert.equal(events[0][2].item_id,'TEST003');assert.equal(events[0][2].contact_channel,'whatsapp');
  const payload=JSON.stringify(f.events());for(const secret of ['5511000000000','PRIVATE_MESSAGE','PRIVATE_EMAIL','link_url','generate_lead'])assert(!payload.includes(secret));
  assert(!f.listeners.has('submit'));
});
test('External or nonhttps links and invalid property codes cannot emit analytics payloads',()=>{
  const f=fixture({config:{detailCode:''}});f.controller.start();f.controller.choose('granted');const before=f.events().length;
  for(const href of ['https://example.test/imovel/TEST001/','javascript:alert(1)','http://wa.me/5511000000000','/imovel/bad@email/'])f.doc.emit('click',f.anchor(href,'INVALID@CODE'));
  assert.equal(f.events().length,before);
});
test('Path/referrer sanitizers drop queries, hashes, credentials, percent encodings and other hosts',()=>{
  assert.equal(api.safePath('/imovel/TEST001/'),'/imovel/TEST001/');assert.equal(api.safePath('/imoveis/casa-venda-centro/TEST001/'),'/imoveis/casa-venda-centro/TEST001/');
  for(const value of ['//example.test/','/imovel/TEST001/?phone=PRIVATE','/imovel/TEST001/#email','/pessoa%40email/','https://example.test/'])assert.equal(api.safePath(value),'/');
  assert.equal(api.safeReferrer('https://www.google.com/search?q=PRIVATE'),'https://www.google.com/');for(const value of ['http://example.test/private','https://user:pass@example.test/private','javascript:alert(1)'])assert.equal(api.safeReferrer(value),'');
});
test('Browser bootstrap remains a singleton if the same asset is included twice',()=>{
  const f=fixture(),config=f.doc.createElement('script');config.id='site-analytics-config';config.textContent=JSON.stringify(f.config);f.doc.body.appendChild(config);
  const context=vm.createContext({window:f.win,URL,Map,Date,Number,Array,JSON,Set,encodeURIComponent});
  const source=fs.readFileSync(file,'utf8');vm.runInContext(source,context);vm.runInContext(source,context);
  assert(f.win.LF_SITE_ANALYTICS);assert.equal(f.listeners.get('click').length,1);assert.equal(f.all.filter(n=>n.id==='lf-analytics-consent').length,1);assert.equal(f.scripts().length,0);
});
console.log(JSON.stringify({tests:results.length,passed:results.filter(r=>r.pass).length,syntheticOnly:true,network:false,results},null,2));
if(results.some(r=>!r.pass))process.exitCode=1;
