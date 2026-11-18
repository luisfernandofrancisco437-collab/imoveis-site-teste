// Public CRM projection -> original template. No private credentials or CRM writes.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const React=require('react'),ts=require('typescript'),{renderToStaticMarkup}=require('react-dom/server');
const {buildLocalPages}=require('./local-seo.cjs');
const {VERSION,compactFeed,enhanceImages,structuredList,localNavigation,redirectHTML,privacyHTML}=require('./seo-support.cjs');
const siteConfig=require('./site-config.json');
const ORIGIN='https://corretorluisfernando.com.br',API='https://xwettgyajktagtqpbpnk.supabase.co/functions/v1/crm-public-catalog',ENDPOINT=API+'/catalog?site=luis-fernando';
const base=__dirname,templates=path.join(base,'templates'),assets=path.join(base,'assets');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeJSON=v=>JSON.stringify(v).replace(/</g,'\\u003c'),hash=v=>crypto.createHash('sha256').update(v).digest('hex');
function validate(raw){
  assert(raw&&raw.schemaVersion===1&&raw.site==='luis-fernando'&&typeof raw.revision==='string'&&raw.revision.length<=150&&raw.revision.length>0,'Unconfirmed public feed.');
  assert(Array.isArray(raw.items)&&raw.items.length<=5000,'Invalid public catalogue.');const seen=new Set();
  const items=raw.items.map(p=>{assert(p&&/^[A-Z0-9_-]{1,80}$/.test(p.codigo)&&!seen.has(p.codigo),'Invalid/duplicate public code.');seen.add(p.codigo);assert(['Venda','Locação','Locação e Venda'].includes(p.operacao));assert(['Disponível','Em negociação','Reservado','Vendido','Alugado','Indisponível'].includes(p.status));
    const out={codigo:p.codigo};for(const k of ['titulo','tipo','cidade','bairro','condominio','descricao','uf'])if(typeof p[k]==='string')out[k]=p[k].slice(0,k==='descricao'?12000:300);
    assert(out.tipo&&out.cidade,'Property data incomplete.');out.bairro=out.bairro||'';out.titulo=out.titulo||out.tipo+(out.condominio?' · '+out.condominio:'');Object.assign(out,{operacao:p.operacao,status:p.status});
    if(!out.uf&&out.cidade.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()==='mogi guacu')out.uf='SP';
    for(const k of ['valor','valorVenda','valorLocacao','area','dormitorios','suites','banheiros','vagas','valorCondominio','iptu'])if(typeof p[k]==='number'&&Number.isFinite(p[k])&&p[k]>=0)out[k]=p[k];
    assert(p.operacao==='Locação'||out.valorVenda>0,'Sale price missing.');assert(p.operacao==='Venda'||out.valorLocacao>0,'Rent missing.');out.valor=p.operacao==='Locação'?out.valorLocacao:out.valorVenda;
    out.fotos=(Array.isArray(p.fotos)?p.fotos:[]).map(url=>{const u=new URL(url);assert(u.origin===new URL(API).origin&&u.pathname.startsWith('/functions/v1/crm-public-catalog/photo/')&&!u.username&&!u.password&&!u.hash&&u.searchParams.get('site')==='luis-fernando','Photo outside public proxy.');assert(!u.searchParams.has('token'),'Signed/private photo refused.');return u.href;});assert(out.fotos.length<=100);out.foto=out.fotos[0]||'';
    if(Array.isArray(p.caracteristicas))out.caracteristicas=p.caracteristicas.filter(x=>typeof x==='string').map(x=>x.slice(0,150)).slice(0,100);return out;});
  return {schemaVersion:1,site:'luis-fernando',revision:raw.revision,sourceRevision:raw.sourceRevision,updatedAt:raw.updatedAt,items};
}
function active(p){return ['Disponível','Em negociação','Reservado'].includes(p.status);}
function render(feed,previousManifest=[],options={}){
  feed=validate(feed);const all=feed.items,available=all.filter(active),byCode=new Map(all.map(p=>[p.codigo,p])),files=new Map(),cache=new Map();let seo;
  function load(file){file=path.resolve(file);assert(file.startsWith(templates+path.sep));if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
    const req=id=>{if(id==='react'||id==='react/jsx-runtime')return require(id);if(id==='next/navigation')return {notFound(){throw Error('Public page not found.');}};assert(id.startsWith('.'),'Unexpected template dependency.');const target=path.resolve(path.dirname(file),id),rel=path.relative(templates,target).replace(/\\/g,'/');
      if(rel==='lib/catalogo')return {carregarImoveis:async()=>available,carregarImovel:async code=>byCode.get(code)||null,linkWhatsapp:(p,origin)=>'https://wa.me/5519989817571?text='+encodeURIComponent(`Olá, Luis Fernando! Tenho interesse no imóvel ${p.codigo} - ${p.titulo}. Gostaria de mais informações. ${origin||ORIGIN}/imovel/${encodeURIComponent(p.codigo)}/`)};
      if(rel==='lib/seo'&&seo)return seo;if(rel==='app/SiteAnalytics')return {__esModule:true,default:()=>null,registrarEvento:()=>{}};if(target.endsWith('.css'))return {};const resolved=[target,target+'.tsx',target+'.ts'].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());assert(resolved,'Missing original template: '+rel);return load(resolved);};
    vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename:file})(req,m,m.exports);return m.exports;}
  const oldSeo=load(path.join(templates,'lib/seo.ts'));seo={...oldSeo,urlImovel:p=>'/imovel/'+encodeURIComponent(p.codigo)+'/',urlFoto:(code,index=0)=>byCode.get(code)?.fotos[index]||''};
  const Layout=load(path.join(templates,'app/layout.tsx')).default;
  const layoutHTML=renderToStaticMarkup(React.createElement(Layout,{children:null}));
  const globalSchema=layoutHTML.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/)?.[0];
  assert(globalSchema,'Original public business/site schema missing.');
  const markup=el=>renderToStaticMarkup(el).replace(/<div class="specs">([\s\S]*?)<\/div>/g,(_,s)=>'<div class="specs">'+s.replace(/<span>0 (?:dorm\.|vagas|m²)<\/span>/g,'')+'</div>').replace(/<p>([0-9.]+ dormitórios · [0-9.]+ vagas · [0-9.]+ m²)<\/p>/g,(_,s)=>'<p>'+s.split(' · ').filter(x=>!/^0 (?:dormitórios|vagas|m²)$/.test(x)).join(' · ')+'</p>');
  const urls=new Map(),seoState={schemaVersion:1,routes:{},aliases:{}};
  const previousState=options.previousState?.schemaVersion===1?options.previousState:{routes:{}};
  const builtAt=options.builtAt||new Date().toISOString();
  const localPages=buildLocalPages(available,{origin:ORIGIN,urlImovel:seo.urlImovel,escapeHTML:esc});
  const localLinks=localNavigation(localPages);
  const analytics={measurementId:typeof siteConfig.analytics?.measurementId==='string'?siteConfig.analytics.measurementId:'',privacyReviewed:siteConfig.analytics?.privacyReviewed===true};
  const photo=p=>p?.foto||ORIGIN+'/luis-fernando.jpg';
  function page(route,body,meta={},detailCode=''){
    const canonical=ORIGIN+route,title=typeof meta.title==='string'?meta.title:'Imóveis em Mogi Guaçu | Luis Fernando, Corretor',description=meta.description||'Imóveis para venda e locação em Mogi Guaçu/SP e região. Luis Fernando, CRECI 244254-F.';
    body=enhanceImages(body,detailCode).replace(/href="(\/(?!\/)[^"?#.]*[^/"?#])"/g,'href="$1/"');
    const fingerprint=hash(JSON.stringify({body,title,description,index:meta.robots?.index!==false,version:VERSION}));
    const prior=previousState.routes?.[route];
    const lastmod=prior?.hash===fingerprint&&/^\d{4}-\d{2}-\d{2}T/.test(prior.lastmod||'')&&Number.isFinite(Date.parse(prior.lastmod))&&Date.parse(prior.lastmod)<=Date.parse(builtAt)?prior.lastmod:builtAt;
    seoState.routes[route]={hash:fingerprint,lastmod};
    const config={endpoint:ENDPOINT,site:'luis-fernando',...(detailCode?{detailCode}:{})};
    const image=meta.openGraph?.images?.[0]?.url||photo(byCode.get(detailCode));
    const html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><meta name="description" content="'+esc(description)+'"><meta name="robots" content="'+(meta.robots?.index===false?'noindex,follow':'index,follow,max-image-preview:large')+'"><link rel="canonical" href="'+esc(canonical)+'"><meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(description)+'"><meta property="og:url" content="'+esc(canonical)+'"><meta property="og:image" content="'+esc(image)+'"><meta property="og:locale" content="pt_BR"><meta property="og:site_name" content="Luis Fernando · Corretor de Imóveis"><meta property="og:type" content="'+esc(meta.openGraph?.type||'website')+'"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="'+esc(title)+'"><meta name="twitter:description" content="'+esc(description)+'"><meta name="twitter:image" content="'+esc(image)+'"><meta name="referrer" content="strict-origin-when-cross-origin"><link rel="icon" href="/favicon.svg"><link rel="preconnect" href="https://xwettgyajktagtqpbpnk.supabase.co" crossorigin><link rel="stylesheet" href="/original.css"><link rel="stylesheet" href="/original-compat.css"><script src="/original.js" defer></script><script src="/site-catalogo-live.js" defer></script><script src="/site-analytics.js" defer></script></head><body>'+globalSchema+body+'<footer class="seoLinks"><a href="/privacidade/">Privacidade e preferências</a></footer><script type="application/json" id="site-sync-config">'+safeJSON(config)+'</script><script type="application/json" id="site-analytics-config">'+safeJSON({...analytics,pagePath:route,...(detailCode?{detailCode}:{})})+'</script><script type="application/json" id="catalogo-live-snapshot">'+safeJSON(compactFeed(feed,detailCode))+'</script></body></html>';
    files.set(route==='/'?'index.html':route.replace(/^\//,'').replace(/\/$/,'')+'/index.html',html);if(meta.robots?.index!==false)urls.set(ORIGIN+route,{lastmod,photo:byCode.get(detailCode)?.foto});return html;
  }
  return (async()=>{
    const Home=load(path.join(templates,'app/CatalogoHome.tsx')).default,detail=load(path.join(templates,'lib/pagina-imovel.tsx')),local=load(path.join(templates,'lib/listagem-local.tsx'));
    page('/',markup(React.createElement(Home,{catalogoInicial:available})).replace('</main>','<section class="seoHome"><h2>Imóveis por cidade, bairro e condomínio</h2>'+localLinks+'</section></main>'));
    for(const p of all){const m=await detail.metadadosImovel(p.codigo);m.robots={index:active(p),follow:true};page(seo.urlImovel(p),markup(await detail.PaginaPublicaImovel({codigo:p.codigo})),m,p.codigo);const alias=oldSeo.urlImovel(p).replace(/^\//,'').replace(/\/$/,'')+'/index.html';files.set(alias,redirectHTML(seo.urlImovel(p)));seoState.aliases[alias]=p.codigo;}
    for(const entry of localPages)page(entry.route,entry.body+structuredList(entry,byCode),{title:entry.title,description:entry.description});
    for(const tipo of ['imoveis','casas','apartamentos'])for(const operacao of ['venda','locacao']){const route=`/${tipo}/${operacao}/mogi-guacu-sp/`;if(files.has(route.slice(1)+'index.html'))continue;const m=local.metadataLista(tipo,operacao);m.robots={index:false,follow:true};page(route,markup(await local.ListagemLocal({tipo,operacao})),m);}
    const category=load(path.join(templates,'app/imoveis/[categoria]/page.tsx'));for(const slug of Object.keys(seo.categorias)){const params=Promise.resolve({categoria:slug}),body=markup(await category.default({params})),m=await category.generateMetadata({params});if(!body.includes('<article '))m.robots={index:false,follow:true};page('/imoveis/'+slug+'/',body,m);}
    for(const slug of ['financiamento-imobiliario','minha-casa-minha-vida','luis-fernando-corretor-imoveis-mogi-guacu']){const m=load(path.join(templates,'app',slug,'page.tsx'));page('/'+slug+'/',markup(React.createElement(m.default)),m.metadata);}
    const missing=page('/404/','<main class="notFound glass"><h1>Anúncio indisponível</h1><p>Consulte as opções disponíveis no catálogo.</p><a href="/">Ver imóveis</a></main>',{title:'Anúncio indisponível',robots:{index:false}}).replace(/<link rel="canonical"[^>]*>/,'');files.delete('404/index.html');files.set('404.html',missing);
    const historical=[...previousManifest,...Object.keys(previousState.aliases||{})];
    for(const name of historical){if(files.has(name)||!name.endsWith('/index.html')||!/^imove(?:l|is)\/[a-zA-Z0-9_/-]+\/index\.html$/.test(name)||name.includes('..'))continue;const code=name.split('/').at(-2);if(byCode.has(code)){files.set(name,redirectHTML('/imovel/'+encodeURIComponent(code)+'/'));seoState.aliases[name]=code;}}
    page('/privacidade/',privacyHTML(!!analytics.measurementId&&analytics.privacyReviewed),{title:'Privacidade e preferências | Luis Fernando',description:'Saiba como funcionam o atendimento, o catálogo e a medição de audiência deste site.',robots:{index:false,follow:true}});
    for(const name of fs.readdirSync(assets))if(fs.statSync(path.join(assets,name)).isFile())files.set(name,fs.readFileSync(path.join(assets,name)));
    files.set('acesso/index.html',fs.readFileSync(path.join(assets,'acesso','index.html')));files.set('CNAME','corretorluisfernando.com.br\n');files.set('.nojekyll','');
    files.set('robots.txt','User-agent: *\nAllow: /\nDisallow: /_sync/\nSitemap: '+ORIGIN+'/sitemap.xml\n');
    files.set('sitemap.xml','<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'+[...urls].map(([u,s])=>'<url><loc>'+esc(u)+'</loc><lastmod>'+esc(s.lastmod)+'</lastmod>'+(s.photo?'<image:image><image:loc>'+esc(s.photo)+'</image:loc></image:image>':'')+'</url>').join('')+'</urlset>');
    files.set('seo-state.json',JSON.stringify(seoState));
    files.set('public-revision.json',JSON.stringify({schemaVersion:1,site:feed.site,revision:feed.revision,updatedAt:feed.updatedAt,sourceRevision:feed.sourceRevision,templateVersion:VERSION}));
    return {files,manifest:[...files.keys()].filter(n=>n.endsWith('.html')),total:all.length,available:available.length,revision:feed.revision};
  })();
}
async function run(){
  assert(process.argv.includes('--live'),'Use --live; fixtures may not be published.');const response=await fetch(ENDPOINT,{signal:AbortSignal.timeout(25000),redirect:'error',headers:{Accept:'application/json'}});assert(response.ok,'Public CRM feed unavailable: '+response.status);const feed=validate(await response.json());
  const force=process.argv.includes('--force');let previous={},previousState={};try{const r=await fetch(ORIGIN+'/public-revision.json',{signal:AbortSignal.timeout(12000),redirect:'error'});if(r.ok)previous=await r.json();}catch{}
  if(!force&&previous.revision===feed.revision&&previous.templateVersion===VERSION){if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,'changed=false\n');console.log('Public revision unchanged; no deployment.');return;}
  try{const r=await fetch(ORIGIN+'/seo-state.json',{signal:AbortSignal.timeout(12000),redirect:'error'});if(r.ok){const text=await r.text();assert(text.length<2000000);const raw=JSON.parse(text);if(raw.schemaVersion===1&&Object.keys(raw.routes||{}).length<=10000&&Object.keys(raw.aliases||{}).length<=20000)previousState=raw;}}catch{}
  const oldManifestFile=path.join(base,'generated-manifest.json'),old=fs.existsSync(oldManifestFile)?JSON.parse(fs.readFileSync(oldManifestFile)):[];const result=await render(feed,old,{previousState});
  const output=fs.mkdtempSync(path.resolve(base,'../site-dist-build-'));
  for(const [name,body]of result.files){const target=path.resolve(output,name);assert(target.startsWith(output+path.sep));fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,body);}
  // A fresh artifact intentionally omits retired pages and historical photo copies.
  if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,'changed=true\nartifact_path='+output+'\n');console.log(JSON.stringify({total:result.total,available:result.available,revision:result.revision,files:result.files.size,output}));
}
if(require.main===module)run().catch(e=>{console.error(e.message);process.exitCode=1;});module.exports={render,validate,active,ENDPOINT,API};
