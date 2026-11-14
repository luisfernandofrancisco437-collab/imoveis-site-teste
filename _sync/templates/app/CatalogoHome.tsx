'use client';

import { useMemo, useState } from 'react';
import { linkWhatsapp, type Imovel } from '../lib/catalogo';
import { ORIGEM, urlFoto, urlImovel } from '../lib/seo';
import { registrarEvento } from './SiteAnalytics';
import SeoLinks from './SeoLinks';

const dinheiro = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 2 });

export default function CatalogoHome({ catalogoInicial }: { catalogoInicial: Imovel[] }) {
  const [busca, setBusca] = useState('');
  const [operacao, setOperacao] = useState('');
  const imoveis = useMemo(() => catalogoInicial.filter((imovel) => {
    const texto = `${imovel.codigo} ${imovel.titulo} ${imovel.cidade} ${imovel.bairro} ${imovel.tipo}`.toLowerCase();
    return (!operacao || imovel.operacao === operacao || imovel.operacao === 'Locação e Venda') && texto.includes(busca.toLowerCase());
  }), [busca, operacao, catalogoInicial]);
  const whatsapp = (imovel: Imovel) => linkWhatsapp(imovel, ORIGEM);
  const enviarCadastro = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const dados = new FormData(event.currentTarget);
    const mensagem = [
      'Olá, Luis Fernando! Gostaria de cadastrar um imóvel.',
      `Operação: ${dados.get('operacao')}`,
      `Nome: ${dados.get('nome')}`,
      `Telefone: ${dados.get('telefone')}`,
      `Tipo: ${dados.get('tipo')}`,
      `Cidade: ${dados.get('cidade')}`,
      `Bairro: ${dados.get('bairro')}`,
      `Endereço: ${dados.get('endereco')}`,
      `Valor pretendido: ${dados.get('valor') || 'A combinar'}`,
      `Detalhes: ${dados.get('detalhes') || 'Não informado'}`,
    ].join('\n');
    registrarEvento('property_submission');
    window.open(`https://wa.me/5519989817571?text=${encodeURIComponent(mensagem)}`, '_blank', 'noopener,noreferrer');
  };

  return <main>
    <header className="topbar">
      <a className="brand" href="#inicio" aria-label="Início"><span className="brandMark"><i></i><b></b></span><span><strong><em>Luis</em> Fernando</strong><small>Corretor de imóveis</small></span></a>
      <nav className="topActions"><a href="#cadastre">Cadastrar imóvel</a><a className="topWhatsapp" data-site-event="whatsapp_click" href="https://wa.me/5519989817571" target="_blank" rel="noreferrer">Falar no WhatsApp</a></nav>
    </header>
    <section className="hero" id="inicio"><div className="heroCopy">
      <span className="eyebrow">Luis Fernando · Corretor de imóveis</span><h1>Imóveis em Mogi Guaçu para comprar ou alugar.</h1><p>Encontre casas, apartamentos, terrenos e imóveis em condomínio em Mogi Guaçu/SP e região. Busque por bairro, código ou tipo de imóvel e fale diretamente comigo pelo WhatsApp.</p>
      <div className="searchPanel"><label><span>O que você procura?</span><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Cidade, bairro, código ou imóvel" /></label><label><span>Operação</span><select value={operacao} onChange={(e) => setOperacao(e.target.value)}><option value="">Venda ou locação</option><option>Venda</option><option>Locação</option></select></label><a href="#imoveis" className="searchButton">Buscar imóveis</a></div>
    </div><div className="heroVisual glass" aria-label="Luis Fernando, corretor de imóveis"><img src="/luis-fernando.jpg" alt="Luis Fernando, corretor de imóveis"/><div className="heroIdentity glass"><strong><em>Luis</em> Fernando</strong><span>Corretor de imóveis · CRECI 244254-F</span></div></div></section>
    <section className="catalog" id="imoveis"><div className="sectionTitle"><div><span className="eyebrow dark">Oportunidades selecionadas</span><h2>Imóveis disponíveis</h2></div><p>{imoveis.length} {imoveis.length === 1 ? 'imóvel encontrado' : 'imóveis encontrados'}</p></div>
      <div className="grid">{imoveis.map((imovel, indice) => <article className="propertyCard" key={imovel.codigo}><a className={`propertyMedia tone${indice + 1}${imovel.foto ? ' hasPhoto' : ''}`} data-site-event="property_view" data-property-code={imovel.codigo} href={urlImovel(imovel)} aria-label={`Ver detalhes do imóvel ${imovel.codigo}`}>{imovel.foto ? <img src={urlFoto(imovel.codigo, 0)} alt={`${imovel.tipo} ${imovel.operacao === 'Locação' ? 'para alugar' : 'à venda'} em ${imovel.bairro}, ${imovel.cidade}`} loading="lazy" decoding="async" width="640" height="420"/> : <span className="houseIcon">⌂</span>}<span className={`operation ${imovel.operacao === 'Venda' ? 'sale' : 'rent'}`}>{imovel.operacao}</span><span className="code">{imovel.codigo}</span></a><div className="propertyBody"><p className="location">{imovel.bairro} · {imovel.cidade}</p><h3>{imovel.titulo}</h3><div className="specs"><span>{imovel.dormitorios} dorm.</span><span>{imovel.vagas} vagas</span><span>{imovel.area} m²</span></div><div className="propertyFooter">{imovel.operacao === 'Locação e Venda' ? <div className="dualPrices"><div><small>Locação mensal</small><strong>{dinheiro(imovel.valorLocacao || 0)}/mês</strong></div><div><small>Venda</small><strong>{dinheiro(imovel.valorVenda || 0)}</strong></div></div> : <div><small>{imovel.operacao === 'Locação' ? 'Valor mensal' : 'Valor do imóvel'}</small><strong>{dinheiro(imovel.valor)}{imovel.operacao === 'Locação' ? '/mês' : ''}</strong></div>}<a data-site-event="whatsapp_click" data-property-code={imovel.codigo} href={whatsapp(imovel)} target="_blank" rel="noreferrer" aria-label={`Consultar ${imovel.codigo} pelo WhatsApp`}>Tenho interesse</a></div></div></article>)}</div>
      {!imoveis.length && <div className="empty">Nenhum imóvel disponível foi recebido do cadastro do CRM.</div>}
    </section>
    <section className="seoHome"><h2>Encontre seu imóvel em Mogi Guaçu</h2><p>Explore os anúncios por tipo ou veja as orientações para planejar sua compra. A disponibilidade e as condições de cada imóvel são confirmadas no atendimento.</p><SeoLinks/></section>
    <section className="ownerSection" id="cadastre"><div className="ownerIntro"><span className="eyebrow">Venda ou alugue seu imóvel</span><h2>Cadastre seu imóvel</h2><p>Envie as informações para uma avaliação inicial. O cadastro será analisado antes de aparecer no site.</p><div className="serviceArea glass"><strong>Área de atendimento</strong><span>Mogi Guaçu/SP e região</span></div></div><form className="ownerForm glass" onSubmit={enviarCadastro}>
      <label><span>Finalidade *</span><select name="operacao" required defaultValue=""><option value="" disabled>Selecione</option><option>Venda</option><option>Locação</option><option>Venda e Locação</option></select></label><label><span>Seu nome *</span><input name="nome" required autoComplete="name" placeholder="Nome completo" /></label><label><span>Telefone/WhatsApp *</span><input name="telefone" required inputMode="tel" autoComplete="tel" placeholder="(19) 99999-9999" /></label><label><span>Tipo de imóvel *</span><select name="tipo" required defaultValue=""><option value="" disabled>Selecione</option><option>Casa</option><option>Apartamento</option><option>Terreno</option><option>Comercial</option><option>Chácara</option><option>Outro</option></select></label><label><span>Cidade *</span><input name="cidade" required defaultValue="Mogi Guaçu/SP" /></label><label><span>Bairro *</span><input name="bairro" required placeholder="Bairro" /></label><label className="wide"><span>Endereço do imóvel *</span><input name="endereco" required placeholder="Rua, número e complemento" /></label><label><span>Valor pretendido</span><input name="valor" inputMode="decimal" placeholder="R$ 0,00" /></label><label className="wide"><span>Detalhes</span><textarea name="detalhes" rows={4} placeholder="Dormitórios, vagas, área e outras informações importantes"></textarea></label><p className="formNotice">Ao enviar, você será direcionado ao WhatsApp para confirmar as informações. O imóvel não será publicado automaticamente.</p><button type="submit">Enviar imóvel para avaliação</button>
    </form></section>
    <section className="contact"><div><span className="eyebrow">Atendimento direto</span><h2>Quer ajuda para encontrar o imóvel ideal?</h2><p>Conte o que você procura. Eu acompanho todo o processo, da busca até a entrega das chaves.</p></div><a href="https://wa.me/5519989817571?text=Ol%C3%A1%2C%20Fernando!%20Gostaria%20de%20ajuda%20para%20encontrar%20um%20im%C3%B3vel." target="_blank" rel="noreferrer">Conversar no WhatsApp</a></section>
    <footer><div><strong><em>Luis</em> Fernando · Corretor de Imóveis</strong><span>Mogi Guaçu/SP · CRECI 244254-F</span></div><nav className="socialLinks" aria-label="Redes sociais"><a href="https://www.instagram.com/luisfernando.imoveis" target="_blank" rel="noreferrer">Instagram</a><a href="https://www.facebook.com/fernando.negociosimobiliarios" target="_blank" rel="noreferrer">Facebook</a><a href="https://www.linkedin.com/in/luisfernandoimoveis/" target="_blank" rel="noreferrer">LinkedIn</a></nav></footer>
  </main>;
}
