import type { Metadata, Viewport } from 'next';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import 'react-toastify/dist/ReactToastify.css';
import '@/styles/bootstrap-compat.css';
import '@/styles/App.css';
import '@/styles/product-card-tokens.css';
import ClientProviders from '@/components/ClientProviders/ClientProviders';

// Google Fonts sunucu derlemesi sırasında ECONNRESET vermemesi için
// tarayıcı tarafında CSS değişkenleri olarak tanımlanır:
const display = { variable: 'font-display' };
const body = { variable: 'font-body' };
const serif = { variable: 'font-serif' };

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#003466',
};

export const metadata: Metadata = {
  title: {
    template: '%s | Acillazım.net',
    default: 'Acillazım.net — Hızlı İlan ve Hizmet Platformu',
  },
  description: 'Acillazım.net ile ihtiyacınıza en yakın hizmetleri ve ilanları keşfedin. Hızlı, güvenilir ve kullanıcı dostu platform.',
  keywords: ['ilan', 'hizmet', 'ikinci el', 'satılık', 'kiralık', 'acil', 'acillazım'],
  authors: [{ name: 'Acillazım' }],
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    siteName: 'Acillazım.net',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className={`${display.variable} ${body.variable} ${serif.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
