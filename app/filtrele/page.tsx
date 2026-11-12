import { redirect } from 'next/navigation';

export default function FiltreleRootPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const params = new URLSearchParams();
  if (searchParams) {
    Object.entries(searchParams).forEach(([k, v]) => {
      if (typeof v === 'string') {
        params.set(k, v);
      } else if (Array.isArray(v)) {
        params.set(k, v.join(','));
      }
    });
  }
  const qs = params.toString();
  redirect(`/filtrele/tum-ilanlar${qs ? `?${qs}` : ''}`);
}