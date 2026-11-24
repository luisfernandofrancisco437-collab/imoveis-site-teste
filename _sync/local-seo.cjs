// Factual, bounded local landing pages derived only from the public CRM feed.
// No network access, private fields, invented amenities or ranking claims.
'use strict';
const crypto=require('node:crypto');
const ACTIVE=new Set(['disponivel','em negociacao','reservado']);
const TYPES={
  casa:['casas','Casas'],apartamento:['apartamentos','Apartamentos'],terreno:['terrenos','Terrenos'],
  sobrado:['sobrados','Sobrados'],kitnet:['kitnets','Kitnets'],studio:['studios','Studios'],flat:['flats','Flats'],
  comercial:['imoveis-comerciais','Imóveis comerciais'],sala:['salas','Salas comerciais'],loja:['lojas','Lojas'],
  galpao:['galpoes','Galpões'],barracao:['barracoes','Barracões'],chacara:['chacaras','Chácaras'],sitio:['sitios','Sítios'],
};
const fallbackEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=value=>typeof value==='string'?value.replace(/\s+/g,' ').trim().slice(0,180):'';
const fold=value=>text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const shortHash=value=>crypto.createHash('sha256').update(value).digest('hex').slice(0,10);

// Ordinary Portuguese place names stay readable. Distinct punctuation/truncated
// names get a stable suffix, so a new collision never renames an existing URL.
function localSlug(value){
  const key=fold(value),plain=key.replace(/\s+/g,'-');
  const slug=key.replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  if(!slug)return 'local-'+shortHash(key);
  return plain===slug&&slug.length<=80?slug:slug.slice(0,65).replace(/-$/,'')+'-'+shortHash(key);
}
function validPrice(value){return typeof value==='number'&&Number.isFinite(value)&&value>0;}
const money=value=>value.toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:0,maximumFractionDigits:2});
function priceFor(item,operation){
  const value=operation==='locacao'?item.valorLocacao:item.valorVenda;
  if(validPrice(value))return value;
  if((operation==='locacao'&&item.operacao==='Locação'||operation==='venda'&&item.operacao==='Venda')&&validPrice(item.valor))return item.valor;
  return null;
}
function operations(item){return item.operacao==='Locação e Venda'?['venda','locacao']:item.operacao==='Venda'?['venda']:item.operacao==='Locação'?['locacao']:[];}
function cityInfo(item){
  const city=text(item.cidade),uf=/^[A-Z]{2}$/.test(String(item.uf||'').toUpperCase())?String(item.uf).toUpperCase():'';
  return {city,uf,key:fold(city)+'|'+uf,slug:localSlug(city)+(uf?'-'+uf.toLowerCase():''),label:city+(uf?'/'+uf:'')};
}
function safePath(value,origin){
  if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//'))throw Error('Local SEO property URL must be a same-origin path.');
  const parsed=new URL(value,origin);if(parsed.origin!==origin||parsed.username||parsed.password)throw Error('Unexpected local SEO property URL.');
  return parsed.pathname+parsed.search+parsed.hash;
}
function publicPhoto(item){
  const value=typeof item.foto==='string'?item.foto:Array.isArray(item.fotos)?item.fotos[0]:'';
  if(typeof value!=='string'||!value)return '';
  try{
    const url=new URL(value);
    return url.origin==='https://xwettgyajktagtqpbpnk.supabase.co'&&!url.username&&!url.password&&!url.hash&&
      url.pathname.startsWith('/functions/v1/crm-public-catalog/photo/')&&url.searchParams.get('site')==='luis-fernando'&&!url.searchParams.has('token')?url.href:'';
  }catch{return '';}
}
function attributes(item){
  const fields=[['dormitorios','dormitório','dormitórios'],['vagas','vaga','vagas']];const values=[];
  for(const [key,singular,plural]of fields)if(Number.isInteger(item[key])&&item[key]>0)values.push(item[key]+' '+(item[key]===1?singular:plural));
  if(typeof item.area==='number'&&Number.isFinite(item.area)&&item.area>0)values.push(item.area.toLocaleString('pt-BR')+' m²');
  return values;
}
function buildLocalPages(rawItems,helpers={}){
  if(!Array.isArray(rawItems))throw Error('Local SEO requires the public catalogue array.');
  const origin=new URL(helpers.origin||'https://corretorluisfernando.com.br').origin;
  if(!origin.startsWith('https://'))throw Error('Local SEO requires the canonical HTTPS origin.');
  if(typeof helpers.urlImovel!=='function')throw Error('Local SEO requires the canonical property URL helper.');
  const escape=typeof helpers.escapeHTML==='function'?helpers.escapeHTML:fallbackEscape;
  const requested=helpers.maxPages??200,maxPages=Math.min(300,Math.max(0,Number.isInteger(requested)?requested:200));
  const seen=new Set(),items=[];
  for(const item of rawItems){
    if(!item||typeof item!=='object'||!ACTIVE.has(fold(item.status))||!/^[A-Z0-9_-]{1,80}$/.test(item.codigo||'')||!text(item.cidade)||!text(item.tipo)||!operations(item).length||seen.has(item.codigo))continue;
    seen.add(item.codigo);items.push(item);
  }
  // Determinism matters: feed ordering must not reorder page generation or URLs.
  items.sort((a,b)=>(Date.parse(b.publicadoEm)||0)-(Date.parse(a.publicadoEm)||0)||a.codigo.localeCompare(b.codigo,'en'));
  const groups=new Map();
  function add(kind,item,operation,typeKey=''){
    const city=cityInfo(item),label=kind==='bairro'?text(item.bairro):kind==='condominio'?text(item.condominio):'';
    if((kind==='bairro'||kind==='condominio')&&!label)return;
    const key=[operation,city.key,kind,typeKey,fold(label)].join('|');
    let group=groups.get(key);
    if(!group){group={kind,operation,city,label,typeKey,items:[]};groups.set(key,group);}
    group.items.push(item);
  }
  for(const item of items)for(const operation of operations(item)){
    add('cidade',item,operation);const typeKey=fold(item.tipo);
    if(TYPES[typeKey])add('tipo',item,operation,typeKey);
    add('bairro',item,operation);add('condominio',item,operation);
  }
  const result=[];
  const rank={cidade:0,tipo:1,bairro:2,condominio:3};
  const sorted=[...groups.values()].filter(group=>!['bairro','condominio'].includes(group.kind)||group.items.length>=2)
    .sort((a,b)=>rank[a.kind]-rank[b.kind]||a.city.key.localeCompare(b.city.key,'en')||a.operation.localeCompare(b.operation,'en')||a.typeKey.localeCompare(b.typeKey,'en')||fold(a.label).localeCompare(fold(b.label),'en'));
  for(const group of sorted){
    if(result.length>=maxPages)break;
    const {kind,operation,city,label,typeKey}=group,action=operation==='locacao'?'para alugar':'à venda';
    const groupTypes=new Set(group.items.map(item=>fold(item.tipo)));
    const onlyType=groupTypes.size===1?[...groupTypes][0]:'';
    const plural=kind==='tipo'?TYPES[typeKey][1]:['bairro','condominio'].includes(kind)&&TYPES[onlyType]?TYPES[onlyType][1]:'Imóveis';
    const place=kind==='bairro'?'no bairro '+label+', '+city.label:kind==='condominio'?'no condomínio '+label+', '+city.label:'em '+city.label;
    const h1=plural+' '+action+' '+place;
    const root='/imoveis/'+operation+'/'+city.slug+'/';
    const route=kind==='tipo'?'/'+TYPES[typeKey][0]+'/'+operation+'/'+city.slug+'/':kind==='bairro'?root+'bairros/'+localSlug(label)+'/':kind==='condominio'?root+'condominios/'+localSlug(label)+'/':root;
    const values=group.items.map(item=>priceFor(item,operation)).filter(value=>value!==null),min=values.length?Math.min(...values):null,max=values.length?Math.max(...values):null;
    const knownPrices=values.length===group.items.length;
    const priceSummary=!knownPrices?'Consulte os valores informados em cada anúncio.':min===max?'Valor anunciado: '+money(min)+(operation==='locacao'?'/mês.':'.'):'Valores anunciados entre '+money(min)+' e '+money(max)+(operation==='locacao'?'/mês.':'.');
    const count=group.items.length,summary=count+' '+(count===1?'imóvel publicado':'imóveis publicados')+' '+action+' '+place+'.';
    const description=summary+' '+priceSummary+' Compare fotos e características com Luis Fernando, corretor de imóveis.';
    const title=h1.length>95?h1:h1+' | Luis Fernando';
    const breadcrumbs=[{name:'Início',url:'/'},{name:'Imóveis '+action+' em '+city.label,url:root}];
    if(kind!=='cidade')breadcrumbs.push({name:kind==='tipo'?plural:label,url:route});
    const crumbHTML='<nav aria-label="Navegação estrutural"><ol>'+breadcrumbs.map((crumb,index)=>'<li>'+(index===breadcrumbs.length-1?'<span aria-current="page">'+escape(crumb.name)+'</span>':'<a href="'+escape(crumb.url)+'">'+escape(crumb.name)+'</a>')+'</li>').join('')+'</ol></nav>';
    const cards=group.items.map(item=>{
      const url=safePath(helpers.urlImovel(item),origin),image=publicPhoto(item),price=priceFor(item,operation),detail=attributes(item);
      const location=[text(item.bairro),text(item.condominio),city.label].filter(Boolean).join(' · ');
      const heading=text(item.titulo)||text(item.tipo)+' '+action+' em '+city.city;
      return '<article class="glass"><a href="'+escape(url)+'" data-site-event="property_view" data-property-code="'+escape(item.codigo)+'">'+(image?'<img src="'+escape(image)+'" alt="'+escape(text(item.tipo)+' '+action+' em '+[text(item.bairro),city.city].filter(Boolean).join(', '))+'" loading="lazy" decoding="async" width="600" height="400">':'')+'<h3>'+escape(heading)+'</h3></a><p>'+escape(location)+' · Código '+escape(item.codigo)+'</p>'+(detail.length?'<p>'+escape(detail.join(' · '))+'</p>':'')+(price!==null?'<p><strong>'+escape(money(price)+(operation==='locacao'?'/mês':''))+'</strong></p>':'<p>Consulte o valor no anúncio.</p>')+'<a href="'+escape(url)+'">Ver detalhes do imóvel</a></article>';
    }).join('');
    const typeCounts=new Map();for(const item of group.items){const label=text(item.tipo);typeCounts.set(label,(typeCounts.get(label)||0)+1);}
    const typeSummary=[...typeCounts].map(([type,count])=>type+': '+count).join(' · ');
    const body='<main class="seoPage"><a href="/">← Luis Fernando · Corretor de Imóveis</a>'+crumbHTML+'<header><span class="eyebrow">'+escape(city.label)+'</span><h1>'+escape(h1)+'</h1><p>'+escape(summary)+' '+escape(priceSummary)+'</p></header><section><h2>Ofertas publicadas no CRM</h2><p>'+escape(typeSummary)+'. Os valores são anunciados, não incluem automaticamente condomínio, IPTU ou outras despesas. Consulte os detalhes de cada imóvel e confirme a disponibilidade no atendimento.</p><div class="seoResults">'+cards+'</div></section><section><h2>Compare os imóveis desta seleção</h2><p>Confira as fotos e as características informadas em cada anúncio. Dormitórios, vagas e área aparecem somente quando cadastrados. As informações desta página são atualizadas a partir dos imóveis publicados no CRM.</p><a href="/">Consultar todos os imóveis disponíveis</a></section></main>';
    result.push({route,title,description,h1,body,itemsCodes:group.items.map(item=>item.codigo),kind,operation,city:city.label,location:label,breadcrumbs,priceMin:min,priceMax:max});
  }
  const routes=new Set();for(const page of result){if(routes.has(page.route))throw Error('Duplicate local SEO route: '+page.route);routes.add(page.route);}
  return result;
}
module.exports={buildLocalPages,localSlug};
