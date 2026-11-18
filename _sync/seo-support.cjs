'use strict';
const VERSION='original-seo-20261118-v3';
const ORIGIN='https://corretorluisfernando.com.br';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json=v=>JSON.stringify(v).replace(/</g,'\\u003c');
function compactFeed(feed,detailCode=''){
  return {...feed,items:feed.items.map(p=>({...p,descricao:p.codigo===detailCode?p.descricao:(p.descricao||'').slice(0,220),fotos:p.codigo===detailCode?p.fotos:p.fotos.slice(0,1)}))};
}
function enhanceImages(html,detailCode=''){
  let principal=false;
  return html.replace(/<img\b([^>]*?)\/?\s*>/g,(_match,attributes)=>{
    let attrs=attributes;
    const portrait=/src="\/luis-fernando\.jpg"/.test(attrs);
    if(!/\bwidth=/.test(attrs))attrs+=' width="'+(portrait?'1086':'600')+'"';
    if(!/\bheight=/.test(attrs))attrs+=' height="'+(portrait?'1448':'400')+'"';
    if(!/\bdecoding=/.test(attrs))attrs+=' decoding="async"';
    const hero=portrait||!!detailCode&&!principal&&/loading="eager"/.test(attrs);
    if(hero){attrs=attrs.replace(/\sloading="[^"]*"/,'');attrs+=' loading="eager" fetchpriority="high"';principal=true;}
    else if(!/\bloading=/.test(attrs))attrs+=' loading="lazy"';
    return '<img'+attrs+'>';
  });
}
function structuredList(page,items){
  const url=ORIGIN+page.route;
  return '<script type="application/ld+json">'+json({'@context':'https://schema.org','@graph':[
    {'@type':'CollectionPage','@id':url+'#pagina',url,name:page.title,description:page.description,inLanguage:'pt-BR',isPartOf:{'@id':ORIGIN+'/#site'},publisher:{'@id':ORIGIN+'/#corretor'},mainEntity:{'@id':url+'#lista'},breadcrumb:{'@id':url+'#caminho'}},
    {'@type':'ItemList','@id':url+'#lista',numberOfItems:page.itemsCodes.length,itemListElement:page.itemsCodes.map((code,i)=>({'@type':'ListItem',position:i+1,url:ORIGIN+'/imovel/'+encodeURIComponent(code)+'/',name:items.get(code)?.titulo||code}))},
    {'@type':'BreadcrumbList','@id':url+'#caminho',itemListElement:page.breadcrumbs.map((b,i)=>({'@type':'ListItem',position:i+1,name:b.name,item:ORIGIN+b.url}))}
  ]})+'</script>';
}
function localNavigation(pages){
  return '<nav class="seoLinks" aria-label="Seleções por cidade, bairro e condomínio">'+pages.map(p=>'<a href="'+esc(p.route)+'">'+esc(p.h1)+'</a>').join('')+'</nav>';
}
function redirectHTML(destination){
  const url=new URL(destination,ORIGIN);if(url.origin!==ORIGIN)throw Error('Redirect outside canonical site.');
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Anúncio atualizado | Luis Fernando</title><link rel="canonical" href="'+esc(url.href)+'"><meta http-equiv="refresh" content="0;url='+esc(url.href)+'"></head><body><p>O anúncio está disponível em seu endereço permanente.</p><a href="'+esc(url.pathname)+'">Abrir anúncio</a></body></html>';
}
function privacyHTML(analyticsEnabled){
  return '<main class="seoPage"><a href="/">← Voltar ao site</a><h1>Privacidade e preferências de medição</h1><p>Este site divulga imóveis atendidos por Luis Fernando, corretor de imóveis, CRECI 244254-F, em Mogi Guaçu/SP e região.</p><h2>Contato e dados enviados por você</h2><p>Os botões de atendimento e o formulário de proprietários abrem o WhatsApp. O envio da mensagem depende da sua confirmação no aplicativo. Informações fornecidas no atendimento são usadas para responder à sua solicitação. Evite enviar documentos ou informações sensíveis no primeiro contato.</p><h2>Medição de audiência</h2><p>'+(analyticsEnabled?'Utilizamos Google Analytics 4 somente após sua escolha de aceitar a medição. São registrados visitas às páginas, códigos públicos dos imóveis e cliques de intenção de contato. Não enviamos ao Analytics nomes, telefones, campos do formulário ou textos de mensagens do WhatsApp. Publicidade e personalização de anúncios permanecem desativadas.':'A medição pelo Google Analytics não está habilitada neste momento. O site funciona sem aceitar cookies de análise.')+'</p><p>A preferência de medição fica armazenada neste navegador por até 180 dias. Quando a medição estiver disponível, você poderá alterá-la pelo botão “Preferências de privacidade”. A recusa não impede o acesso aos anúncios ou ao atendimento. A revogação interrompe os próximos eventos e tenta remover os cookies de medição deste domínio; ela não apaga automaticamente dados já processados pelo Google.</p><h2>Recursos necessários para o catálogo</h2><p>O navegador pode guardar uma cópia do catálogo público para conservar os anúncios durante falhas de conexão. Essa cópia não contém cadastros privados do CRM. Fotos e anúncios são consultados nos serviços que hospedam este site e o catálogo.</p><h2>Serviços externos e seus direitos</h2><p>Google, GitHub, Supabase e WhatsApp podem tratar dados técnicos conforme seus próprios serviços e políticas. A medição, quando aceita, pode envolver processamento fora do Brasil. Para dúvidas sobre dados fornecidos ao corretor, correção ou solicitação de exclusão, entre em contato pelo canal profissional indicado no site.</p><p><a href="https://policies.google.com/privacy" rel="noreferrer">Política de Privacidade do Google</a> · <a href="https://tools.google.com/dlpage/gaoptout" rel="noreferrer">Opção de desativação do Analytics</a></p><p>Esta página descreve o funcionamento técnico atual. Não substitui a revisão jurídica das políticas e operações de tratamento do negócio.</p></main>';
}
module.exports={VERSION,compactFeed,enhanceImages,structuredList,localNavigation,redirectHTML,privacyHTML};
