import { categorias } from '../lib/seo';
export default function SeoLinks() {
  return <nav className="seoLinks" aria-label="Imóveis e orientações"><a href="/">Todos os imóveis</a><a href="/imoveis/venda/mogi-guacu-sp">Imóveis à venda em Mogi Guaçu</a><a href="/imoveis/locacao/mogi-guacu-sp">Imóveis para alugar em Mogi Guaçu</a><a href="/casas/venda/mogi-guacu-sp">Casas à venda</a><a href="/apartamentos/locacao/mogi-guacu-sp">Apartamentos para alugar</a>{Object.entries(categorias).map(([slug, c]) => <a key={slug} href={`/imoveis/${slug}`}>{c.titulo}</a>)}<a href="/financiamento-imobiliario">Financiamento imobiliário</a><a href="/minha-casa-minha-vida">Minha Casa Minha Vida</a><a href="/luis-fernando-corretor-imoveis-mogi-guacu">Sobre o corretor</a></nav>;
}
