/**
 * İlan detay URL'leri: /ilan/[id] ve SEO iki segmentli path'ler (urlService.createSeoUrl).
 * Middleware rewrite ve istemci tarafı (ör. mobil alt menü gizleme) aynı kuralları kullanır.
 */

export const LISTING_DETAIL_SKIP_FIRST_SEGMENT = new Set([
  'ilan',
  '_next',
  'api',
  'profile',
  'site-haberleri',
  'dashboard',
  'giris',
  'arama',
  'hesabim',
  'kategori',
  'kategori-sec',
  'kategoriler',
  'ustalar-ve-hizmetler',
  'ilan-ver',
  'ilan-form',
  'uyelik-sec',
  'sifremi-unuttum',
  'filtrele',
]);

export function listingIdFromSecondSegment(second: string): string | null {
  const trailingId = second.match(/-(\d+)$/);
  if (trailingId?.[1]) return trailingId[1];
  if (/^\d+$/.test(second)) return second;
  return null;
}

/** SEO ilan detayı: /kategori-slug/baslik-id veya /kategori-slug/id */
export function isSeoListingDetailPathname(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length !== 2) return false;
  const first = segments[0].toLowerCase();
  if (LISTING_DETAIL_SKIP_FIRST_SEGMENT.has(first)) return false;
  return listingIdFromSecondSegment(segments[1]) !== null;
}

/** İlan detay sayfası (emlak veya hizmet): canonical veya SEO URL */
export function isListingDetailPagePathname(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname.startsWith('/ilan/')) return true;
  return isSeoListingDetailPathname(pathname);
}
