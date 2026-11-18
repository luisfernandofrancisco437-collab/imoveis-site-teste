/* Public catalogue adapter. No authenticated CRM request, key, message or upload. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root && root.document) {
    var boot = function () {
      if (root.CRM_PUBLIC_SITE) return;
      try {
        var config = api.readJSON(root.document, 'site-sync-config');
        if (!config) return;
        root.CRM_PUBLIC_SITE = api.createController({ window: root, document: root.document, config: config });
        root.CRM_PUBLIC_SITE.start();
      } catch (_) { /* Preserve the server-rendered site on a configuration error. */ }
    };
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  var ORIGIN = 'https://corretorluisfernando.com.br';
  var HOST = 'xwettgyajktagtqpbpnk.supabase.co';
  var CATALOG_PATH = '/functions/v1/crm-public-catalog/catalog';
  var CODE = /^[A-Z0-9][A-Z0-9_-]{0,63}$/;
  var ACTIVE = new Set(['disponivel', 'em negociacao', 'reservado']);
  function plain(value) { return value && typeof value === 'object' && !Array.isArray(value); }
  function text(value, length) { return typeof value === 'string' ? value.trim().slice(0, length || 500) : ''; }
  function norm(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
  function positive(value) { return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null; }
  function nonnegative(value) { return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null; }
  function readJSON(doc, id) {
    var node = doc.getElementById(id);
    if (!node) return null;
    try { return JSON.parse(node.textContent); } catch (_) { return null; }
  }
  function photoURL(value) {
    if (typeof value !== 'string' || value.length > 3000) return '';
    try {
      var url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password || url.hash) return '';
      var publicFunction = url.host === HOST && url.pathname.startsWith('/functions/v1/crm-public-catalog/photo/') && url.searchParams.get('site') === 'luis-fernando' && Array.from(url.searchParams.keys()).every(function (key) { return key === 'site'; });
      var staticPhoto = url.origin === ORIGIN && /^\/photos\/[a-f0-9]{64}(?:-thumb)?\.(?:webp|jpg|png|avif)$/.test(url.pathname) && !url.search;
      if (!publicFunction && !staticPhoto) return '';
      return url.href;
    } catch (_) { return ''; }
  }
  function normalizeConfig(config) {
    if (!plain(config) || config.site !== 'luis-fernando') throw new Error('Site público inválido.');
    var endpoint = new URL(config.endpoint);
    if (endpoint.protocol !== 'https:' || endpoint.host !== HOST || endpoint.pathname !== CATALOG_PATH || endpoint.username || endpoint.password || endpoint.hash) throw new Error('Endpoint público inválido.');
    if (endpoint.searchParams.get('site') !== config.site || Array.from(endpoint.searchParams.keys()).some(function (key) { return key !== 'site'; })) throw new Error('Escopo público inválido.');
    var code = typeof config.detailCode === 'string' ? config.detailCode.trim().toUpperCase() : '';
    if (code && !CODE.test(code)) throw new Error('Código público inválido.');
    return { endpoint: endpoint.href, site: config.site, detailCode: code };
  }
  function normalizeItem(raw) {
    if (!plain(raw)) throw new Error('Anúncio público inválido.');
    var codigo = typeof raw.codigo === 'string' ? raw.codigo.trim().toUpperCase() : '';
    var operation = norm(raw.operacao), operacao;
    if (!CODE.test(codigo)) throw new Error('Código público inválido.');
    if (operation === 'venda') operacao = 'Venda';
    else if (operation === 'locacao') operacao = 'Locação';
    else if (operation === 'locacao e venda' || operation === 'venda e locacao') operacao = 'Locação e Venda';
    else throw new Error('Finalidade pública inválida.');
    var titulo = text(raw.titulo, 500), tipo = text(raw.tipo, 160), status = text(raw.status, 100);
    if (!titulo || !tipo || !status) throw new Error('Anúncio público incompleto.');
    var photos = Array.isArray(raw.fotos) ? raw.fotos.slice(0, 200).map(photoURL).filter(Boolean) : [];
    var foto = photoURL(raw.foto) || photos[0] || '';
    if (foto && !photos.includes(foto)) photos.unshift(foto);
    var sale = positive(raw.valorVenda), rent = positive(raw.valorLocacao), value = positive(raw.valor);
    // Never derive an absent rent from a sale price, or vice versa.
    if (operacao === 'Venda' && !sale) sale = value;
    if (operacao === 'Locação' && !rent) rent = value;
    var city = text(raw.cidade, 200), uf = text(raw.uf, 20);
    // Same narrow fallback as the static generator; do not infer other cities.
    if (!uf && norm(city) === 'mogi guacu') uf = 'SP';
    return { codigo: codigo, titulo: titulo, tipo: tipo, operacao: operacao, status: status,
      cidade: city, bairro: text(raw.bairro, 200), condominio: text(raw.condominio, 300), uf: uf,
      descricao: text(raw.descricao, 12000), valorVenda: sale, valorLocacao: rent,
      valor: operacao === 'Locação' ? rent : sale, area: positive(raw.area), dormitorios: positive(raw.dormitorios),
      suites: positive(raw.suites), banheiros: positive(raw.banheiros), vagas: positive(raw.vagas), areaUtil: positive(raw.areaUtil), areaConstruida: positive(raw.areaConstruida),
      valorCondominio: nonnegative(raw.valorCondominio), iptu: nonnegative(raw.iptu),
      caracteristicas: Array.isArray(raw.caracteristicas) ? Array.from(new Set(raw.caracteristicas.slice(0, 100).map(function (value) { return text(value, 300); }).filter(Boolean))) : [],
      publicadoEm: typeof raw.publicadoEm === 'string' && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(raw.publicadoEm) && Number.isFinite(Date.parse(raw.publicadoEm)) ? raw.publicadoEm : undefined,
      atualizadoEm: typeof raw.atualizadoEm === 'string' && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(raw.atualizadoEm) && Number.isFinite(Date.parse(raw.atualizadoEm)) ? raw.atualizadoEm : undefined,
      foto: foto, fotos: Array.from(new Set(photos)) };
  }
  function normalizeCatalog(raw, site) {
    if (!plain(raw) || raw.schemaVersion !== 1 || raw.site !== site || !Array.isArray(raw.items) || raw.items.length > 10000) throw new Error('Resposta pública inválida.');
    var revision = typeof raw.revision === 'string' ? raw.revision.trim() : '';
    if (!revision || revision.length > 256 || !/^[A-Za-z0-9._:-]+$/.test(revision)) throw new Error('Revisão pública inválida.');
    var items = raw.items.map(normalizeItem), unique = new Set();
    items.forEach(function (item) { if (unique.has(item.codigo)) throw new Error('Código duplicado no catálogo público.'); unique.add(item.codigo); });
    if (raw.sourceRevision !== undefined && raw.sourceRevision !== null && (!Number.isSafeInteger(raw.sourceRevision) || raw.sourceRevision < 0)) throw new Error('Versão da fonte pública inválida.');
    var sourceRevision = Number.isSafeInteger(raw.sourceRevision) && raw.sourceRevision >= 0 ? raw.sourceRevision : null;
    var updatedAt = typeof raw.updatedAt === 'string' && Number.isFinite(Date.parse(raw.updatedAt)) ? new Date(raw.updatedAt).toISOString() : null;
    return { schemaVersion: 1, site: site, revision: revision, sourceRevision: sourceRevision, updatedAt: updatedAt, items: items };
  }
  function active(item) { return ACTIVE.has(norm(item.status)); }
  function pathFor(item) { return '/imovel/' + encodeURIComponent(item.codigo) + '/'; }
  function money(value) { return value == null ? 'Valor sob consulta' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
  function verb(item) { return item.operacao === 'Locação' ? 'para alugar' : item.operacao === 'Locação e Venda' ? 'à venda e para alugar' : 'à venda'; }
  // Kept in parity with templates/lib/seo.ts by the synthetic template tests.
  function seoText(value) { return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''; }
  function seoLimit(value, max) { if (value.length <= max) return value;var cut = value.slice(0, max - 1);return cut.slice(0, cut.lastIndexOf(' ') > max * 0.6 ? cut.lastIndexOf(' ') : cut.length).replace(/[ ,;:.]+$/, '') + '…'; }
  function locationText(item, condominium) {
    var city = [seoText(item.cidade), seoText(item.uf)].filter(Boolean).join('/');
    var places = [condominium ? seoText(item.condominio) : '', seoText(item.bairro), city].filter(Boolean);
    return places.filter(function (value, index) { return places.findIndex(function (other) { return norm(other) === norm(value); }) === index; }).join(', ');
  }
  function seoTitle(item) {
    var kind = seoText(item.tipo) || 'Imóvel', rooms = positive(item.dormitorios) ? ' com ' + item.dormitorios + (item.dormitorios === 1 ? ' quarto' : ' quartos') : '';
    var action = verb(item), base = kind + rooms + ' ' + action, place = locationText(item, true);
    // Reserve the code suffix, matching the static generator even for long imports.
    var suffix = seoText(item.codigo) ? ' | ' + seoText(item.codigo) : '', budget = Math.max(1, 105 - suffix.length);
    var title = base + (place ? ' em ' + place : '');
    if (title.length > budget) {
      var city = locationText(Object.assign({}, item, { condominio: '', bairro: '' }));
      title = base + (city ? ' em ' + city : '');
      if (title.length > budget) {
        var essential = action + (city ? ' em ' + city : ''), kindBudget = budget - essential.length - 1;
        title = kindBudget >= 12 ? seoLimit(kind + rooms, kindBudget) + ' ' + essential : essential;
      }
    }
    return seoLimit(title, budget) + suffix;
  }
  function seoDescription(item) {
    var city = locationText(Object.assign({}, item, { bairro: '', condominio: '' })), place = locationText(item, true);
    if (place.length > 95) place = city;
    var parts = [(seoText(item.tipo) || 'Imóvel') + ' ' + verb(item) + (place ? ' em ' + place : '') + '.'], prices = [];
    var sale = positive(item.valorVenda) ? item.valorVenda : item.operacao === 'Venda' ? item.valor : undefined;
    var rent = positive(item.valorLocacao) ? item.valorLocacao : item.operacao === 'Locação' ? item.valor : undefined;
    if (item.operacao !== 'Locação' && positive(sale)) prices.push('Venda: ' + money(sale));
    if (item.operacao !== 'Venda' && positive(rent)) prices.push('Aluguel: ' + money(rent) + '/mês');
    if (prices.length) parts.push(prices.join('; ') + '.');
    var facts = [], area = item.areaUtil || item.areaConstruida || item.area;
    if (positive(item.dormitorios)) facts.push(item.dormitorios + (item.dormitorios === 1 ? ' quarto' : ' quartos'));
    if (positive(area)) facts.push(area + ' m²');
    if (positive(item.vagas)) facts.push(item.vagas + (item.vagas === 1 ? ' vaga' : ' vagas'));
    if (facts.length) parts.push(facts.join(', ') + '.');
    parts.push('Cód. ' + seoText(item.codigo) + '. Veja fotos e detalhes.');
    return seoLimit(parts.join(' '), 190);
  }
  function schemaKind(value) { var kind = norm(seoText(value));return /apartamento|kitnet|studio|flat/.test(kind) ? 'Apartment' : /casa|sobrado/.test(kind) ? 'House' : 'Place'; }
  function whatsapp(item) { return 'https://wa.me/5519989817571?text=' + encodeURIComponent('Olá, Luis Fernando! Tenho interesse no imóvel ' + item.codigo + ' - ' + item.titulo + '. Gostaria de mais informações. ' + ORIGIN + pathFor(item)); }
  function node(doc, tag, className, value, attributes) {
    var el = doc.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined && value !== null) el.textContent = String(value);
    Object.entries(attributes || {}).forEach(function (entry) { el.setAttribute(entry[0], String(entry[1])); });
    return el;
  }
  function append(parent) { for (var i = 1; i < arguments.length; i++) if (arguments[i]) parent.appendChild(arguments[i]); return parent; }
  function priceBlock(doc, label, value, suffix) {
    var wrap = node(doc, 'div');
    append(wrap, node(doc, 'small', '', label), node(doc, 'strong', '', money(value) + (value != null && suffix ? suffix : '')));
    return wrap;
  }
  function card(doc, item, index) {
    var article = node(doc, 'article', 'propertyCard', null, { 'data-live-code': item.codigo });
    var media = node(doc, 'a', 'propertyMedia tone' + (index + 1) + (item.foto ? ' hasPhoto' : ''), null,
      { href: pathFor(item), 'aria-label': 'Ver detalhes do imóvel ' + item.codigo, 'data-site-event': 'property_view', 'data-property-code': item.codigo });
    if (item.foto) append(media, node(doc, 'img', '', null, { src: item.foto, alt: item.tipo + ' ' + verb(item) + ' em ' + locationText(item), loading: index ? 'lazy' : 'eager', fetchpriority: index ? 'auto' : 'high', decoding: 'async', width: 640, height: 420 }));
    else append(media, node(doc, 'span', 'houseIcon', '⌂'));
    append(media, node(doc, 'span', 'operation ' + (item.operacao === 'Venda' ? 'sale' : 'rent'), item.operacao), node(doc, 'span', 'code', item.codigo));
    var body = node(doc, 'div', 'propertyBody');
    append(body, node(doc, 'p', 'location', [item.bairro, item.cidade].filter(Boolean).join(' · ')), node(doc, 'h3', '', item.titulo));
    if (norm(item.status) !== 'disponivel') append(body, node(doc, 'p', 'location', 'Situação: ' + item.status));
    var specs = node(doc, 'div', 'specs');
    [[item.dormitorios, ' dorm.'], [item.vagas, ' vagas'], [item.area, ' m²']].forEach(function (fact) { if (fact[0]) append(specs, node(doc, 'span', '', fact[0] + fact[1])); });
    append(body, specs);
    var footer = node(doc, 'div', 'propertyFooter');
    if (item.operacao === 'Locação e Venda') append(footer, append(node(doc, 'div', 'dualPrices'), priceBlock(doc, 'Locação mensal', item.valorLocacao, '/mês'), priceBlock(doc, 'Venda', item.valorVenda, '')));
    else append(footer, priceBlock(doc, item.operacao === 'Locação' ? 'Valor mensal' : 'Valor do imóvel', item.valor, item.operacao === 'Locação' ? '/mês' : ''));
    append(footer, node(doc, 'a', '', 'Tenho interesse', { href: whatsapp(item), target: '_blank', rel: 'noopener noreferrer', 'aria-label': 'Consultar ' + item.codigo + ' pelo WhatsApp', 'data-site-event': 'whatsapp_click', 'data-property-code': item.codigo }));
    return append(article, media, append(body, footer));
  }
  function brand(doc) {
    var a = node(doc, 'a', 'brand', null, { href: '/' }), mark = node(doc, 'span', 'brandMark'), label = node(doc, 'span');
    append(mark, node(doc, 'i'), node(doc, 'b'));
    var strong = node(doc, 'strong');append(strong, node(doc, 'em', '', 'Luis'), doc.createTextNode(' Fernando'));
    append(label, strong, node(doc, 'small', '', 'Corretor de imóveis'));
    return append(a, mark, label);
  }
  function detailHeader(doc) {
    var nav = node(doc, 'nav', '', null, { 'aria-label': 'Navegação' });append(nav, node(doc, 'a', '', 'Todos os imóveis', { href: '/' }));
    return append(node(doc, 'header', 'detailHeader glass'), brand(doc), nav);
  }
  function section(doc, title, content) { return append(node(doc, 'section', 'glass seoText'), node(doc, 'h2', '', title), node(doc, 'p', '', content)); }
  function schema(item) {
    var kind = schemaKind(item.tipo), available = active(item), url = ORIGIN + pathFor(item);
    var entity = { '@type': kind, '@id': url + '#imovel', name: item.titulo || seoTitle(item), description: item.descricao || seoDescription(item), url: url, identifier: item.codigo, image: item.fotos,
      address: { '@type': 'PostalAddress', addressLocality: item.cidade || undefined, addressRegion: item.uf || undefined, addressCountry: 'BR' }, mainEntityOfPage: { '@id': url + '#anuncio' } };
    if (kind !== 'Place') {
      if (positive(item.dormitorios)) entity.numberOfBedrooms = item.dormitorios;
      if (positive(item.banheiros)) entity.numberOfBathroomsTotal = item.banheiros;
      var floorArea = item.areaUtil || item.areaConstruida;if (positive(floorArea)) entity.floorSize = { '@type': 'QuantitativeValue', value: floorArea, unitCode: 'MTK' };
    }
    var properties = [];
    if (positive(item.area)) properties.push({ '@type': 'PropertyValue', name: 'Área informada', value: item.area, unitCode: 'MTK' });
    if (positive(item.vagas)) properties.push({ '@type': 'PropertyValue', name: 'Vagas de garagem', value: item.vagas });
    if (item.bairro) properties.push({ '@type': 'PropertyValue', name: 'Bairro', value: item.bairro });
    if (item.condominio) properties.push({ '@type': 'PropertyValue', name: 'Condomínio', value: item.condominio });
    if (properties.length) entity.additionalProperty = properties;
    var offers = [], availability = available ? norm(item.status) === 'disponivel' ? 'InStock' : 'LimitedAvailability' : /vendid|alugad/.test(norm(item.status)) ? 'SoldOut' : 'OutOfStock';
    function offer(operation, price) { var row = { '@type': 'Offer', '@id': url + '#oferta-' + operation, priceCurrency: 'BRL', price: price, availability: 'https://schema.org/' + availability, url: url, seller: { '@id': ORIGIN + '/#corretor' }, businessFunction: 'https://purl.org/goodrelations/v1#' + (operation === 'locacao' ? 'LeaseOut' : 'Sell') };if (operation === 'locacao') row.priceSpecification = { '@type': 'UnitPriceSpecification', price: price, priceCurrency: 'BRL', unitCode: 'MON' };return row; }
    if (item.operacao !== 'Locação' && positive(item.valorVenda)) offers.push(offer('venda', item.valorVenda));
    if (item.operacao !== 'Venda' && positive(item.valorLocacao)) offers.push(offer('locacao', item.valorLocacao));
    var listing = { '@type': 'RealEstateListing', '@id': url + '#anuncio', url: url, name: seoTitle(item), description: seoDescription(item), identifier: 'anuncio-' + item.codigo, inLanguage: 'pt-BR', isPartOf: { '@id': ORIGIN + '/#site' }, publisher: { '@id': ORIGIN + '/#corretor' }, mainEntity: { '@id': url + '#imovel' }, breadcrumb: { '@id': url + '#caminho' } };
    if (offers.length) listing.offers = offers.length === 1 ? offers[0] : offers;
    [['publicadoEm', 'dateCreated'], ['atualizadoEm', 'dateModified']].forEach(function (row) { var value = item[row[0]];if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value) && Number.isFinite(Date.parse(value))) listing[row[1]] = value; });
    return { '@context': 'https://schema.org', '@graph': [entity, listing, { '@type': 'BreadcrumbList', '@id': url + '#caminho', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Imóveis', item: ORIGIN + '/' }, { '@type': 'ListItem', position: 2, name: item.titulo || seoTitle(item), item: url }] }] };
  }
  function detail(doc, item, items, oldHeader) {
    var main = node(doc, 'main', 'detailPage');
    var ld = node(doc, 'script', '', JSON.stringify(schema(item)).replace(/</g, '\\u003c'), { type: 'application/ld+json', id: 'crm-public-property-schema' });
    var crumbs = node(doc, 'nav', '', null, { 'aria-label': 'Caminho da página' });
    append(crumbs, node(doc, 'a', '', 'Imóveis', { href: '/' }), doc.createTextNode(' › ' + item.tipo + ' em ' + item.cidade + ' › ' + item.codigo));
    var hero = node(doc, 'section', 'detailHero'), gallery = node(doc, 'div', 'detailGallery glass' + (item.fotos.length > 1 ? ' detailGalleryGrid' : ''));
    if (item.fotos.length) item.fotos.forEach(function (src, index) { append(gallery, node(doc, 'img', '', null, { src: src, alt: (index ? 'Foto ' + (index + 1) : 'Foto principal') + ' de ' + item.tipo.toLowerCase() + ' ' + verb(item) + ' em ' + locationText(item), loading: index ? 'lazy' : 'eager', fetchpriority: index ? 'auto' : 'high', decoding: 'async', width: 1200, height: 800 })); });
    else append(gallery, node(doc, 'div', 'detailPlaceholder', '⌂', { role: 'img', 'aria-label': 'Imóvel sem foto publicada' }));
    var info = node(doc, 'article', 'detailInfo glass'), top = node(doc, 'div');
    append(top, node(doc, 'span', 'operation sale', item.operacao), node(doc, 'span', 'detailCode', 'Código ' + item.codigo));
    var status = node(doc, 'p');append(status, node(doc, 'strong', '', 'Situação:'), doc.createTextNode(' ' + item.status));
    var facts = node(doc, 'div', 'detailSpecs');
    [[item.dormitorios, ' dormitórios'], [item.suites, ' suítes'], [item.banheiros, ' banheiros'], [item.vagas, ' vagas'], [item.area, ' m²']].forEach(function (fact) { if (fact[0]) append(facts, append(node(doc, 'span'), node(doc, 'b', '', fact[0]), doc.createTextNode(fact[1]))); });
    append(info, top, node(doc, 'p', 'location', [item.bairro, item.cidade, item.uf].filter(Boolean).join(' · ')), node(doc, 'h1', '', item.tipo + ' ' + verb(item) + ' em ' + locationText(item, true)), status, facts);
    if (item.operacao === 'Locação e Venda') append(info, append(node(doc, 'div', 'dualPrices'), priceBlock(doc, 'Locação mensal', item.valorLocacao, '/mês'), priceBlock(doc, 'Venda', item.valorVenda, '')));
    else append(info, node(doc, 'strong', 'detailPrice', money(item.valor) + (item.operacao === 'Locação' && item.valor ? '/mês' : '')));
    append(info, node(doc, 'a', 'detailWhatsapp', 'Tenho interesse pelo WhatsApp', { href: whatsapp(item), target: '_blank', rel: 'noopener noreferrer', 'data-site-event': 'whatsapp_click', 'data-property-code': item.codigo }));
    append(main, ld, oldHeader || detailHeader(doc), crumbs, append(hero, gallery, info), section(doc, 'Descrição do imóvel', item.descricao || 'As informações disponíveis estão apresentadas nesta página. Fale com o corretor para confirmar detalhes e disponibilidade.'));
    var details = [];
    if (item.condominio) details.push('Condomínio residencial: ' + item.condominio);
    if (item.valorCondominio !== null) details.push('Valor de condomínio informado: ' + money(item.valorCondominio));
    if (item.iptu !== null) details.push('IPTU informado: ' + money(item.iptu));
    details = details.concat(item.caracteristicas || []);
    if (details.length) {
      var characteristics = append(node(doc, 'section', 'glass seoText'), node(doc, 'h2', '', 'Características e valores')), list = node(doc, 'ul');
      details.forEach(function (value) { append(list, node(doc, 'li', '', value)); });
      append(main, append(characteristics, list));
    }
    append(main, section(doc, 'Localização', locationText(item, true)));
    if (!active(item)) append(main, section(doc, 'Este imóvel não está mais disponível', 'Veja abaixo imóveis semelhantes atualmente publicados ou fale com Luis Fernando para encontrar outra opção.'));
    var similar = items.filter(function (p) { return p.codigo !== item.codigo && active(p) && (norm(p.tipo) === norm(item.tipo) || norm(p.bairro) === norm(item.bairro)); }).slice(0, 4);
    if (similar.length) {
      var related = append(node(doc, 'section'), node(doc, 'h2', '', 'Imóveis semelhantes')), results = node(doc, 'div', 'seoResults');
      similar.forEach(function (p) { var a = node(doc, 'a', '', null, { href: pathFor(p) });if (p.foto) append(a, node(doc, 'img', '', null, { src: p.foto, alt: p.tipo + ' em ' + [p.bairro, p.cidade].filter(Boolean).join(', '), loading: 'lazy', width: 600, height: 400 }));append(a, node(doc, 'h3', '', p.titulo));append(results, append(node(doc, 'article', 'glass'), a, node(doc, 'p', '', [p.operacao, p.bairro, p.cidade].filter(Boolean).join(' · ')), node(doc, 'a', '', 'Ver detalhes do imóvel', { href: pathFor(p) }))); });
      append(main, append(related, results));
    }
    return main;
  }
  function setHead(doc, selector, tag, attrs, value) {
    var el = doc.querySelector(selector);
    if (!el) { el = node(doc, tag, '', null, attrs);doc.head.appendChild(el); }
    if (tag === 'link') el.setAttribute('href', value);else el.setAttribute('content', value);
  }
  function metadata(doc, item, fallback) {
    var title = seoTitle(item), description = seoDescription(item);
    doc.title = title;
    setHead(doc, 'link[rel="canonical"]', 'link', { rel: 'canonical' }, ORIGIN + pathFor(item));
    setHead(doc, 'meta[name="description"]', 'meta', { name: 'description' }, description);
    setHead(doc, 'meta[name="robots"]', 'meta', { name: 'robots' }, fallback || !active(item) ? 'noindex,follow' : 'index,follow');
    [['og:title', title], ['og:description', description], ['og:url', ORIGIN + pathFor(item)], ['og:type', 'article'], ['og:locale', 'pt_BR']].forEach(function (pair) { setHead(doc, 'meta[property="' + pair[0] + '"]', 'meta', { property: pair[0] }, pair[1]); });
    [['twitter:card', item.foto ? 'summary_large_image' : 'summary'], ['twitter:title', title], ['twitter:description', description]].forEach(function (pair) { setHead(doc, 'meta[name="' + pair[0] + '"]', 'meta', { name: pair[0] }, pair[1]); });
    var image = doc.querySelector('meta[property="og:image"]');
    if (item.foto) setHead(doc, 'meta[property="og:image"]', 'meta', { property: 'og:image' }, item.foto);else if (image) image.remove();
    var twitterImage = doc.querySelector('meta[name="twitter:image"]');
    if (item.foto) setHead(doc, 'meta[name="twitter:image"]', 'meta', { name: 'twitter:image' }, item.foto);else if (twitterImage) twitterImage.remove();
  }
  function deriveCode(doc, location, config) {
    if (config.detailCode) return config.detailCode;
    var current = doc.querySelector('.detailCode');
    if (current) { var code = text(current.textContent, 100).replace(/^Código\s+/i, '').toUpperCase();if (CODE.test(code)) return code; }
    if (!doc.querySelector('.notFound') || !location) return '';
    try { var parts = decodeURIComponent(location.pathname).split('/').filter(Boolean);if ((parts.length === 2 && parts[0] === 'imovel') || (parts.length === 3 && parts[0] === 'imoveis')) { var last = parts[parts.length - 1].toUpperCase();if (CODE.test(last)) return last; } } catch (_) { /* invalid path is not a property */ }
    return '';
  }
  function createController(options) {
    options = options || {};
    var win = options.window, doc = options.document || win.document, config = normalizeConfig(options.config);
    var fetcher = options.fetch || win.fetch.bind(win), storage = options.storage;
    if (storage === undefined) try { storage = win.localStorage; } catch (_) { storage = null; }
    var timers = { setTimeout: options.setTimeout || win.setTimeout.bind(win), clearTimeout: options.clearTimeout || win.clearTimeout.bind(win), setInterval: options.setInterval || win.setInterval.bind(win), clearInterval: options.clearInterval || win.clearInterval.bind(win) };
    var Controller = options.AbortController || win.AbortController;
    var current = null, seq = 0, inFlight = null, interval = null, started = false, stopped = false, lastError = '';
    var detailCode = deriveCode(doc, win.location, config), fallbackPage = !!doc.querySelector('.notFound');
    var grid = doc.querySelector('.catalog .grid'), search = doc.querySelector('.searchPanel input'), operation = doc.querySelector('.searchPanel select');
    var cacheKey = 'crm-public-site:' + config.site + ':catalog:v1';
    function visible() { return doc.visibilityState !== 'hidden'; }
    function cacheRead() { try { var value = storage && storage.getItem(cacheKey);return value ? normalizeCatalog(JSON.parse(value), config.site) : null; } catch (_) { return null; } }
    function cacheWrite(value) { try { if (storage) storage.setItem(cacheKey, JSON.stringify(value)); } catch (_) { /* storage availability never blocks the site */ } }
    function emit() { if (typeof options.onChange === 'function') options.onChange(getState()); }
    function emptyNode() {
      var catalog = doc.querySelector('.catalog'), empty = catalog && catalog.querySelector('.empty');
      if (!empty && catalog) { empty = node(doc, 'div', 'empty', 'Nenhum imóvel encontrado para esta busca.');catalog.appendChild(empty); }
      return empty;
    }
    function filterHome() {
      if (!grid) return;
      var query = norm(search && search.value), selected = operation && operation.value || '', count = 0;
      var lookup = new Map((current ? current.items : []).map(function (p) { return [p.codigo, p]; }));
      Array.from(grid.querySelectorAll('.propertyCard')).forEach(function (el) {
        var codeNode = el.querySelector('.code'), code = codeNode ? text(codeNode.textContent, 64) : '', p = lookup.get(code);
        var op = p ? p.operacao : (el.querySelector('.operation') || {}).textContent || '';
        var haystack = p ? [p.codigo, p.titulo, p.cidade, p.bairro, p.tipo, p.condominio].join(' ') : el.textContent;
        var match = (!selected || op === selected || op === 'Locação e Venda') && norm(haystack).includes(query);
        el.hidden = !match;if (match) count++;
      });
      var counter = doc.querySelector('.catalog .sectionTitle p');if (counter) counter.textContent = count + ' ' + (count === 1 ? 'imóvel encontrado' : 'imóveis encontrados');
      var empty = emptyNode();if (empty) empty.hidden = count !== 0;
    }
    function drawHome(items) {
      if (!grid) return;
      var fragment = doc.createDocumentFragment();items.filter(active).forEach(function (p, index) { fragment.appendChild(card(doc, p, index)); });grid.replaceChildren(fragment);
    }
    function drawDetail(items) {
      if (!detailCode) return;
      var p = items.find(function (item) { return item.codigo === detailCode; }), old = doc.querySelector('main.detailPage') || doc.querySelector('main.notFound') || doc.querySelector('.notFound');
      if (p) {
        var header = old && old.querySelector('header.detailHeader'), replacement = detail(doc, p, items, header ? header.cloneNode(true) : null);
        if (old) old.replaceWith(replacement);else doc.body.appendChild(replacement);
        metadata(doc, p, fallbackPage);
      } else {
        var unavailable = append(node(doc, 'main', 'notFound glass'), node(doc, 'h1', '', 'Imóvel não disponível'), node(doc, 'p', '', 'Este anúncio não está disponível no catálogo público. Consulte as outras opções ou fale com o corretor.'), node(doc, 'a', '', 'Ver imóveis', { href: '/' }));
        if (old) old.replaceWith(unavailable);else doc.body.appendChild(unavailable);
        doc.title = 'Imóvel não disponível | Luis Fernando';
        setHead(doc, 'meta[name="robots"]', 'meta', { name: 'robots' }, 'noindex,follow');
        setHead(doc, 'meta[name="description"]', 'meta', { name: 'description' }, 'Este anúncio não está disponível no catálogo público. Consulte os imóveis disponíveis.');
        setHead(doc, 'meta[property="og:title"]', 'meta', { property: 'og:title' }, doc.title);
        setHead(doc, 'meta[property="og:description"]', 'meta', { property: 'og:description' }, 'Este anúncio não está disponível no catálogo público.');
        setHead(doc, 'meta[name="twitter:title"]', 'meta', { name: 'twitter:title' }, doc.title);
        setHead(doc, 'meta[name="twitter:description"]', 'meta', { name: 'twitter:description' }, 'Este anúncio não está disponível no catálogo público.');
        setHead(doc, 'meta[name="twitter:card"]', 'meta', { name: 'twitter:card' }, 'summary');
        var oldImage = doc.querySelector('meta[property="og:image"]');if (oldImage) oldImage.remove();
        var oldTwitterImage = doc.querySelector('meta[name="twitter:image"]');if (oldTwitterImage) oldTwitterImage.remove();
      }
    }
    function completeSSR(snapshot) {
      // Adopt the embedded snapshot without replacing already-rendered photos
      // and text on startup. A newer cache/network revision still rebuilds.
      if (detailCode) {
        if (fallbackPage || !snapshot.items.some(function (p) { return p.codigo === detailCode; })) return false;
        var main = doc.querySelector('main.detailPage'), code = main && main.querySelector('.detailCode');
        if (!main || !code || text(code.textContent, 100).replace(/^Código\s+/i, '').toUpperCase() !== detailCode || !main.querySelector('h1') || !main.querySelector('.detailGallery')) return false;
        var scripts = Array.from(main.querySelectorAll('script[type="application/ld+json"]'));
        return scripts.some(function (script) { try { var ld = JSON.parse(script.textContent);return ld && Array.isArray(ld['@graph']) && ld['@graph'].some(function (entry) { return entry && entry['@type'] === 'RealEstateListing' && entry.mainEntity && entry.mainEntity['@id'] === ORIGIN + pathFor({ codigo: detailCode }) + '#imovel'; }); } catch (_) { return false; } });
      }
      if (grid) {
        var cards = Array.from(grid.querySelectorAll('.propertyCard')), expected = new Set(snapshot.items.filter(active).map(function (p) { return p.codigo; }));
        if (cards.length !== expected.size || (!cards.length && !doc.querySelector('.catalog .empty'))) return false;
        return cards.every(function (card) { var code = card.querySelector('.code');return !!code && expected.delete(text(code.textContent, 64)); }) && expected.size === 0;
      }
      return true;
    }
    function accept(raw, source, preserveSSR) {
      var next = normalizeCatalog(raw, config.site);
      if (current && current.sourceRevision !== null && (next.sourceRevision === null || next.sourceRevision < current.sourceRevision)) return false;
      if (current && current.sourceRevision === null && next.sourceRevision === null && current.updatedAt && next.updatedAt && Date.parse(next.updatedAt) < Date.parse(current.updatedAt)) return false;
      var changed = !current || current.revision !== next.revision;
      current = next;lastError = '';
      if (changed) { if (!preserveSSR) { drawHome(next.items);drawDetail(next.items); }filterHome(); }
      if (source === 'network') cacheWrite(next);emit();return changed;
    }
    function refresh() {
      if (stopped || !visible()) return Promise.resolve(false);
      if (inFlight) return inFlight.promise;
      var id = ++seq, abort = new Controller(), timeout;
      var entry = { id: id, abort: abort, promise: null };
      inFlight = entry;
      timeout = timers.setTimeout(function () { if (inFlight === entry) { lastError = 'Tempo esgotado ao atualizar o catálogo público.';seq++;inFlight = null;abort.abort();emit(); } }, 12000);entry.timeout = timeout;
      entry.promise = Promise.resolve().then(function () { return fetcher(config.endpoint, { method: 'GET', headers: { Accept: 'application/json' }, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: abort.signal }); }).then(function (response) {
        if (response.status === 304) return null;
        if (!response.ok) throw new Error('Catálogo público temporariamente indisponível.');
        return response.json();
      }).then(function (payload) {
        if (stopped || seq !== id || abort.signal.aborted || payload === null) return false;
        return accept(payload, 'network');
      }).catch(function () { if (!stopped && seq === id) { lastError = 'Não foi possível atualizar agora; a última versão disponível foi mantida.';emit(); }return false; }).finally(function () { timers.clearTimeout(timeout);if (inFlight === entry) inFlight = null; });
      return entry.promise;
    }
    function onVisibility() { if (visible()) refresh(); }
    function start() {
      if (started || stopped) return controller;started = true;
      var raw = readJSON(doc, 'catalogo-live-snapshot'), snapshot = null, cached = cacheRead();
      if (raw) try { snapshot = normalizeCatalog(Object.assign({ schemaVersion: 1, site: config.site }, raw), config.site); } catch (_) { /* keep original SSR */ }
      var initial = snapshot;
      if (cached && (!initial || (cached.sourceRevision !== null && initial.sourceRevision !== null ? cached.sourceRevision > initial.sourceRevision : initial.sourceRevision === null && cached.updatedAt && initial.updatedAt && Date.parse(cached.updatedAt) > Date.parse(initial.updatedAt)))) initial = cached;
      if (initial) try { accept(initial, 'initial', initial === snapshot && completeSSR(snapshot)); } catch (_) { /* keep original SSR */ }
      if (search) search.addEventListener('input', filterHome);if (operation) operation.addEventListener('change', filterHome);
      doc.addEventListener('visibilitychange', onVisibility);win.addEventListener('focus', onVisibility);
      interval = timers.setInterval(function () { if (visible()) refresh(); }, 30000);refresh();return controller;
    }
    function getState() { return { revision: current && current.revision || null, sourceRevision: current && current.sourceRevision, updatedAt: current && current.updatedAt, total: current ? current.items.length : null, active: current ? current.items.filter(active).length : null, syncing: !!inFlight, ready: !!current, stopped: stopped, lastError: lastError }; }
    function destroy() { stopped = true;seq++;if (inFlight) { inFlight.abort.abort();timers.clearTimeout(inFlight.timeout); }inFlight = null;if (interval !== null) timers.clearInterval(interval);doc.removeEventListener('visibilitychange', onVisibility);win.removeEventListener('focus', onVisibility);if (search) search.removeEventListener('input', filterHome);if (operation) operation.removeEventListener('change', filterHome); }
    var controller = Object.freeze({ start: start, refresh: refresh, getState: getState, destroy: destroy });return controller;
  }
  return { readJSON: readJSON, normalizeConfig: normalizeConfig, normalizeItem: normalizeItem, normalizeCatalog: normalizeCatalog, isActive: active, createController: createController, card: card, detail: detail, schema: schema, seoTitle: seoTitle, seoDescription: seoDescription, metadata: metadata };
});
