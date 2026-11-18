import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { carregarImovel, carregarImoveis, type Imovel } from './catalogo';
import { acaoImovel, descricaoSeoImovel, jsonLd, localizacaoImovel, ORIGEM, textoBusca, tipoSchemaImovel, tituloSeoImovel, urlFoto, urlImovel } from './seo';
import WhatsappButton from '../app/imovel/[codigo]/WhatsappButton';

const dinheiro = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 2 });
const disponivel = (imovel: Imovel) => ['disponivel', 'em negociacao', 'reservado'].includes(textoBusca(imovel.status || ''));
const disponibilidadeOferta = (imovel: Imovel) => disponivel(imovel) ? (textoBusca(imovel.status) === 'disponivel' ? 'https://schema.org/InStock' : 'https://schema.org/LimitedAvailability') : /vendid|alugad/.test(textoBusca(imovel.status || '')) ? 'https://schema.org/SoldOut' : 'https://schema.org/OutOfStock';
const verbo = acaoImovel;

export async function metadadosImovel(codigo: string): Promise<Metadata> {
  const imovel = await carregarImovel(codigo);
  if (!imovel) return { title: 'Imóvel não encontrado', robots: { index: false, follow: true } };
  const title = tituloSeoImovel(imovel), description = descricaoSeoImovel(imovel), url = ORIGEM + urlImovel(imovel), foto = imovel.foto || imovel.fotos?.length ? new URL(urlFoto(imovel.codigo,0), ORIGEM).href : undefined;
  return { title, description, robots: { index: disponivel(imovel), follow: true }, alternates: { canonical: url }, openGraph: { title, description, url, type: 'article', locale:'pt_BR', images: foto ? [{ url: foto, alt: `Foto de ${imovel.tipo} em ${localizacaoImovel(imovel)}` }] : [] }, twitter: { card: foto ? 'summary_large_image' : 'summary', title, description, images: foto ? [foto] : [] } };
}

