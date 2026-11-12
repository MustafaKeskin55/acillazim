import Search from '@/components/search/Search';
import { redirect } from 'next/navigation';

export default function AramaSayfasi({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  if (searchParams && Object.keys(searchParams).length > 0) {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([k, v]) => {
      if (typeof v === 'string') {
        params.set(k, v);
      } else if (Array.isArray(v)) {
        params.set(k, v.join(','));
      }
    });
    const qs = params.toString();
    if (qs) {
      redirect(`/filtrele/tum-ilanlar?${qs}`);
    }
  }

  return <Search />;
}