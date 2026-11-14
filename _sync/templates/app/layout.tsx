import type { Metadata } from 'next';
import './globals.css';
import './detail.css';
import SiteAnalytics from './SiteAnalytics';
import { ORIGEM, NOME, jsonLd } from '../lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(ORIGEM),
  title: { default: 'Imóveis em Mogi Guaçu | Luis Fernando, Corretor', template: '%s | Luis Fernando' },
  description: 'Casas, apartamentos e terrenos para venda e locação em Mogi Guaçu/SP. Consulte imóveis com Luis Fernando, corretor de imóveis, CRECI 244254-F.',
  robots: { index: true, follow: true },
  openGraph: { siteName: NOME, locale: 'pt_BR', title: 'Imóveis em Mogi Guaçu | Luis Fernando', description: 'Casas, apartamentos e terrenos para venda e locação em Mogi Guaçu/SP.', type: 'website' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({ '@context': 'https://schema.org', '@graph': [{ '@type': 'RealEstateAgent', '@id': `${ORIGEM}/#corretor`, name: NOME, url: ORIGEM, telephone: '+55-19-98981-7571', areaServed: { '@type': 'City', name: 'Mogi Guaçu', containedInPlace: { '@type': 'State', name: 'São Paulo' } }, sameAs: ['https://www.instagram.com/luisfernando.imoveis', 'https://www.facebook.com/fernando.negociosimobiliarios', 'https://www.linkedin.com/in/luisfernandoimoveis/'] }, { '@type': 'WebSite', '@id': `${ORIGEM}/#site`, url: ORIGEM, name: NOME, inLanguage: 'pt-BR', publisher: { '@id': `${ORIGEM}/#corretor` } }] }) }}/><SiteAnalytics />{children}</body></html>;
}