function esquemaImovel(imovel: Imovel) {
  const pagina = ORIGEM + urlImovel(imovel),tipo=tipoSchemaImovel(imovel.tipo);
  const ofertas:Record<string,unknown>[]=[],positive=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>0;
  const vender=positive(imovel.valorVenda)?imovel.valorVenda:imovel.operacao==='Venda'?imovel.valor:undefined;
  const alugar=positive(imovel.valorLocacao)?imovel.valorLocacao:imovel.operacao==='Locação'?imovel.valor:undefined;
  const oferta=(acao:'venda'|'locacao',preco:number)=>({ '@type':'Offer','@id':`${pagina}#oferta-${acao}`,priceCurrency:'BRL',price:preco,availability:disponibilidadeOferta(imovel),url:pagina,seller:{'@id':`${ORIGEM}/#corretor`},businessFunction:`https://purl.org/goodrelations/v1#${acao==='locacao'?'LeaseOut':'Sell'}`,...(acao==='locacao'?{priceSpecification:{'@type':'UnitPriceSpecification',price:preco,priceCurrency:'BRL',unitCode:'MON'}}:{}) });
  if(imovel.operacao!=='Locação'&&positive(vender))ofertas.push(oferta('venda',vender!));
  if(imovel.operacao!=='Venda'&&positive(alugar))ofertas.push(oferta('locacao',alugar!));
  const endereco={ '@type':'PostalAddress',addressLocality:imovel.cidade||undefined,addressRegion:imovel.uf||undefined,addressCountry:'BR' };
  const entidade:Record<string,unknown>={ '@type':tipo,'@id':`${pagina}#imovel`,name:imovel.titulo||tituloSeoImovel(imovel),description:imovel.descricao||descricaoSeoImovel(imovel),url:pagina,identifier:imovel.codigo,image:[...new Set((imovel.fotos||[]).map((_,i)=>new URL(urlFoto(imovel.codigo,i),ORIGEM).href))],address:endereco,mainEntityOfPage:{'@id':`${pagina}#anuncio`} };
  if(tipo!=='Place'){
    if(positive(imovel.dormitorios))entidade.numberOfBedrooms=imovel.dormitorios;
    if(positive(imovel.banheiros))entidade.numberOfBathroomsTotal=imovel.banheiros;
    const area=imovel.areaUtil||imovel.areaConstruida;if(positive(area))entidade.floorSize={'@type':'QuantitativeValue',value:area,unitCode:'MTK'};
  }
  const propriedades:Record<string,unknown>[]=[];
  if(positive(imovel.area))propriedades.push({'@type':'PropertyValue',name:'Área informada',value:imovel.area,unitCode:'MTK'});
  if(positive(imovel.vagas))propriedades.push({'@type':'PropertyValue',name:'Vagas de garagem',value:imovel.vagas});
  if(imovel.bairro)propriedades.push({'@type':'PropertyValue',name:'Bairro',value:imovel.bairro});
  if(imovel.condominio)propriedades.push({'@type':'PropertyValue',name:'Condomínio',value:imovel.condominio});
  if(propriedades.length)entidade.additionalProperty=propriedades;
  const anuncio:Record<string,unknown>={'@type':'RealEstateListing','@id':`${pagina}#anuncio`,url:pagina,name:tituloSeoImovel(imovel),description:descricaoSeoImovel(imovel),identifier:'anuncio-'+imovel.codigo,inLanguage:'pt-BR',isPartOf:{'@id':`${ORIGEM}/#site`},publisher:{'@id':`${ORIGEM}/#corretor`},mainEntity:{'@id':`${pagina}#imovel`},breadcrumb:{'@id':`${pagina}#caminho`}};
  if(ofertas.length)anuncio.offers=ofertas.length===1?ofertas[0]:ofertas;
  for(const [campo,chave]of [['publicadoEm','dateCreated'],['atualizadoEm','dateModified']] as const){const valor=imovel[campo];if(typeof valor==='string'&&/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(valor)&&Number.isFinite(Date.parse(valor)))anuncio[chave]=valor;}
  return {'@context':'https://schema.org','@graph':[entidade,anuncio,{'@type':'BreadcrumbList','@id':`${pagina}#caminho`,itemListElement:[{'@type':'ListItem',position:1,name:'Imóveis',item:ORIGEM+'/'},{'@type':'ListItem',position:2,name:imovel.titulo||tituloSeoImovel(imovel),item:pagina}]}]};
}

