import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { carregarImovel, carregarImoveis, type Imovel } from './catalogo';
import { jsonLd, ORIGEM, textoBusca, urlFoto, urlImovel } from './seo';
import WhatsappButton from '../app/imovel/[codigo]/WhatsappButton';

const dinheiro = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 2 });
const disponivel = (imovel: Imovel) => ['disponivel', 'em negociacao', 'reservado'].includes(textoBusca(imovel.status || ''));
const disponibilidadeOferta = (imovel: Imovel) => disponivel(imovel) ? (textoBusca(imovel.status) === 'disponivel' ? 'https://schema.org/InStock' : 'https://schema.org/LimitedAvailability') : /vendid|alugad/.test(textoBusca(imovel.status || '')) ? 'https://schema.org/SoldOut' : 'https://schema.org/OutOfStock';
const verbo = (imovel: Imovel) => imovel.operacao === 'Locação' ? 'para alugar' : imovel.operacao === 'Locação e Venda' ? 'para alugar ou comprar' : 'à venda';
const precoPrincipal = (imovel: Imovel) => imovel.operacao === 'Locação' ? imovel.valorLocacao || imovel.valor : imovel.valorVenda || imovel.valor;
const tituloSeo = (imovel: Imovel) => `${imovel.tipo} ${verbo(imovel)} em ${imovel.bairro}, ${imovel.cidade}${imovel.dormitorios ? ` | ${imovel.dormitorios} quartos` : ''}${precoPrincipal(imovel) ? ` | ${dinheiro(precoPrincipal(imovel))}${imovel.operacao === 'Locação' ? '/mês' : ''}` : ''}`;
const descricaoSeo = (imovel: Imovel) => [
  `${imovel.tipo} ${verbo(imovel)} em ${imovel.bairro}, ${imovel.cidade}${imovel.uf ? `/${imovel.uf}` : ''}`,
  imovel.dormitorios ? `com ${imovel.dormitorios} dormitórios` : '', imovel.suites ? `${imovel.suites} suítes` : '',
  imovel.vagas ? `${imovel.vagas} vagas` : '', (imovel.areaUtil || imovel.areaConstruida || imovel.area) ? `${imovel.areaUtil || imovel.areaConstruida || imovel.area} m²` : '',
  precoPrincipal(imovel) ? `${imovel.operacao === 'Locação' ? 'Aluguel' : 'Valor'} de ${dinheiro(precoPrincipal(imovel))}.` : '', 'Veja fotos e detalhes.'
].filter(Boolean).join(', ').replace(', .', '.').slice(0, 300);

export async function metadadosImovel(codigo: string): Promise<Metadata> {
  const imovel = await carregarImovel(codigo);
  if (!imovel) return { title: 'Imóvel não encontrado', robots: { index: false, follow: true } };
  const title = tituloSeo(imovel), description = descricaoSeo(imovel), url = ORIGEM + urlImovel(imovel), foto = imovel.foto ? new URL(urlFoto(imovel.codigo,0), ORIGEM).href : undefined;
  return { title, description, robots: { index: disponivel(imovel), follow: true }, alternates: { canonical: url }, openGraph: { title, description, url, type: 'article', images: foto ? [{ url: foto, alt: `Foto de ${imovel.tipo} em ${imovel.bairro}, ${imovel.cidade}` }] : [] }, twitter: { card: foto ? 'summary_large_image' : 'summary', title, description, images: foto ? [foto] : [] } };
}

