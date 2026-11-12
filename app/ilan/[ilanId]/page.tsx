'use client';

import { Suspense } from 'react';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import ProductDetailPage from '@/Page/ProductDetail/ProductDetailPage';
import ServiceDetailPage from '@/Page/ServiceDetail/ServiceDetailPage';
import useProductDetailController from '@/Page/ProductDetail/useProductDetailController';
import useCategoryPath from '@/hooks/useCategoryPath';
import { isServiceListing } from '@/lib/isServiceListing';

function IlanDetayContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname() || '';
  const seoUrlFromQuery = searchParams?.get('seo_url') || '';
  const currentPath = seoUrlFromQuery || pathname;
  const ilanId = params?.ilanId as string;
  
  // Dinamik olarak backend API'den ilan verisini çek
  const { product, loading: productLoading, error } = useProductDetailController(ilanId);
  // Dinamik olarak backend API'den kategori hiyerarşi yolunu çek
  const { categoryPath, loading: categoryLoading } = useCategoryPath(ilanId);
  
  // 1. URL'den dinamik tespit: Eğer SEO URL'sinde ustalar-ve-hizmetler / hizmet geçiyorsa hemen anla
  const isServiceFromUrl = isServiceListing(null, null, currentPath);

  // 2. Yüklenme durumu: URL'den hizmet olduğu belliyse sadece ürünü bekle; değilse kategori yolunu da bekle
  const loading = isServiceFromUrl 
    ? productLoading 
    : (productLoading || (categoryLoading && !product));

  // Yükleniyor durumu
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '50vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div>Yükleniyor...</div>
      </div>
    );
  }

  // Hata durumu veya ilan bulunamadı
  if (error || !product) {
    if (isServiceFromUrl) {
      return <ServiceDetailPage />;
    }
    return <ProductDetailPage />;
  }

  // Dinamik kontrol: Backend'den gelen veri, kategori yolu veya URL'ye göre Hizmet mi yoksa Ürün/Emlak mı?
  const isService = isServiceFromUrl || isServiceListing(
    product as Record<string, unknown>,
    categoryPath,
    currentPath
  );

  // Hizmet ilanı ise Hizmet Detay sayfasını aç
  if (isService) {
    return <ServiceDetailPage initialProduct={product} />;
  }

  // Satış ve Kiralama (Emlak, Vasıta, vb.) ise Ürün Detay sayfasını aç
  return <ProductDetailPage initialProduct={product} />;
}

export default function IlanDetayPage() {
  return (
    <Suspense fallback={
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '50vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div>Yükleniyor...</div>
      </div>
    }>
      <IlanDetayContent />
    </Suspense>
  );
}
