import type { Metadata } from 'next';
import ServiceHome from '@/Page/Service/Service';

export const metadata: Metadata = {
  title: 'Acillazım.net — Ustalar ve Hizmetler Platformu',
  description: 'Acillazım.net ile ihtiyacınıza en yakın hizmetleri ve ustaları keşfedin.',
};

export default function HomePage() {
  return <ServiceHome />;
}