function esquemaImovel(imovel: Imovel) {
  const pagina = ORIGEM + urlImovel(imovel), tipoNormalizado = textoBusca(imovel.tipo);
  const tipo = tipoNormalizado.includes('apartamento') ? 'Apartment' : tipoNormalizado.includes('casa') || tipoNormalizado.includes('sobrado') ? 'House' : 'Residence';
  const ofertas: Record<string, unknown>[] = [];
  if ((imovel.operacao === 'Venda' || imovel.operacao === 'Locação e Venda') && (imovel.valorVenda || imovel.valor)) ofertas.push({ '@type':'Offer', priceCurrency:'BRL', price:imovel.valorVenda || imovel.valor, availability: disponibilidadeOferta(imovel), url:pagina, businessFunction:'https://purl.org/goodrelations/v1#Sell' });
  if ((imovel.operacao === 'Locação' || imovel.operacao === 'Locação e Venda') && (imovel.valorLocacao || imovel.valor)) ofertas.push({ '@type':'Offer', priceCurrency:'BRL', price:imovel.valorLocacao || imovel.valor, availability: disponibilidadeOferta(imovel), url:pagina, businessFunction:'https://purl.org/goodrelations/v1#LeaseOut' });
  const residencia: Record<string, unknown> = { '@type':tipo, '@id':`${pagina}#imovel`, name:imovel.titulo, description:imovel.descricao || descricaoSeo(imovel), url:pagina, identifier:imovel.codigo, image:(imovel.fotos||[]).map((_,i)=>new URL(urlFoto(imovel.codigo,i), ORIGEM).href), numberOfBedrooms:imovel.dormitorios || undefined, numberOfBathroomsTotal:imovel.banheiros || undefined, address:{ '@type':'PostalAddress', streetAddress:[imovel.logradouro,imovel.numero,imovel.complemento].filter(Boolean).join(', ') || undefined, addressLocality:imovel.cidade || undefined, addressRegion:imovel.uf || undefined, postalCode:imovel.cep || undefined, addressCountry:'BR' } };
  const area = imovel.areaUtil || imovel.areaConstruida || imovel.area;
  if (area) residencia.floorSize = { '@type':'QuantitativeValue', value:area, unitCode:'MTK' };
  if (imovel.latitude && imovel.longitude) residencia.geo = { '@type':'GeoCoordinates', latitude:imovel.latitude, longitude:imovel.longitude };
  if (ofertas.length) residencia.offers = ofertas.length === 1 ? ofertas[0] : ofertas;
  return { '@context':'https://schema.org', '@graph':[residencia,{ '@type':'BreadcrumbList', itemListElement:[{ '@type':'ListItem', position:1, name:'Imóveis', item:ORIGEM+'/' },{ '@type':'ListItem', position:2, name:`${imovel.tipo} em ${imovel.cidade}`, item:`${ORIGEM}/imoveis/${imovel.operacao === 'Locação' ? 'locacao' : 'venda'}/mogi-guacu-sp` },{ '@type':'ListItem', position:3, name:imovel.titulo, item:pagina }] }] };
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
    <section className="detailHero"><div className={`detailGallery glass${fotos.length > 1 ? ' detailGalleryGrid' : ''}`}>{fotos.length ? fotos.map((_, indice) => <img key={`${imovel.codigo}-${indice}`} src={urlFoto(imovel.codigo, indice)} alt={`${indice === 0 ? 'Fachada ou foto principal' : `Ambiente ${indice + 1}`} de ${imovel.tipo.toLowerCase()} ${verbo(imovel)} em ${imovel.bairro}, ${imovel.cidade}`} loading={indice ? 'lazy' : 'eager'} decoding="async" width="1200" height="800"/>) : <div className="detailPlaceholder" role="img" aria-label="Imóvel sem foto publicada">⌂</div>}</div>
    <article className="detailInfo glass"><div><span className="operation sale">{imovel.operacao}</span><span className="detailCode">Código {imovel.codigo}</span></div><p className="location">{local}</p><h1>{imovel.tipo} {verbo(imovel)} em {imovel.bairro}, {imovel.cidade}</h1><p><strong>Situação:</strong> {imovel.status || 'Disponível'}</p><div className="detailSpecs">{imovel.dormitorios > 0 && <span><b>{imovel.dormitorios}</b> dormitórios</span>}{imovel.suites ? <span><b>{imovel.suites}</b> suítes</span>:null}{imovel.banheiros ? <span><b>{imovel.banheiros}</b> banheiros</span>:null}{imovel.vagas > 0 && <span><b>{imovel.vagas}</b> vagas</span>}{imovel.area > 0 && <span><b>{imovel.area}</b> m²</span>}</div>{imovel.operacao === 'Locação e Venda' ? <div className="dualPrices"><div><small>Locação mensal</small><strong>{dinheiro(imovel.valorLocacao || 0)}/mês</strong></div><div><small>Venda</small><strong>{dinheiro(imovel.valorVenda || 0)}</strong></div></div> : <strong className="detailPrice">{dinheiro(imovel.valor)}{imovel.operacao === 'Locação' ? '/mês' : ''}</strong>}<WhatsappButton imovel={imovel}/></article></section>
    <section className="glass seoText"><h2>Descrição do imóvel</h2><p>{imovel.descricao || 'As informações disponíveis estão apresentadas nesta página. Fale com o corretor para confirmar detalhes e disponibilidade.'}</p></section>
    <section className="glass seoText"><h2>Características e valores</h2><ul>{imovel.areaConstruida ? <li>Área construída: {imovel.areaConstruida} m²</li>:null}{imovel.areaUtil ? <li>Área útil: {imovel.areaUtil} m²</li>:null}{imovel.areaTerreno ? <li>Área do terreno: {imovel.areaTerreno} m²</li>:null}{imovel.condominio ? <li>Condomínio residencial: {imovel.condominio}</li>:null}{imovel.valorCondominio != null ? <li>Condomínio: {dinheiro(imovel.valorCondominio)}</li>:null}{imovel.iptu != null ? <li>IPTU: {dinheiro(imovel.iptu)}</li>:null}{imovel.caracteristicas?.map(c => <li key={c}>{c}</li>)}</ul></section>
    <section className="glass seoText"><h2>Localização</h2><p>{[imovel.bairro,imovel.cidade,imovel.uf,imovel.cep].filter(Boolean).join(', ')}</p>{imovel.proximidades?.length ? <><h3>Proximidades informadas</h3><ul>{imovel.proximidades.map(p=><li key={p}>{p}</li>)}</ul></>:null}</section>
    {!disponivel(imovel) && <section className="glass seoText"><h2>Este imóvel não está mais disponível</h2><p>Veja abaixo imóveis semelhantes atualmente publicados ou fale com Luis Fernando para encontrar outra opção.</p></section>}
    {semelhantes.length > 0 && <section><h2>Imóveis semelhantes</h2><div className="seoResults">{semelhantes.map(i=><article className="glass" key={i.codigo}><a href={urlImovel(i)}>{i.foto&&<img src={urlFoto(i.codigo, 0)} alt={`${i.tipo} em ${i.bairro}, ${i.cidade}`} loading="lazy" width="600" height="400"/>}<h3>{i.titulo}</h3></a><p>{i.operacao} · {i.bairro} · {i.cidade}</p><a href={urlImovel(i)}>Ver detalhes do imóvel</a></article>)}</div></section>}
  </main>;
}
