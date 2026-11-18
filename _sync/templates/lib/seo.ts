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

// Only facts from the public catalogue belong in metadata. Never derive a
// street address, amenities, financing conditions or neighbourhood claims.
type ImovelSeo = { codigo:string; tipo:string; operacao:string; cidade:string; bairro?:string; condominio?:string; uf?:string; dormitorios?:number; suites?:number; vagas?:number; area?:number; areaUtil?:number; areaConstruida?:number; valor?:number; valorVenda?:number; valorLocacao?:number };
const texto = (v:unknown) => typeof v === 'string' ? v.replace(/\s+/g,' ').trim() : '';
const positivo = (v:unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0;
const moeda = (v:number) => v.toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:0,maximumFractionDigits:2});
const limitar = (v:string,max:number) => { if(v.length<=max)return v;const corte=v.slice(0,max-1);return corte.slice(0,corte.lastIndexOf(' ')>max*0.6?corte.lastIndexOf(' '):corte.length).replace(/[ ,;:.]+$/,'')+'…'; };
export function acaoImovel(imovel:ImovelSeo){return imovel.operacao==='Locação'?'para alugar':imovel.operacao==='Locação e Venda'?'à venda e para alugar':'à venda';}
export function localizacaoImovel(imovel:ImovelSeo,incluirCondominio=false){
  const cidade=[texto(imovel.cidade),texto(imovel.uf)].filter(Boolean).join('/');
  const lugares=[incluirCondominio?texto(imovel.condominio):'',texto(imovel.bairro),cidade].filter(Boolean);
  return lugares.filter((v,i)=>lugares.findIndex(x=>textoBusca(x)===textoBusca(v))===i).join(', ');
}
export function tituloSeoImovel(imovel:ImovelSeo){
  const tipo=texto(imovel.tipo)||'Imóvel',quartos=positivo(imovel.dormitorios)?` com ${imovel.dormitorios} ${imovel.dormitorios===1?'quarto':'quartos'}`:'';
  const acao=acaoImovel(imovel),base=`${tipo}${quartos} ${acao}`,local=localizacaoImovel(imovel,true);
  // The public property code is the unique part: reserve its space rather than
  // truncating it along with long imported type/neighbourhood labels.
  const sufixo=texto(imovel.codigo)?` | ${texto(imovel.codigo)}`:'',orcamento=Math.max(1,105-sufixo.length);
  let titulo=`${base}${local?' em '+local:''}`;
  if(titulo.length>orcamento){
    const cidade=localizacaoImovel({...imovel,condominio:'',bairro:''});
    titulo=`${base}${cidade?' em '+cidade:''}`;
    if(titulo.length>orcamento){
      const essencial=`${acao}${cidade?' em '+cidade:''}`,tipoOrcamento=orcamento-essencial.length-1;
      titulo=tipoOrcamento>=12?`${limitar(tipo+quartos,tipoOrcamento)} ${essencial}`:essencial;
    }
  }
  return limitar(titulo,orcamento)+sufixo;
}
export function descricaoSeoImovel(imovel:ImovelSeo){
  const cidade=localizacaoImovel({...imovel,bairro:'',condominio:''});
  let local=localizacaoImovel(imovel,true);if(local.length>95)local=cidade;
  const partes=[`${texto(imovel.tipo)||'Imóvel'} ${acaoImovel(imovel)}${local?' em '+local:''}.`];
  const precos:string[]=[];
  const venda=positivo(imovel.valorVenda)?imovel.valorVenda:imovel.operacao==='Venda'?imovel.valor:undefined;
  const locacao=positivo(imovel.valorLocacao)?imovel.valorLocacao:imovel.operacao==='Locação'?imovel.valor:undefined;
  if(imovel.operacao!=='Locação'&&positivo(venda))precos.push(`Venda: ${moeda(venda!)}`);
  if(imovel.operacao!=='Venda'&&positivo(locacao))precos.push(`Aluguel: ${moeda(locacao!)}/mês`);
  if(precos.length)partes.push(precos.join('; ')+'.');
  const atributos:string[]=[];
  if(positivo(imovel.dormitorios))atributos.push(`${imovel.dormitorios} ${imovel.dormitorios===1?'quarto':'quartos'}`);
  const area=imovel.areaUtil||imovel.areaConstruida||imovel.area;if(positivo(area))atributos.push(`${area} m²`);
  if(positivo(imovel.vagas))atributos.push(`${imovel.vagas} ${imovel.vagas===1?'vaga':'vagas'}`);
  if(atributos.length)partes.push(atributos.join(', ')+'.');
  partes.push(`Cód. ${texto(imovel.codigo)}. Veja fotos e detalhes.`);
  return limitar(partes.join(' '),190);
}
export function tipoSchemaImovel(tipo:string){
  const nome=textoBusca(texto(tipo));
  if(/apartamento|kitnet|studio|flat/.test(nome))return 'Apartment';
  if(/casa|sobrado/.test(nome))return 'House';
  // A plot or commercial unit must not be announced as a residence.
  return 'Place';
}
