/**
 * Backend'e yuklenen ilan gorselleri (POST /api/v1/listings/images) mutlak URL degil,
 * "/uploads/listings/xxx.jpg" gibi backend-relative bir yol donduruyor (bkz.
 * ListingImageServiceImpl, ListingUploadWebConfig -- Spring bunu backend'in kendi
 * portunda /uploads/listings/** olarak servis ediyor).
 *
 * FE tarafinda bu yol oldugu gibi <img src="/uploads/listings/xxx.jpg"> olarak kullanilirsa
 * tarayici bunu FE origin'inden (orn. http://localhost:3000) ister ve 404 alir -- gorsel
 * hic gorunmez. Bu yardimci, backend-relative yollari backend origin'iyle birlestirir.
 *
 * Zaten mutlak olan URL'ler (http/https, data:) veya bos degerler oldugu gibi doner.
 */
// Dis aga (CDN) erisim engellenmis ortamlarda da her zaman gorunen,
// ag istegi gerektirmeyen yerel SVG placeholder (bkz. DashboardCard.tsx ile ayni desen).
export const FALLBACK_LISTING_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200">' +
      '<rect width="100%" height="100%" fill="#eef0f2"/>' +
      '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" ' +
      'fill="#9aa0a6" font-family="sans-serif" font-size="16">Resim yok</text>' +
      "</svg>"
  );

export function resolveImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  const raw = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8080/api/v1'
  ).replace(/\/$/, '');
  const host = raw
    .replace(/\/api\/v1\/?$/i, '')
    .replace(/\/api\/?$/i, '');

  return `${host}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default resolveImageUrl;
