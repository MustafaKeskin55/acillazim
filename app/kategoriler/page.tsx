import Sidebar from '@/components/Sidebar/Sidebar';

type SearchParams = Record<string, string | string[] | undefined>;

function alanParam(searchParams: SearchParams): string | undefined {
  const v = searchParams.alan;
  if (Array.isArray(v)) return v[0];
  return v;
}

/** Mobil: Ustalar-ve-Hizmetler sayfasındayken alt menü ?alan=hizmet ile yalnız hizmet kategorileri */
export default function KategorilerPage({ searchParams }: { searchParams: SearchParams }) {
  const categorySource = alanParam(searchParams) === 'hizmet' ? 'service' : 'all';

  return <Sidebar forceOpen categorySource={categorySource} />;
}
