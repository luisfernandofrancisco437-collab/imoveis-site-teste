'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {render,validate,API}=require('./render.cjs');
const photo=API+'/photo/TEST001/'+'a'.repeat(64)+'.webp?site=luis-fernando';
const item={codigo:'TEST001',titulo:'Casa de teste',tipo:'Casa',cidade:'Mogi Guaçu',uf:'SP',bairro:'Bairro de teste',operacao:'Locação e Venda',status:'Disponível',valorVenda:300000,valorLocacao:1800,valor:300000,dormitorios:2,vagas:1,area:90,fotos:[photo],foto:photo,descricao:'<texto literal de teste>',prop:'MUST_NOT_PUBLISH',tel:'MUST_NOT_PUBLISH',rua:'MUST_NOT_PUBLISH',obs:'MUST_NOT_PUBLISH'};
const fixture=items=>({schemaVersion:1,site:'luis-fernando',revision:'synthetic-test',sourceRevision:5,updatedAt:'2026-11-13T12:00:00Z',items});
const scripts=html=>[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m=>{const v=JSON.parse(m[1]);return v['@graph']||[v];});
(async()=>{
  const result=await render(fixture([item]),['imovel/REMOVIDO/index.html','imoveis/slug/REMOVIDO/index.html','imoveis/slug-antigo/TEST001/index.html'],{builtAt:'2026-11-17T12:00:00Z'});
  const home=result.files.get('index.html'),detail=result.files.get('imovel/TEST001/index.html'),sitemap=result.files.get('sitemap.xml');
  assert(home.includes('class="heroVisual glass"'));assert(home.includes('site-sync-config'));assert(home.includes('catalogo-live-snapshot'));assert(!home.includes('MUST_NOT_PUBLISH'));assert(!detail.includes('MUST_NOT_PUBLISH'));assert(!home.includes('authenticated/crm-private'));
  assert(home.includes('R$'));assert(detail.includes('1800'));assert(sitemap.includes('/imovel/TEST001/'));
  assert(!result.files.has('imovel/REMOVIDO/index.html'));assert(!result.files.has('imoveis/slug/REMOVIDO/index.html'),'Retired URL must become a host404, not an HTTP200 error page');
  const alias=result.files.get('imoveis/slug-antigo/TEST001/index.html');assert(alias.includes('http-equiv="refresh"'));assert(alias.includes('rel="canonical" href="https://corretorluisfernando.com.br/imovel/TEST001/"'));
  assert(Buffer.from(result.files.get('original.css')).equals(fs.readFileSync(path.join(__dirname,'assets/original.css'))));assert(result.files.get('acesso/index.html'));
  assert(detail.includes('<meta property="og:image" content="'+photo+'">'));assert(detail.includes('<meta property="og:type" content="article">'));
  const physical=scripts(detail).find(s=>s.identifier==='TEST001'),listing=scripts(detail).find(s=>s['@type']==='RealEstateListing');assert.deepEqual(physical.image,[photo]);assert.equal(listing.offers.length,2);assert.equal(listing.mainEntity['@id'],physical['@id']);
  assert(scripts(home).some(s=>s['@type']==='RealEstateAgent'));assert(scripts(home).some(s=>s['@type']==='WebSite'));
  const cents=await render(fixture([{...item,valorVenda:300000.49,valorLocacao:1800.75,valorCondominio:274.74,iptu:0}]));for(const name of ['index.html','imovel/TEST001/index.html']){const html=cents.files.get(name).split('<script type="application/json"')[0];assert(html.includes('300.000,49'));assert(html.includes('1.800,75'));}assert(cents.files.get('imovel/TEST001/index.html').includes('274,74'));
  for(const status of ['Indisponível','Vendido','Alugado']){const unavailable=await render(fixture([{...item,status}]));assert.equal(unavailable.available,0);const html=unavailable.files.get('imovel/TEST001/index.html');assert(html.includes('Este imóvel não está mais disponível'));assert(html.includes('noindex,follow'));assert(!unavailable.files.get('sitemap.xml').includes('/imovel/TEST001/'));assert([scripts(html).find(s=>s['@type']==='RealEstateListing').offers].flat().every(o=>/OutOfStock|SoldOut/.test(o.availability)));}
  const empty=await render(fixture([]));assert.equal(empty.available,0);assert(!empty.files.has('imovel/TEST001/index.html'));
  assert.throws(()=>validate(fixture([{...item,fotos:['https://evil.invalid/private']}])));assert.throws(()=>validate(fixture([item,item])));assert.throws(()=>validate(fixture([{...item,valorLocacao:undefined}])));
  assert(sitemap.includes('<lastmod>2026-11-17T12:00:00Z</lastmod>'));assert(sitemap.includes('<image:loc>'));assert(!sitemap.includes('/404/'));assert(!sitemap.includes('/privacidade/'));
  const state=JSON.parse(result.files.get('seo-state.json'));
  const unchanged=await render({...fixture([item]),sourceRevision:1000},[],{previousState:state,builtAt:'2026-11-18T12:00:00Z'});assert.equal(JSON.parse(unchanged.files.get('seo-state.json')).routes['/imovel/TEST001/'].lastmod,'2026-11-17T12:00:00Z');
  const changed=await render(fixture([{...item,valorLocacao:2000}]),[],{previousState:state,builtAt:'2026-11-18T12:00:00Z'});assert.equal(JSON.parse(changed.files.get('seo-state.json')).routes['/imovel/TEST001/'].lastmod,'2026-11-18T12:00:00Z');assert(changed.files.get('imoveis/slug-antigo/TEST001/index.html').includes('http-equiv="refresh"'));
  const local=result.files.get('imoveis/venda/mogi-guacu-sp/index.html');assert(scripts(local).some(s=>s['@type']==='CollectionPage'));assert(scripts(local).some(s=>s['@type']==='ItemList'));assert(home.includes('Imóveis por cidade, bairro e condomínio'));assert(result.files.has('privacidade/index.html'));
  assert.equal(result.files.get('google0a6f2cca6dd9424b.html').toString().trim(),'google-site-verification: google0a6f2cca6dd9424b.html');assert(detail.includes('fetchpriority="high"'));assert(home.includes('width="1086" height="1448"'));assert(home.includes('site-analytics-config'));
  for(const [name,html]of result.files)if(name.endsWith('.html')&&name!=='acesso/index.html'&&!/^google/.test(name)){scripts(String(html));if(!String(html).includes('http-equiv="refresh"'))assert.equal((String(html).match(/<h1\b/g)||[]).length,1,name);assert(!String(html).includes('https://corretorluisfernando.com.brhttps://'));}
  console.log('PASS: templates, metadata, JSON-LD, cents, aliases, removed/retired pages, sitemap/lastmod, local hubs, consent configuration, images, verification and private-field exclusion.');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
