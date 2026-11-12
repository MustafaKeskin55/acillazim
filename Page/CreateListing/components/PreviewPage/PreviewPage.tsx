'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './PreviewPage.css';
import ProductDetailPage from '@/Page/ProductDetail/ProductDetailPage';
import ServiceDetailPage from '@/Page/ServiceDetail/ServiceDetailPage';
import createListingService from '@/services/createListing';

interface ListingData {
  title?: string;
  price?: string | number;
  currency?: string;
  category?: { id: string | number; name: string };
  rootCategory?: { id: string | number; name: string };
  city?: string;
  district?: string;
  images?: { id: string; url: string; name: string }[];
  [key: string]: unknown;
}

export default function PreviewPage() {
  const router = useRouter();

  const [data, setData] = useState<ListingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedContract, setAcceptedContract] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isService, setIsService] = useState(false);

  /* ── Load form data ── */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('listingFormData');
      if (!raw) { router.replace('/ilan-form'); return; }
      const parsed = JSON.parse(raw) as ListingData;
      if (!parsed.title) { router.replace('/ilan-form'); return; }

      /* Hizmet kategorisi tespiti */
      const catName     = (parsed.category?.name || '').toLowerCase();
      const rootCatId   = String(parsed.rootCategory?.id || '');
      const rootCatName = (parsed.rootCategory?.name || '').toLowerCase();

      /* "Ustalar ve Hizmetler" root kategorisi ID'si: 12540 */
      const isServiceRoot =
        rootCatId === '12540' ||
        Number(rootCatId) === 12540 ||
        rootCatName.includes('ustalar') ||
        rootCatName.includes('hizmet');

      const hasServiceFields = !!(
        (parsed as Record<string,unknown>).packages ||
        (parsed as Record<string,unknown>).workingHours ||
        (parsed as Record<string,unknown>).features
      );

      const serviceDetected =
        isServiceRoot ||
        hasServiceFields ||
        catName.includes('usta') ||
        catName.includes('hizmet') ||
        catName.includes('service') ||
        catName.includes('hızmet');
      setIsService(serviceDetected);

      /* Preview için mock ilan ID */
      sessionStorage.setItem('previewIlanId', 'preview-' + Date.now());

      setData(parsed);
    } catch {
      router.replace('/ilan-form');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleAccept = () => {
    if (!acceptedTerms || !acceptedContract) return;
    setShowOverlay(false);
  };

  const handlePublish = async () => {
    if (!data) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await createListingService.createListing(
        data as Parameters<typeof createListingService.createListing>[0]
      );

      sessionStorage.setItem('createdListing', JSON.stringify({
        title: data.title,
        price: data.price,
        currency: data.currency || 'TL',
        category: data.category?.name || '',
        location: [data.city, data.district].filter(Boolean).join(', '),
        images: data.images || [],
      }));
      sessionStorage.removeItem('listingFormData');
      sessionStorage.removeItem('previewIlanId');
      router.push('/ilan-ver/basarili');
    } catch (e) {
      setSubmitError((e as Error).message || 'Bir hata oluştu, lütfen tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="pp-loading">
        <div className="pp-spinner" />
      </div>
    );
  }

  if (!data) return null;

  /* ── Render ── */
  return (
    <div className="pp-root">

      {/* ── PREVIEW BANNER ── */}
      <div className="pp-banner">
        <div className="pp-banner-info">
          <span className="pp-banner-label">👁 Önizleme Modu</span>
          <span className="pp-banner-sub">Yayınlanmadan önce ilanınız böyle görünecek</span>
        </div>

        {!showOverlay && (
          <div className="pp-banner-actions">
            <button className="pp-banner-back" onClick={() => {
              /* Forma geri dönüşte veri temizlenmesin */
              sessionStorage.setItem('returningFromPreview', 'true');
              router.back();
            }}>
              ← Geri
            </button>
            <button
              className="pp-banner-publish"
              onClick={handlePublish}
              disabled={submitting}
            >
              {submitting
                ? <><span className="pp-btn-spinner" /> Gönderiliyor...</>
                : <>✓ Onaya Gönder</>
              }
            </button>
          </div>
        )}
      </div>

      {/* ── İlan Detay — kategoriye göre doğru tasarım ── */}
      <div className="pp-detail-wrap">
        {isService ? (
          <ServiceDetailPage previewData={data as Record<string, unknown>} />
        ) : (
          <ProductDetailPage previewData={data as Record<string, unknown>} />
        )}
      </div>

      {submitError && (
        <div className="pp-error-bar">{submitError}</div>
      )}

      {/* ── CONTRACT OVERLAY ── */}
      {showOverlay && (
        <div className="pp-overlay">
          <div className="pp-overlay-modal">
            <div className="pp-overlay-icon">📋</div>
            <h2 className="pp-overlay-title">Sözleşmeler & Kurallar</h2>
            <p className="pp-overlay-sub">
              İlanınızı yayınlamadan önce aşağıdaki sözleşmeleri onaylayın.
            </p>

            <div className="pp-agreements">
              <label className="pp-agreement-row">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="pp-checkbox"
                />
                <span className="pp-agreement-text">
                  <Link href="/kullanim-sartlari" target="_blank" className="pp-link">
                    Kullanım Şartları
                  </Link>
                  &apos;nı okudum ve kabul ediyorum
                  <span className="pp-required"> *</span>
                </span>
              </label>

              <label className="pp-agreement-row">
                <input
                  type="checkbox"
                  checked={acceptedContract}
                  onChange={(e) => setAcceptedContract(e.target.checked)}
                  className="pp-checkbox"
                />
                <span className="pp-agreement-text">
                  <Link href="/ilan-sozlesmesi" target="_blank" className="pp-link">
                    İlan Yayınlama Sözleşmesi
                  </Link>
                  &apos;ni okudum ve kabul ediyorum
                  <span className="pp-required"> *</span>
                </span>
              </label>
            </div>

            <div className="pp-info-box">
              <span className="pp-info-icon">⏱</span>
              <p>
                İlanınız <strong>24 saat içinde</strong> ekibimizce incelenerek
                onay sonrasında yayına alınacaktır.
              </p>
            </div>

            <div className="pp-overlay-actions">
              <button className="pp-btn-secondary" onClick={() => router.back()}>
                ← Geri Dön
              </button>
              <button
                className="pp-btn-primary"
                onClick={handleAccept}
                disabled={!acceptedTerms || !acceptedContract}
              >
                Kabul Et ve Önizle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
