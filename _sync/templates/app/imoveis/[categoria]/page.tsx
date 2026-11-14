import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { carregarImoveis } from '../../../lib/catalogo';
import { categorias, ORIGEM, textoBusca } from '../../../lib/seo';
import SeoLinks from '../../SeoLinks';
type Props = { params: Promise<{ categoria: string }> };
function categoriaPorSlug(slug: string) { return categorias[slug as keyof typeof categorias]; }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoria } = await params;
  const item = categoriaPorSlug(categoria);
  if (!item) return { title: 'Página não encontrada', robots: { index: false } };
  return { title: item.titulo, description: item.descricao, alternates: { canonical: `${ORIGEM}/imoveis/${categoria}` }, openGraph: { title: item.titulo, description: item.descricao, url: `${ORIGEM}/imoveis/${categoria}` } };
}
export default async function Categoria({ params }: Props) {
  const { categoria } = await params;
  const item = categoriaPorSlug(categoria);
  if (!item) notFound();
  const imoveis = (await carregarImoveis()).filter(im => textoBusca(im.cidade).includes('mogi guacu') && (item.tipo === 'condominio' ? textoBusca(`${im.titulo} ${im.descricao || ''}`).includes('condominio') : textoBusca(im.tipo).includes(item.tipo) || (item.tipo === 'terreno' && textoBusca(im.tipo).includes('lote'))));
  return <main className="seoPage"><a href="/">← Luis Fernando · Corretor de Imóveis</a><header><span className="eyebrow">Mogi Guaçu/SP</span><h1>{item.titulo}</h1><p>{item.descricao}</p></header><section className="glass seoText"><h2>O que observar na sua escolha</h2><p>{item.dica}</p></section><section><h2>Anúncios disponíveis</h2>{imoveis.length ? <div className="seoResults">{imoveis.map(im => <article className="glass" key={im.codigo}><a href={`/imovel/${encodeURIComponent(im.codigo)}`}>{im.foto && <img src={im.foto} alt={`${im.tipo} em ${im.bairro}, ${im.cidade}`} loading="lazy" decoding="async"/>}<h3>{im.titulo}</h3></a><p>{im.operacao} · {im.bairro} · {im.cidade}</p><p>Código {im.codigo} · {im.area} m²</p><a href={`/imovel/${encodeURIComponent(im.codigo)}`}>Ver valores, fotos e detalhes</a></article>)}</div> : <p>Não há anúncios desta categoria publicados no momento. Consulte o catálogo completo ou conte o que procura pelo WhatsApp.</p>}</section><a className="seoCta" href={`https://wa.me/5519989817571?text=${encodeURIComponent('Olá, Luis Fernando! Estou procurando ' + item.titulo.toLowerCase() + '.')}`} data-site-event="whatsapp_click">Consultar opções com Luis Fernando</a><SeoLinks/></main>;
}
