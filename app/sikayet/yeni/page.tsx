'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFlag, faTimes, faSpinner, faExclamationTriangle,
  faArrowLeft, faShieldAlt, faList, faUser, faHeart, faCheckCircle,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@/context/AuthContext';
import { favoriteService } from '@/services/favorites/favoriteService';
import '../SikayetForm.css';
import './SikayetYeni.css';

type HedefTipi = 'ilan' | 'kullanici';

interface FavoriIlanItem {
  id: string | number;
  listingId: string | number;
  listingData?: Record<string, unknown>;
}

/** Host normalize -> {host}/api/v1 (diger servislerle ayni desen) */
function resolveApiV1Base(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
  if (!raw) return '/api/v1';
  const host = raw.replace(/\/api\/v1\/?$/i, '').replace(/\/api\/?$/i, '').replace(/\/v1\/?$/i, '');
  return `${host}/api/v1`;
}

const YeniSikayetPage: React.FC = () => {
  const router = useRouter();
  const { isAuthenticated, authToken } = useAuth();

  const [hedefTipi, setHedefTipi] = useState<HedefTipi | null>(null);
  const [favoriler, setFavoriler] = useState<FavoriIlanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [yukleHata, setYukleHata] = useState<string | null>(null);
  const [cozumleniyorId, setCozumleniyorId] = useState<string | number | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/giris?returnUrl=' + encodeURIComponent('/sikayet/yeni'));
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!hedefTipi || !isAuthenticated) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setYukleHata(null);
      try {
        const result = await favoriteService.getUserFavoriteListings();
        if (cancelled) return;
        if (!result.success || !result.data) {
          setFavoriler([]);
          return;
        }
        setFavoriler(result.data as unknown as FavoriIlanItem[]);
      } catch {
        if (!cancelled) setYukleHata('Favori ilanlarınız yüklenirken bir hata oluştu');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [hedefTipi, isAuthenticated]);

  const handleHedefTipiSecim = (tip: HedefTipi) => {
    setHata(null);
    setHedefTipi(tip);
  };

  const handleIlanSecim = async (item: FavoriIlanItem) => {
    if (!hedefTipi || cozumleniyorId != null) return;
    setHata(null);

    if (hedefTipi === 'ilan') {
      router.push(`/sikayet/ilan/${item.listingId}`);
      return;
    }

    // Kullanıcı şikayeti: ilan sahibinin gerçek kullanıcı ID'sini backend'den çöz
    setCozumleniyorId(item.id);
    try {
      const response = await fetch(`${resolveApiV1Base()}/listings/${item.listingId}`, {
        headers: {
          Accept: 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });
      if (!response.ok) throw new Error('İlan sahibi bilgisi alınamadı');
      const body: unknown = await response.json();
      const data = (body && typeof body === 'object' && 'data' in (body as object)
        ? (body as { data: unknown }).data
        : body) as Record<string, unknown> | null;
      const ownerId = data?.userId ?? data?.user_id;
      if (ownerId == null) throw new Error('İlan sahibi bilgisi bulunamadı');
      router.push(`/sikayet/kullanici/${ownerId}`);
    } catch (err) {
      setHata(err instanceof Error ? err.message : 'İlan sahibi bilgisi alınırken bir hata oluştu');
    } finally {
      setCozumleniyorId(null);
    }
  };

  const geriGit = () => {
    if (hedefTipi) { setHedefTipi(null); setHata(null); return; }
    router.back();
  };

  const ilanBaslik = (item: FavoriIlanItem) => String(item.listingData?.title ?? item.listingData?.baslik ?? `İlan #${item.listingId}`);
  const ilanGorsel = (item: FavoriIlanItem) => {
    const img = item.listingData?.image;
    return typeof img === 'string' && img ? img : null;
  };
  const ilanFiyat = (item: FavoriIlanItem) => {
    const price = item.listingData?.price;
    const currency = item.listingData?.currency;
    if (price == null) return null;
    return `${price} ${currency || 'TL'}`;
  };

  return (
    <div className="sikayet-form-container">
      <div className="sikayet-form-header">
        <button onClick={geriGit} className="btn-geri"><FontAwesomeIcon icon={faArrowLeft} /></button>
        <div className="header-baslik"><FontAwesomeIcon icon={faFlag} /><h1>Yeni Şikayet</h1></div>
        <div className="header-bilgi"><FontAwesomeIcon icon={faShieldAlt} /><span>Gizli</span></div>
      </div>

      <div className="sikayet-form-adimlar">
        <div className={`adim ${!hedefTipi ? 'aktif' : 'tamamlandi'}`}><span className="adim-numarasi">1</span><span className="adim-adi">Tür</span></div>
        <div className={`adim-cizgi ${hedefTipi ? 'aktif' : ''}`}></div>
        <div className={`adim ${hedefTipi ? 'aktif' : ''}`}><span className="adim-numarasi">2</span><span className="adim-adi">Hedef Seç</span></div>
      </div>

      {hata && <div className="sikayet-hata"><FontAwesomeIcon icon={faExclamationTriangle} /><span>{hata}</span><button onClick={() => setHata(null)}><FontAwesomeIcon icon={faTimes} /></button></div>}

      <div className="sikayet-form">
        {!hedefTipi && (
          <div className="adim-icerik">
            <h2>Ne Hakkında Şikayet Etmek İstiyorsunuz?</h2>
            <p className="adim-aciklama">Şikayetinizin türünü seçin.</p>
            <div className="kategori-listesi">
              <button type="button" className="kategori-secenek" onClick={() => handleHedefTipiSecim('ilan')} style={{ '--kategori-renk': '#e74c3c' } as React.CSSProperties}>
                <div className="kategori-ikon-kutu"><FontAwesomeIcon icon={faList} /></div>
                <div className="kategori-metin"><span className="kategori-adi">Bir İlan Hakkında</span><span className="kategori-aciklama">Favori ilanlarınızdan birini şikayet edin</span></div>
              </button>
              <button type="button" className="kategori-secenek" onClick={() => handleHedefTipiSecim('kullanici')} style={{ '--kategori-renk': '#3498db' } as React.CSSProperties}>
                <div className="kategori-ikon-kutu"><FontAwesomeIcon icon={faUser} /></div>
                <div className="kategori-metin"><span className="kategori-adi">İlan Sahibini (Kullanıcı)</span><span className="kategori-aciklama">Favori bir ilanın sahibini şikayet edin</span></div>
              </button>
            </div>
          </div>
        )}

        {hedefTipi && (
          <div className="adim-icerik">
            <h2>{hedefTipi === 'ilan' ? 'Hangi İlanı Şikayet Etmek İstiyorsunuz?' : 'Hangi İlanın Sahibini Şikayet Etmek İstiyorsunuz?'}</h2>
            <p className="adim-aciklama">
              {hedefTipi === 'ilan'
                ? 'Favori ilanlarınızdan şikayet etmek istediğinizi seçin.'
                : 'Favori ilanlarınızdan birini seçin, o ilanın sahibi şikayet edilecektir.'}
            </p>

            {loading && (
              <div className="favori-yukleniyor"><FontAwesomeIcon icon={faSpinner} spin /> Favori ilanlarınız yükleniyor...</div>
            )}

            {!loading && yukleHata && (
              <div className="hata-mesaji"><FontAwesomeIcon icon={faExclamationTriangle} />{yukleHata}</div>
            )}

            {!loading && !yukleHata && favoriler.length === 0 && (
              <div className="favori-bos">
                <FontAwesomeIcon icon={faHeart} className="favori-bos-ikon" />
                <p>Favori ilanınız bulunmuyor. Şikayet etmek istediğiniz ilanı önce favorilerinize ekleyin veya ilan detay sayfasındaki &quot;Şikayet Et&quot; butonunu kullanın.</p>
                <button type="button" className="btn-sonraki favori-anasayfa-btn" onClick={() => router.push('/')}>Anasayfaya Git</button>
              </div>
            )}

            {!loading && favoriler.length > 0 && (
              <div className="favori-listesi">
                {favoriler.map((item) => {
                  const cozumleniyor = cozumleniyorId === item.id;
                  const gorsel = ilanGorsel(item);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="favori-item"
                      disabled={cozumleniyor}
                      onClick={() => handleIlanSecim(item)}
                    >
                      <div className="favori-item-gorsel">
                        {gorsel ? <img src={gorsel} alt={ilanBaslik(item)} /> : <FontAwesomeIcon icon={faList} />}
                      </div>
                      <div className="favori-item-metin">
                        <span className="favori-item-baslik">{ilanBaslik(item)}</span>
                        {ilanFiyat(item) && <span className="favori-item-fiyat">{ilanFiyat(item)}</span>}
                      </div>
                      {cozumleniyor ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faCheckCircle} className="favori-item-ok" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default YeniSikayetPage;
