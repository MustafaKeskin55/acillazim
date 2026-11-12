'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import './SuccessPage.css';

interface CreatedListing {
  title?: string;
  price?: string | number;
  currency?: string;
  category?: string;
  location?: string;
  images?: { url: string; name?: string }[];
}

export default function SuccessPage() {
  const router = useRouter();
  const [listing, setListing] = useState<CreatedListing | null>(null);
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    /* Yayınlanan ilan özeti */
    try {
      const raw = sessionStorage.getItem('createdListing');
      if (raw) setListing(JSON.parse(raw) as CreatedListing);
    } catch { /* */ }

    /* Geri sayım → dashboard */
    const timer = setInterval(() => {
      setCountdown((p) => {
        if (p <= 1) { clearInterval(timer); router.push('/dashboard'); return 0; }
        return p - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      sessionStorage.removeItem('createdListing');
      sessionStorage.removeItem('currentFormData');
    };
  }, [router]);

  const fmtPrice = (p?: string | number, cur = 'TL') => {
    if (!p) return '';
    return new Intl.NumberFormat('tr-TR').format(Number(p)) + ' ' + cur;
  };

  const handleDashboard = () => router.push('/dashboard');
  const handleNew = () => { sessionStorage.clear(); router.push('/ilan-ver'); };

  return (
    <div className="sp-root">
      <div className="sp-container">

        {/* ── Animated checkmark ── */}
        <div className="sp-icon-wrap">
          <div className="sp-check-circle">
            <svg className="sp-svg" viewBox="0 0 52 52">
              <circle className="sp-circle" cx="26" cy="26" r="25" fill="none" />
              <path className="sp-path" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
            </svg>
          </div>
        </div>

        {/* ── Heading ── */}
        <h1 className="sp-title">İlanınız Başarıyla Oluşturuldu!</h1>
        <p className="sp-subtitle">İnceleme sonrası yayınlanacaktır</p>

        {/* ── Review info ── */}
        <div className="sp-info-card">
          <div className="sp-info-icon">⏱</div>
          <div>
            <h3>İnceleme Süreci</h3>
            <p>
              İlanınız ekibimiz tarafından <strong>24 saat içinde</strong> incelenecek
              ve onaylandıktan sonra yayına alınacaktır.
            </p>
          </div>
        </div>

        {/* ── Listing summary ── */}
        {listing && (
          <div className="sp-summary">
            <h4 className="sp-summary-title">İlan Özeti</h4>
            <div className="sp-summary-grid">
              {listing.title && (
                <div className="sp-summary-row">
                  <span className="sp-summary-key">Başlık</span>
                  <span className="sp-summary-val">{listing.title}</span>
                </div>
              )}
              {listing.price && (
                <div className="sp-summary-row">
                  <span className="sp-summary-key">Fiyat</span>
                  <span className="sp-summary-val">
                    {fmtPrice(listing.price, listing.currency)}
                  </span>
                </div>
              )}
              {listing.category && (
                <div className="sp-summary-row">
                  <span className="sp-summary-key">Kategori</span>
                  <span className="sp-summary-val">{listing.category}</span>
                </div>
              )}
              {listing.location && (
                <div className="sp-summary-row">
                  <span className="sp-summary-key">Konum</span>
                  <span className="sp-summary-val">{listing.location}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Steps ── */}
        <div className="sp-steps">
          <h4 className="sp-steps-title">Sırada Ne Var?</h4>
          <div className="sp-steps-list">
            <div className="sp-step">
              <div className="sp-step-num sp-step-num--done">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8l3.5 3.5L13 5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <h5>İlan Oluşturuldu</h5>
                <p>İlanınız başarıyla kaydedildi</p>
              </div>
            </div>

            <div className="sp-step">
              <div className="sp-step-num sp-step-num--active">2</div>
              <div>
                <h5>İnceleme Aşaması</h5>
                <p>Ekibimiz ilanınızı inceliyor — 24 saat içinde</p>
              </div>
            </div>

            <div className="sp-step">
              <div className="sp-step-num">3</div>
              <div>
                <h5>Yayınlanma</h5>
                <p>Onay sonrası yayına alınacak</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Notification note ── */}
        <div className="sp-notify">
          <span>🔔</span>
          <p>
            İlan durumunuz hakkında <strong>e-posta ve bildirim</strong> alacaksınız.
          </p>
        </div>

        {/* ── Actions ── */}
        <div className="sp-actions">
          <button className="sp-btn sp-btn--primary" onClick={handleDashboard}>
            İlanlarımı Görüntüle
          </button>
          <button className="sp-btn sp-btn--secondary" onClick={handleNew}>
            Yeni İlan Oluştur
          </button>
        </div>

        {/* ── Countdown ── */}
        <p className="sp-redirect">
          <span className="sp-countdown">{countdown}</span> saniye sonra dashboard&apos;a
          yönlendirileceksiniz...
        </p>

        {/* ── Help ── */}
        <div className="sp-help">
          <a href="/yardim" className="sp-help-link">Yardım Merkezi</a>
          &nbsp;·&nbsp;
          <a href="/iletisim" className="sp-help-link">İletişim</a>
        </div>
      </div>
    </div>
  );
}
