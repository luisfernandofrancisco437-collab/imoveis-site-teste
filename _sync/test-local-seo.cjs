'use strict';
const assert=require('node:assert/strict'),{buildLocalPages,localSlug}=require('./local-seo.cjs');
const origin='https://corretorluisfernando.com.br',helpers={origin,urlImovel:item=>'/imovel/'+item.codigo+'/'};
const base={codigo:'CA01',titulo:'Casa de teste',tipo:'Casa',cidade:'Mogi Guaçu',uf:'SP',bairro:'Jardim São Pedro',condominio:'Residencial de teste',operacao:'Venda',status:'Disponível',valorVenda:300000.49,dormitorios:2,vagas:1,area:90};
const same={...base,codigo:'CA02',valorVenda:350000.75},dual={...base,codigo:'CA03',operacao:'Locação e Venda',valorVenda:400000,valorLocacao:1800.75};
const checks=[];
function test(name,run){run();checks.push(name);console.log('PASS '+name);}
test('city/type/bairro/condomínio pages use factual available public inventory',()=>{
  const pages=buildLocalPages([base,same,dual],helpers);
  const city=pages.find(page=>page.route==='/imoveis/venda/mogi-guacu-sp/');assert(city);assert.equal(city.itemsCodes.length,3);
  assert(pages.some(page=>page.route==='/casas/venda/mogi-guacu-sp/'));
  assert(pages.some(page=>page.route==='/imoveis/venda/mogi-guacu-sp/bairros/jardim-sao-pedro/'));
  assert(pages.some(page=>page.route==='/imoveis/venda/mogi-guacu-sp/condominios/residencial-de-teste/'));
  assert(pages.find(page=>page.kind==='condominio').h1.startsWith('Casas à venda no condomínio'));
  assert(city.body.includes('300.000,49'));assert(city.body.includes('350.000,75'));
  assert(city.body.includes('<h1>'));assert(city.body.includes('<h2>'));assert(city.body.includes('<h3>'));
});
test('dual operation creates rental page but does not invent a second local offer',()=>{
  const pages=buildLocalPages([base,same,dual],helpers),rental=pages.find(page=>page.route==='/casas/locacao/mogi-guacu-sp/');
  assert(rental);assert.deepEqual(rental.itemsCodes,['CA03']);assert(rental.body.includes('1.800,75/mês'));assert(!rental.body.includes('400.000'));
  assert(!pages.some(page=>page.operation==='locacao'&&['bairro','condominio'].includes(page.kind)));
});
test('sold/rented/unavailable/unknown statuses and duplicate codes cannot inflate totals',()=>{
  const pages=buildLocalPages([base,base,...['Vendido','Alugado','Indisponível','Arquivado'].map((status,i)=>({...same,codigo:'X'+i,status}))],helpers);
  assert.equal(pages.length,2);assert(pages.every(page=>page.itemsCodes.length===1));
  assert.equal(buildLocalPages([],helpers).length,0);
});
test('reservations and negotiation are active but empty locations never generate empty pages',()=>{
  const pages=buildLocalPages([{...base,status:'Reservado',bairro:'',condominio:''},{...same,status:'Em negociação',bairro:'',condominio:''},{...same,codigo:'BAD',cidade:''}],helpers);
  assert.equal(pages.length,2);assert(pages.every(page=>page.itemsCodes.length===2));assert(!pages.some(page=>['bairro','condominio'].includes(page.kind)));
});
test('stable escaped links and source allowlist never publish private fields',()=>{
  const item={...base,titulo:'Casa <script>alert(1)</script>',bairro:'Bairro <em>teste</em>',prop:'PRIVATE_OWNER',tel:'PRIVATE_PHONE',rua:'PRIVATE_STREET',obs:'PRIVATE_NOTE',valorLocacao:0};
  const pages=buildLocalPages([item,{...item,codigo:'CA02'}],helpers),html=pages.map(page=>page.body).join('');
  assert(!html.includes('<script>'));assert(html.includes('&lt;script&gt;'));assert(!html.includes('PRIVATE_'));assert(html.includes('href="/imovel/CA01/"'));assert(!html.includes('undefined'));
});
test('same labels differing only in accents/case share a group; punctuation does not collide',()=>{
  assert.equal(localSlug('São Pedro'),localSlug('Sao Pedro'));assert.notEqual(localSlug('A & B'),localSlug('A B'));
  assert.notEqual(localSlug('X'.repeat(90)+'A'),localSlug('X'.repeat(90)+'B'));
  const pages=buildLocalPages([base,{...same,bairro:'jardim sao pedro'}],helpers);
  assert.equal(pages.filter(page=>page.kind==='bairro').length,1);assert(pages.find(page=>page.kind==='bairro').itemsCodes.length===2);
});
test('unknown/zero prices and missing characteristics are omitted rather than invented',()=>{
  const pages=buildLocalPages([{...base,valorVenda:0,valor:0,dormitorios:undefined,vagas:null,area:undefined}],helpers),html=pages.map(page=>page.body).join('');
  assert(!html.includes('R$'));assert(!html.includes('0 dormitórios'));assert(!html.includes('undefined'));assert(html.includes('Consulte o valor'));
});
test('same-origin paths only, public proxy photos only, and bounded deterministic output',()=>{
  assert.throws(()=>buildLocalPages([base],{...helpers,urlImovel:()=> '//evil.test/a'}));
  const pages=buildLocalPages([base,same,dual],{...helpers,maxPages:2});assert.equal(pages.length,2);
  assert.deepEqual(pages,buildLocalPages([dual,same,base],{...helpers,maxPages:2}));
  const html=buildLocalPages([{...base,foto:'https://private.test/storage/v1/object/authenticated/photo?token=SECRET'}],helpers).map(page=>page.body).join('');assert(!html.includes('SECRET'));assert(!html.includes('<img'));
  assert.equal(buildLocalPages([base],{...helpers,maxPages:0}).length,0);
});
console.log(JSON.stringify({checks:checks.length,passed:checks.length,synthetic:true,network:false}));
