'use client';

import { linkWhatsapp, type Imovel } from '../../../lib/catalogo';

export default function WhatsappButton({ imovel }: { imovel: Imovel }) {
  const origem = typeof window === 'undefined' ? '' : window.location.origin;
  return <a className="detailWhatsapp" data-site-event="whatsapp_click" data-property-code={imovel.codigo} href={linkWhatsapp(imovel, origem)} target="_blank" rel="noreferrer">Tenho interesse pelo WhatsApp</a>;
}
