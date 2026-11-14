export const ORIGEM = 'https://corretorluisfernando.com.br';
export const NOME = 'Luis Fernando · Corretor de Imóveis';
export const categorias = {
  'casas-em-mogi-guacu': { titulo: 'Casas em Mogi Guaçu', tipo: 'casa', descricao: 'Casas à venda e para alugar em Mogi Guaçu/SP. Compare bairros, dormitórios, vagas e valores com Luis Fernando, corretor de imóveis.', dica: 'Antes de escolher uma casa, compare a localização, o tamanho do terreno, a área construída e as vagas. Conte também se você precisa de quintal, escritório ou espaço para ampliar.' },
  'apartamentos-em-mogi-guacu': { titulo: 'Apartamentos em Mogi Guaçu', tipo: 'apartamento', descricao: 'Apartamentos à venda e para alugar em Mogi Guaçu/SP. Consulte os anúncios e converse diretamente com o corretor Luis Fernando.', dica: 'Na busca por apartamento, considere o andar, o acesso por elevador, a posição do sol e a vaga de garagem. Confirme o valor do condomínio e o que está incluído antes de comparar o custo mensal.' },
  'terrenos-em-mogi-guacu': { titulo: 'Terrenos em Mogi Guaçu', tipo: 'terreno', descricao: 'Procure terrenos e lotes em Mogi Guaçu/SP. Consulte área, localização e valores dos imóveis publicados por Luis Fernando.', dica: 'Ao avaliar um terreno, confira dimensões, topografia, infraestrutura e documentação. Antes de construir, verifique junto aos órgãos responsáveis os usos permitidos e as exigências para o seu projeto.' },
  'imoveis-em-condominio-mogi-guacu': { titulo: 'Imóveis em condomínio em Mogi Guaçu', tipo: 'condominio', descricao: 'Encontre imóveis anunciados em condomínios em Mogi Guaçu/SP. Veja opções e confirme estrutura, regras e despesas com Luis Fernando.', dica: 'Além do imóvel, avalie as regras de uso, áreas comuns, acesso, despesas de condomínio e eventuais obras previstas. Confirme as características de cada empreendimento durante o atendimento.' },
} as const;
export function textoBusca(texto: string) { return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
export function jsonLd(dados: unknown) { return JSON.stringify(dados).replace(/</g, '\\u003c'); }
export function slug(texto: string) { return textoBusca(texto).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 110); }
export function slugImovel(imovel: { tipo:string; operacao:string; bairro:string; cidade:string; titulo:string }) {
  const finalidade = imovel.operacao === 'Locação' ? 'locacao' : imovel.operacao === 'Locação e Venda' ? 'locacao-venda' : 'venda';
  return slug([imovel.tipo, finalidade, imovel.bairro, imovel.cidade, imovel.titulo].filter(Boolean).join(' '));
}
export function urlImovel(imovel: { codigo:string; tipo:string; operacao:string; bairro:string; cidade:string; titulo:string }) {
  return `/imoveis/${slugImovel(imovel)}/${encodeURIComponent(imovel.codigo)}`;
}
export function urlFoto(codigo:string,indice=0){return `/api/imoveis/${encodeURIComponent(codigo)}/foto/${indice}`;}