export async function PaginaPublicaImovel({ codigo }: { codigo:string }) {
  const imovel = await carregarImovel(codigo); if (!imovel) notFound();
  const todos = await carregarImoveis().catch(() => []);
  const semelhantes = todos.filter(i => i.codigo !== imovel.codigo && disponivel(i) && (textoBusca(i.tipo) === textoBusca(imovel.tipo) || textoBusca(i.bairro) === textoBusca(imovel.bairro))).slice(0, 4);
  const fotos = imovel.fotos?.length ? imovel.fotos : [];
  const local = [imovel.bairro, imovel.cidade, imovel.uf].filter(Boolean).join(' · ');
  return <main className="detailPage">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(esquemaImovel(imovel))}}/>
    <header className="detailHeader glass"><a className="brand" href="/"><span className="brandMark"><i></i><b></b></span><span><strong><em>Luis</em> Fernando</strong><small>Corretor de imóveis</small></span></a><nav aria-label="Navegação"><a href="/">Todos os imóveis</a></nav></header>
    <nav aria-label="Caminho da página"><a href="/">Imóveis</a> › <span>{imovel.tipo} em {imovel.cidade}</span> › <span>{imovel.codigo}</span></nav>
    <section className="detailHero"><div className={`detailGallery glass${fotos.length > 1 ? ' detailGalleryGrid' : ''}`}>{fotos.length ? fotos.map((_, indice) => <img key={`${imovel.codigo}-${indice}`} src={urlFoto(imovel.codigo, indice)} alt={`${indice === 0 ? 'Foto principal' : `Foto ${indice + 1}`} de ${imovel.tipo.toLowerCase()} ${verbo(imovel)} em ${localizacaoImovel(imovel)}`} loading={indice ? 'lazy' : 'eager'} decoding="async" width="1200" height="800"/>) : <div className="detailPlaceholder" role="img" aria-label="Imóvel sem foto publicada">⌂</div>}</div>
    <article className="detailInfo glass"><div><span className="operation sale">{imovel.operacao}</span><span className="detailCode">Código {imovel.codigo}</span></div><p className="location">{local}</p><h1>{imovel.tipo} {verbo(imovel)} em {localizacaoImovel(imovel,true)}</h1><p><strong>Situação:</strong> {imovel.status || 'Disponível'}</p><div className="detailSpecs">{imovel.dormitorios > 0 && <span><b>{imovel.dormitorios}</b> dormitórios</span>}{imovel.suites ? <span><b>{imovel.suites}</b> suítes</span>:null}{imovel.banheiros ? <span><b>{imovel.banheiros}</b> banheiros</span>:null}{imovel.vagas > 0 && <span><b>{imovel.vagas}</b> vagas</span>}{imovel.area > 0 && <span><b>{imovel.area}</b> m²</span>}</div>{imovel.operacao === 'Locação e Venda' ? <div className="dualPrices"><div><small>Locação mensal</small><strong>{dinheiro(imovel.valorLocacao || 0)}/mês</strong></div><div><small>Venda</small><strong>{dinheiro(imovel.valorVenda || 0)}</strong></div></div> : <strong className="detailPrice">{dinheiro(imovel.valor)}{imovel.operacao === 'Locação' ? '/mês' : ''}</strong>}<WhatsappButton imovel={imovel}/></article></section>
    <section className="glass seoText"><h2>Descrição do imóvel</h2><p>{imovel.descricao?.trim() || descricaoSeoImovel(imovel)}</p></section>
    <section className="glass seoText"><h2>Características e valores</h2><ul>{imovel.areaConstruida ? <li>Área construída: {imovel.areaConstruida} m²</li>:null}{imovel.areaUtil ? <li>Área útil: {imovel.areaUtil} m²</li>:null}{imovel.areaTerreno ? <li>Área do terreno: {imovel.areaTerreno} m²</li>:null}{imovel.condominio ? <li>Condomínio residencial: {imovel.condominio}</li>:null}{imovel.valorCondominio != null ? <li>Condomínio: {dinheiro(imovel.valorCondominio)}</li>:null}{imovel.iptu != null ? <li>IPTU: {dinheiro(imovel.iptu)}</li>:null}{imovel.caracteristicas?.map(c => <li key={c}>{c}</li>)}</ul></section>
    <section className="glass seoText"><h2>Localização</h2><p>{localizacaoImovel(imovel,true)}</p>{imovel.proximidades?.length ? <><h3>Proximidades informadas</h3><ul>{imovel.proximidades.map(p=><li key={p}>{p}</li>)}</ul></>:null}</section>
    {!disponivel(imovel) && <section className="glass seoText"><h2>Este imóvel não está mais disponível</h2><p>Veja abaixo imóveis semelhantes atualmente publicados ou fale com Luis Fernando para encontrar outra opção.</p></section>}
    {semelhantes.length > 0 && <section><h2>Imóveis semelhantes</h2><div className="seoResults">{semelhantes.map(i=><article className="glass" key={i.codigo}><a href={urlImovel(i)}>{i.foto&&<img src={urlFoto(i.codigo, 0)} alt={`${i.tipo} em ${i.bairro}, ${i.cidade}`} loading="lazy" width="600" height="400"/>}<h3>{i.titulo}</h3></a><p>{i.operacao} · {i.bairro} · {i.cidade}</p><a href={urlImovel(i)}>Ver detalhes do imóvel</a></article>)}</div></section>}
  </main>;
}
