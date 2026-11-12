import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  LISTING_DETAIL_SKIP_FIRST_SEGMENT,
  listingIdFromSecondSegment,
} from '@/lib/listingDetailRoute';

/**
 * SEO ilan URL'leri: /kategori-yolu/baslik-ilanId veya /kategori-yolu/ilanId
 * createSeoUrl (urlService) ile üretilir; App Router'da yalnızca /ilan/[ilanId] tanımlı olduğu için
 * bu iki segmentli yolları aynı sayfaya iç rewrite ederiz (adres çubuğu SEO URL'de kalır).
 *
 * Panel Koruması:
 *   /panel/giris hariç tüm /panel/* rotaları panel oturumu gerektirir.
 *   Not: sessionStorage middleware'den okunamaz (Edge Runtime).
 *   Panel sayfalarının kendisi client-side redirect yönetir;
 *   burada yalnızca temel cookie kontrolü yapılır.
 */

/** Panel oturumu cookie anahtarı — operatorService login sırasında set edilmeli */
const PANEL_COOKIE = 'panel_logged_in';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Panel Koruması ──────────────────────────────────────────────────────────
  if (pathname.startsWith('/panel') && !pathname.startsWith('/panel/giris')) {
    const panelCookie = request.cookies.get(PANEL_COOKIE);
    if (!panelCookie?.value) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/panel/giris';
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length !== 2) {
    return NextResponse.next();
  }

  const first = segments[0].toLowerCase();
  if (LISTING_DETAIL_SKIP_FIRST_SEGMENT.has(first)) {
    return NextResponse.next();
  }

  const ilanId = listingIdFromSecondSegment(segments[1]);
  if (!ilanId) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/ilan/${ilanId}`;
  url.searchParams.set('seo_url', pathname);
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    /*
     * Static dosya ve Next iç path'leri hariç tut (matcher ile çoğu istek zaten gelmez,
     * yine de güvenli listeyi middleware içinde de süzdük).
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|woff|woff2)$).*)',
  ],
};
