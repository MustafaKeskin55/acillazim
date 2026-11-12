"use client";

import React, { useState, useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';
import './ProductDetailPage.css';
import {
  ProductGallery, ProductInfo, ProductDescription, ProductFeatures,
  AdditionalInfo, MapSection, ShareSection, FavoriteButton,
  SimilarProducts, PropertyFeatureTags, ListingPriceCard,
} from './components';
import SellerInfo from './components/Seller/SellerInfo';
import Breadcrumb2 from '@/components/Breadcrumb2/Breadcrumb2';
import Loader from '@/components/Loader/Loader';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage';
import VehicleDamageDisplay from '@/components/CarDamageView/VehicleDamageDisplay';
import useCategoryPath from '@/hooks/useCategoryPath';
import useProductDetailController from './useProductDetailController';
import NearbyListings from '@/components/NearbyListings/NearbyListings';
import profileService from '@/services/profile/profileService';
import { decodeHtmlEntities } from '@/services/listings/util/listingUtils';
import { useAuth } from '@/context/AuthContext';
import ServiceDetailPage from '@/Page/ServiceDetail/ServiceDetailPage';
import MobileListingDetail from '@/Page/ProductDetail/MobileListingDetail/MobileListingDetail';
import ComplaintModal from '@/components/ComplaintModal/ComplaintModal';
import AdBanner from '@/components/AdvertisementBanner/AdBanner';
import { isServiceListing } from '@/lib/isServiceListing';

interface ProductDetailPageProps {
  initialProduct?: Record<string, unknown> | null;
  previewData?: Record<string, unknown>;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  currentUser: { id?: string | number; user_id?: string | number; [key: string]: unknown } | null;
}

const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ initialProduct, previewData }) => {
  const params = useParams();
  const pathname = usePathname() || '';
  const ilanId = params?.ilanId as string | undefined;
  const isPreview = !!previewData;
  const { isAuthenticated, currentUser } = useAuth() as AuthContextValue;
  const [userCity, setUserCity] = useState<string>('');
  const [complaintModalOpen, setComplaintModalOpen] = useState(false);
  const [userComplaintModalOpen, setUserComplaintModalOpen] = useState(false);

  // Giriş yapan kullanıcının gerçek şehrini BE'den al (mock userData.json değil).
  // Kimlik doğrulanmamışsa veya şehir alınamazsa varsayılan olarak 'istanbul' kalır
  // (bkz. userCity || 'istanbul' kullanım yerleri).
  useEffect(() => {
    const userId = currentUser?.id ?? currentUser?.user_id;
    if (!isAuthenticated || userId === undefined || userId === null) {
      setUserCity('');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const response = await profileService.fetchUserProfile(userId);
        if (cancelled) return;
        const il = response?.data?.profile?.il;
        if (il) setUserCity(il);
      } catch (error) {
        console.error('[ProductDetailPage] Kullanıcı şehri alınamadı:', error);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, currentUser]);

  const {
    product: apiProduct, loading: controllerLoading, error, seller, activeTab, setActiveTab,
    isFavorite, similarProducts, handleToggleFavorite, renderPropertyTag, getFormattedPrice,
  } = useProductDetailController(isPreview || initialProduct ? null : ilanId);

  const loading = !initialProduct && controllerLoading;

  const product = isPreview ? (() => {
    const converted: Record<string, unknown> = { ...previewData };
    converted.ilan_id = previewData!.id || previewData!.ilan_id || 'preview';
    if (!converted.ilan_tarihi) converted.ilan_tarihi = new Date().toISOString();
    if (previewData!.title && !previewData!.baslik) converted.baslik = previewData!.title;
    if (previewData!.description && !previewData!.aciklama) converted.aciklama = previewData!.description;
    if (previewData!.price !== undefined && previewData!.fiyat === undefined) converted.fiyat = previewData!.price;
    if (previewData!.currency && !previewData!.para_birimi) converted.para_birimi = previewData!.currency;
    if (previewData!.city && !previewData!.il) converted.il = previewData!.city;
    if (previewData!.district && !previewData!.ilce) converted.ilce = previewData!.district;
    if (previewData!.images && !previewData!.resimler) {
      converted.resimler = (previewData!.images as Array<unknown>).map((img) => {
        if (typeof img === 'object' && img !== null) {
          const o = img as Record<string, string>;
          return o.url || o.preview || o.resim_url || '';
        }
        return img as string;
      }).filter(Boolean);
    }
    if (previewData!.category && !previewData!.kategori) converted.kategori = previewData!.category;
    if (!converted.ozellikler) {
      converted.ozellikler = {};
      try {
        const labelsData = sessionStorage.getItem('categoryFieldLabels');
        if (labelsData) {
          const labels = JSON.parse(labelsData) as Record<string, unknown>;
          Object.keys(labels).forEach((key) => {
            const value = (previewData as Record<string, unknown>)[key];
            if (value !== null && value !== undefined && value !== '' && value !== false) {
              (converted.ozellikler as Record<string, unknown>)[key] = value;
            }
          });
        }
      } catch { /* ignore */ }
    }
    return converted;
  })() : ((initialProduct || apiProduct) as any);

  const apiCategoryData = useCategoryPath(isPreview ? null : product?.ilan_id as string | undefined);
  const categoryPath = isPreview ? (() => {
    try { const p = sessionStorage.getItem('previewCategoryPath'); return p ? JSON.parse(p) : []; } catch { return []; }
  })() : apiCategoryData?.categoryPath;
  const adTitle = isPreview ? (() => {
    try { return sessionStorage.getItem('previewAdTitle') || (product as Record<string, unknown>)?.baslik || ''; } catch { return (product as Record<string, unknown>)?.baslik || ''; }
  })() : apiCategoryData?.adTitle;
  const categoryLoading = isPreview ? false : apiCategoryData?.loading;

  if (!isPreview && loading) return <div className="product-detail-loading"><Loader /></div>;
  if (!isPreview && error) return <ErrorMessage type="error" message={error} initialCountdown={5} onCountdownEnd={() => { window.location.href = '/'; }} />;
  if (!isPreview && !product) return <ErrorMessage type="not-found" message="İlan bulunamadı" initialCountdown={5} onCountdownEnd={() => { window.location.href = '/'; }} />;

  const p = product as Record<string, unknown>;
  if (isServiceListing(p, categoryPath, pathname)) {
    return <ServiceDetailPage />;
  }

  return (
    <>
      {!isPreview && (
        <div className="product-detail-breadcrumb-wrapper">
          <Breadcrumb2
            className="product-detail-breadcrumb"
            categoryPath={categoryPath}
            adTitle={(decodeHtmlEntities as (s: string) => string)(String(p.baslik || adTitle || ''))}
            isLoading={categoryLoading}
          />
        </div>
      )}

      <div className="product-detail-desktop-shell">
      <div className="product-detail-container">
        <div className="product-detail-header">
          <h1 className="product-detail-title">{(decodeHtmlEntities as (s: string) => string)(String(p.baslik || ''))}</h1>
          <div className="product-detail-meta">
            <div className="product-detail-meta-left">
              <span className="product-detail-id">İlan No: {String(p.ilan_id)}</span>
              <span className="product-detail-date">
                <i className="far fa-calendar-alt" />{' '}
                {p.ilan_tarihi ? (() => { try { const d = new Date(String(p.ilan_tarihi)); if (!isNaN(d.getTime())) return d.toLocaleDateString('tr-TR'); } catch { } return new Date().toLocaleDateString('tr-TR'); })() : new Date().toLocaleDateString('tr-TR')}
              </span>
            </div>
            <div className="product-detail-meta-actions">
              <button className="product-detail-action-button favorite" onClick={handleToggleFavorite} title={isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}>
                <i className={`${isFavorite ? 'fas' : 'far'} fa-heart`} />
              </button>
              <button className="product-detail-action-button share" onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: String(p.baslik || ''), text: `${String(p.baslik || '')} - Acillazım.net`, url: window.location.href }).catch(() => { });
                }
              }} title="Bu İlanı Paylaş">
                <i className="fas fa-share-alt" />
              </button>
              <button className="product-detail-action-button report" onClick={() => setComplaintModalOpen(true)} title="İlanı Şikayet Et">
                <i className="fas fa-flag" />
              </button>
            </div>
          </div>
        </div>

        <div className="product-detail-main">
          <div className="product-detail-gallery-container"><ProductGallery product={p} /></div>
          <div className="product-detail-features-section">
            <PropertyFeatureTags features={p.ozellikler} propertyType={(p.ozellikler as Record<string, unknown>)?.mulk_tipi || (typeof p.kategori === 'string' ? p.kategori : (p.kategori as Record<string, string>)?.name || '')} />
          </div>

          <div className="product-detail-tabs">
            <div className="product-detail-tabs-header">
              {['details', 'features', 'location'].map((tab) => (
                <button key={tab} className={`product-detail-tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                  {tab === 'details' ? 'İlan Detayları' : tab === 'features' ? 'İlan Özellikleri' : 'Konum ve Çevre'}
                </button>
              ))}
            </div>
            <div className="product-detail-tabs-content">
              {activeTab === 'details' && <div className="product-detail-tab-details"><h3>İlan Açıklaması</h3><ProductDescription description={String(p.aciklama || '')} /></div>}
              {activeTab === 'features' && <div className="product-detail-tab-features"><div className="product-detail-feature-tags"><ProductFeatures features={p.ozellikler} /></div></div>}
              {activeTab === 'location' && (
                <div className="product-detail-tab-location">
                  <h3>Konum Bilgisi</h3>
                  <div className="product-detail-location-info">
                    <div className="product-detail-address-info"><h4>Adres</h4><p>{String((p.konum as Record<string, string>)?.ilce || '')}, {String((p.konum as Record<string, string>)?.il || '')}</p></div>
                    <MapSection
                      address={[
                        String((p.konum as Record<string, string>)?.ilce || ''),
                        String((p.konum as Record<string, string>)?.il || ''),
                      ].filter(Boolean).join(', ')}
                      coordinates={
                        (p.konum as Record<string, unknown>)?.lat && (p.konum as Record<string, unknown>)?.lng
                          ? { lat: (p.konum as Record<string, unknown>).lat, lng: (p.konum as Record<string, unknown>).lng }
                          : undefined
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="product-detail-right-components">
            <ListingPriceCard price={p.fiyat} currency={p.para_birimi} location={{ ...p.konum as object, title: p.baslik, image: (p.resimler as string[])?.[0] || null }} features={p.ozellikler} phone={(p.iletisim_bilgileri as Record<string, string>)?.telefon || (p.ilan_sahibi as Record<string, string>)?.telefon} sellerId={(seller as Record<string, unknown>)?.id || (p.ilan_sahibi as Record<string, unknown>)?.user_id} listingId={p.ilan_id} className="product-detail-listing-price-card" />
            {seller && <SellerInfo seller={seller} className="product-detail-seller-info" onReportClick={() => setUserComplaintModalOpen(true)} />}
            <AdditionalInfo infoItems={p.ek_bilgiler} />
            {!isPreview && (
              <div className="product-detail-ad-slot">
                <AdBanner
                  pageId={3}
                  sectionId={1}
                  sectionCode="İD1"
                  categoryId={p.category_id ? Number(p.category_id) : null}
                  useSlider={true}
                  sliderInterval={8000}
                  limit={5}
                />
              </div>
            )}
          </div>
        </div>

        {((p.ozellikler as Record<string, Record<string, unknown>>)?.hasar_durumlari && Object.keys((p.ozellikler as Record<string, Record<string, unknown>>).hasar_durumlari).length > 0) ||
         ((p.ozellikler as Record<string, Record<string, unknown>>)?.parca_durumlari && Object.keys((p.ozellikler as Record<string, Record<string, unknown>>).parca_durumlari).length > 0) ? (
          <div className="product-detail-vehicle-damage-section">
            <VehicleDamageDisplay productData={p} showTitle={true} titleText="Boyalı veya Değişen Parça" />
          </div>
        ) : null}

        <div className="product-detail-similar-section">
          <SimilarProducts productId={p.ilan_id} categoryId={p.category_id} limit={50} />
        </div>

        {isAuthenticated && (
          <div className="product-detail-nearby-listings">
            <NearbyListings city={userCity || 'istanbul'} isAuthenticated={isAuthenticated} itemLimit={15} customTitle={`${(userCity || 'istanbul').toLocaleUpperCase('tr-TR')} BÖLGESİNDEKİ İLANLAR`} onItemClick={(id: unknown) => { window.location.href = `/ilan/${id}`; }} />
          </div>
        )}
      </div>
      </div>

      <MobileListingDetail
        product={p}
        seller={seller}
        isFavorite={isFavorite}
        onToggleFavorite={handleToggleFavorite}
        userCity={userCity}
        isAuthenticated={isAuthenticated}
        onReportClick={() => setComplaintModalOpen(true)}
      />

      <ComplaintModal
        isOpen={complaintModalOpen}
        onClose={() => setComplaintModalOpen(false)}
        tip="ilan"
        hedefId={String(p.ilan_id || '')}
        hedefAdi={String(p.baslik || '')}
      />

      <ComplaintModal
        isOpen={userComplaintModalOpen}
        onClose={() => setUserComplaintModalOpen(false)}
        tip="kullanici"
        hedefId={String((seller as Record<string, unknown>)?.id || (p.ilan_sahibi as Record<string, unknown>)?.user_id || '')}
        hedefAdi={String((seller as Record<string, unknown>)?.name || '')}
      />
    </>
  );
};

export default ProductDetailPage;
