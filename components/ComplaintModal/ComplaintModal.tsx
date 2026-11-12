'use client';

import React, { useState, useEffect } from 'react';
import {
  faFlag, faTimes, faSpinner, faCheckCircle, faExclamationTriangle,
  faInfoCircle, faArrowLeft, faArrowRight, faShieldAlt,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '@/context/AuthContext';
import { sikayetService } from '@/services/sikayet';
import sikayetKategorileriData from '@/data/sikayet-kategorileri.json';
import './ComplaintModal.css';

interface DinamikFormAlani {
  id: string;
  tip: 'text' | 'textarea' | 'select' | 'datetime' | 'time' | 'number';
  label: string;
  zorunlu: boolean;
  placeholder?: string;
  secenekler?: string[];
}

interface SikayetKategoriUI {
  id: string;
  adi: string;
  aciklama: string;
  ikon?: string;
  renk: string;
  formAlanlari: DinamikFormAlani[];
}

interface FormHatalari {
  kategoriId?: string;
  [key: string]: string | undefined;
}

interface ComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  tip: 'ilan' | 'kullanici';
  hedefId: string;
  hedefAdi?: string;
}

/**
 * `data/sikayet-kategorileri.json` yalnızca sunum katmanı (ikon/renk/dinamik form
 * alanları) için kullanılır — id/label'lar canlı BE'nin (GET /api/v1/complaints/categories)
 * ComplaintServiceImpl'deki USER_CATEGORIES/LISTING_CATEGORIES ile bilerek birebir eşleşecek
 * şekilde tutuluyor. Kategori listesi her açılışta BE'den doğrulanır; BE'de olup burada UI
 * meta verisi bulunmayan (legacy: spam/fraud/other vb.) kategoriler için sade bir açıklama
 * formuna düşülür.
 */
const UI_META_BY_ID: Record<string, Omit<SikayetKategoriUI, 'id' | 'adi'>> = (() => {
  const map: Record<string, Omit<SikayetKategoriUI, 'id' | 'adi'>> = {};
  const kaynaklar = [
    ...sikayetKategorileriData.ilanSikayetleri,
    ...sikayetKategorileriData.kullaniciSikayetleri,
  ];
  kaynaklar.forEach((k) => {
    map[k.id] = {
      aciklama: k.aciklama,
      ikon: k.ikon,
      renk: k.renk,
      formAlanlari: k.formAlanlari as DinamikFormAlani[],
    };
  });
  return map;
})();

const varsayilanUIMeta = (adi: string): Omit<SikayetKategoriUI, 'id' | 'adi'> => ({
  aciklama: adi,
  renk: '#3498db',
  formAlanlari: [
    { id: 'aciklama', tip: 'textarea', label: 'Açıklama', zorunlu: true, placeholder: 'Detayları açıklayın' },
  ],
});

const ComplaintModal: React.FC<ComplaintModalProps> = ({ isOpen, onClose, tip, hedefId, hedefAdi }) => {
  const { isAuthenticated, authToken } = useAuth();
  const [kategoriler, setKategoriler] = useState<SikayetKategoriUI[]>([]);
  const [kategorilerYukleniyor, setKategorilerYukleniyor] = useState(false);

  // Kategori listesini canlı BE'den al (GET /api/v1/complaints/categories) ve
  // yerel ikon/renk/form meta verisiyle birleştir.
  useEffect(() => {
    if (!isOpen) return;
    let iptal = false;
    setKategorilerYukleniyor(true);
    sikayetService
      .getKategoriler(tip === 'ilan' ? 'listing' : 'user')
      .then((beKategoriler) => {
        if (iptal) return;
        const merged: SikayetKategoriUI[] = beKategoriler.map((k) => ({
          id: k.id,
          adi: k.adi,
          ...(UI_META_BY_ID[k.id] || varsayilanUIMeta(k.adi)),
        }));
        setKategoriler(merged);
      })
      .catch((err) => {
        console.error('Şikayet kategorileri BE\'den alınamadı:', err);
        if (iptal) return;
        // Son çare: BE'ye erişilemezse yerel UI listesini göster (kategori id'leri BE ile birebir eşleşiyor)
        const fallback = tip === 'ilan' ? sikayetKategorileriData.ilanSikayetleri : sikayetKategorileriData.kullaniciSikayetleri;
        setKategoriler(fallback as SikayetKategoriUI[]);
      })
      .finally(() => {
        if (!iptal) setKategorilerYukleniyor(false);
      });
    return () => {
      iptal = true;
    };
  }, [isOpen, tip]);

  const [kategoriId, setKategoriId] = useState('');
  const [dinamikDegerler, setDinamikDegerler] = useState<Record<string, string>>({});
  const [hatalar, setHatalar] = useState<FormHatalari>({});
  const [gönderiyor, setGönderiyor] = useState(false);
  const [basarili, setBasarili] = useState(false);
  const [sikayetId, setSikayetId] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [aktifAdim, setAktifAdim] = useState(1);

  const secilenKategori = kategoriler.find(k => k.id === kategoriId);
  const dinamikAlanlar: DinamikFormAlani[] = secilenKategori?.formAlanlari || [];

  useEffect(() => {
    if (!isOpen) {
      setKategoriId('');
      setDinamikDegerler({});
      setHatalar({});
      setBasarili(false);
      setSikayetId('');
      setHata(null);
      setAktifAdim(1);
      setGönderiyor(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setDinamikDegerler({});
    setHatalar({});
  }, [kategoriId]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleKategoriSelect = (id: string) => {
    setKategoriId(id);
    if (hatalar.kategoriId) setHatalar(prev => ({ ...prev, kategoriId: undefined }));
  };

  const handleDinamikInputChange = (alanId: string, deger: string) => {
    setDinamikDegerler(prev => ({ ...prev, [alanId]: deger }));
    if (hatalar[alanId]) setHatalar(prev => ({ ...prev, [alanId]: undefined }));
  };

  const formuDogrula = (): boolean => {
    const yeniHatalar: FormHatalari = {};
    if (!kategoriId) { yeniHatalar.kategoriId = 'Şikayet türü seçin'; setHatalar(yeniHatalar); return false; }
    dinamikAlanlar.forEach(alan => {
      if (alan.zorunlu && !dinamikDegerler[alan.id]?.trim()) {
        yeniHatalar[alan.id] = `${alan.label} zorunludur`;
      }
    });
    setHatalar(yeniHatalar);
    return Object.keys(yeniHatalar).length === 0;
  };

  const handleSubmit = async () => {
    if (!formuDogrula()) return;
    if (!isAuthenticated || !authToken) { setHata('Giriş yapmalısınız'); return; }
    if (!secilenKategori) return;
    if (!hedefId) { setHata('Hedef bilgisi eksik, lütfen sayfayı yenileyip tekrar deneyin'); return; }
    setGönderiyor(true);
    setHata(null);
    try {
      const detaylar = dinamikAlanlar
        .map(alan => `${alan.label}: ${dinamikDegerler[alan.id] || '-'}`)
        .join('\n');
      const aciklama = detaylar ? `${secilenKategori.aciklama}\n\n${detaylar}` : secilenKategori.aciklama;

      const created = await sikayetService.createSikayet({
        targetType: tip === 'ilan' ? 'listing' : 'user',
        sikayetEdilenId: hedefId,
        kategoriId: secilenKategori.id,
        baslik: secilenKategori.adi,
        aciklama,
      }, authToken);

      setSikayetId(String(created.id));
      setBasarili(true);
    } catch (err) {
      setHata(err instanceof Error ? err.message : 'Şikayet gönderilirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setGönderiyor(false);
    }
  };

  const birSonrakiAdim = () => {
    if (aktifAdim === 1 && !kategoriId) { setHatalar({ kategoriId: 'Bir tür seçin' }); return; }
    if (aktifAdim === 2) {
      const eksik = dinamikAlanlar.filter(a => a.zorunlu && !dinamikDegerler[a.id]?.trim());
      if (eksik.length > 0) { const h: FormHatalari = {}; eksik.forEach(a => { h[a.id] = `${a.label} zorunludur`; }); setHatalar(h); return; }
    }
    setAktifAdim(prev => Math.min(prev + 1, 3));
  };

  const renderAlan = (alan: DinamikFormAlani) => {
    const d = dinamikDegerler[alan.id] || '';
    const h = !!hatalar[alan.id];
    switch (alan.tip) {
      case 'text': return <input type="text" value={d} onChange={e => handleDinamikInputChange(alan.id, e.target.value)} placeholder={alan.placeholder} className={h ? 'hatalı' : ''} />;
      case 'textarea': return <textarea value={d} onChange={e => handleDinamikInputChange(alan.id, e.target.value)} placeholder={alan.placeholder} rows={2} className={h ? 'hatalı' : ''} />;
      case 'select': return <select value={d} onChange={e => handleDinamikInputChange(alan.id, e.target.value)} className={h ? 'hatalı' : ''}><option value="">Seçiniz...</option>{alan.secenekler?.map(s => <option key={s} value={s}>{s}</option>)}</select>;
      case 'datetime': return <input type="datetime-local" value={d} onChange={e => handleDinamikInputChange(alan.id, e.target.value)} className={h ? 'hatalı' : ''} />;
      case 'time': return <input type="time" value={d} onChange={e => handleDinamikInputChange(alan.id, e.target.value)} className={h ? 'hatalı' : ''} />;
      case 'number': return <input type="number" value={d} onChange={e => handleDinamikInputChange(alan.id, e.target.value)} placeholder={alan.placeholder} className={h ? 'hatalı' : ''} />;
      default: return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cm-overlay" onClick={onClose}>
      <div className="cm-modal" onClick={e => e.stopPropagation()}>
        <div className="cm-header">
          <div className="cm-header-left">
            <FontAwesomeIcon icon={faFlag} className="cm-header-icon" />
            <h2>{tip === 'ilan' ? 'İlan Şikayeti' : 'Kullanıcı Şikayeti'}</h2>
          </div>
          <div className="cm-header-right">
            <span className="cm-gizli"><FontAwesomeIcon icon={faShieldAlt} /> Gizli</span>
            <button className="cm-kapat" onClick={onClose}><FontAwesomeIcon icon={faTimes} /></button>
          </div>
        </div>

        {!basarili && (
          <div className="cm-adimlar">
            <div className={`cm-adim ${aktifAdim >= 1 ? 'aktif' : ''} ${aktifAdim > 1 ? 'tamamlandi' : ''}`}><span className="cm-adim-no">1</span><span className="cm-adim-text">Tür</span></div>
            <div className={`cm-adim-cizgi ${aktifAdim >= 2 ? 'aktif' : ''}`}></div>
            <div className={`cm-adim ${aktifAdim >= 2 ? 'aktif' : ''} ${aktifAdim > 2 ? 'tamamlandi' : ''}`}><span className="cm-adim-no">2</span><span className="cm-adim-text">Detay</span></div>
            <div className={`cm-adim-cizgi ${aktifAdim >= 3 ? 'aktif' : ''}`}></div>
            <div className={`cm-adim ${aktifAdim >= 3 ? 'aktif' : ''}`}><span className="cm-adim-no">3</span><span className="cm-adim-text">Gönder</span></div>
          </div>
        )}

        <div className="cm-body">
          {hata && <div className="cm-hata"><FontAwesomeIcon icon={faExclamationTriangle} /><span>{hata}</span><button onClick={() => setHata(null)}><FontAwesomeIcon icon={faTimes} /></button></div>}

          {basarili ? (
            <div className="cm-basarili">
              <div className="cm-basarili-icon"><FontAwesomeIcon icon={faCheckCircle} /></div>
              <h3>Şikayetiniz Alındı!</h3>
              <p>Şikayetiniz başarıyla kaydedildi. En kısa sürede değerlendirilecektir.</p>
              <div className="cm-bilgiler">
                <div className="cm-bilgi"><span className="cm-bilgi-label">Şikayet No</span><span className="cm-bilgi-deger">{sikayetId}</span></div>
                <div className="cm-bilgi"><span className="cm-bilgi-label">Tahmini Süre</span><span className="cm-bilgi-deger">24-48 saat</span></div>
              </div>
              <div className="cm-bilgi-not"><FontAwesomeIcon icon={faInfoCircle} /><p>Takip için <strong>dashboard/sikayetlerim-taleplerim</strong> sayfasına gidin.</p></div>
              <button className="cm-btn-tamam" onClick={onClose}>Tamam</button>
            </div>
          ) : (
            <>
              {aktifAdim === 1 && (
                <div className="cm-adim-icerik">
                  <h3>Şikayet Türünü Seçin</h3>
                  <p className="cm-aciklama">{tip === 'ilan' ? 'İlanla ilgili sorunu belirleyin.' : 'Kullanıcıyla ilgili sorunu belirleyin.'}</p>
                  {kategorilerYukleniyor && kategoriler.length === 0 && (
                    <p className="cm-aciklama"><FontAwesomeIcon icon={faSpinner} spin /> Kategoriler yükleniyor...</p>
                  )}
                  <div className="cm-kategoriler">
                    {kategoriler.map(k => (
                      <button key={k.id} type="button" className={`cm-kategori ${kategoriId === k.id ? 'secili' : ''}`} onClick={() => handleKategoriSelect(k.id)} style={{ '--kategori-renk': k.renk } as React.CSSProperties}>
                        <div className="cm-kategori-ikon"><FontAwesomeIcon icon={faFlag} /></div>
                        <div className="cm-kategori-metin"><span className="cm-kategori-adi">{k.adi}</span><span className="cm-kategori-aciklama">{k.aciklama}</span></div>
                        {kategoriId === k.id && <FontAwesomeIcon icon={faCheckCircle} className="cm-secili-ikon" />}
                      </button>
                    ))}
                  </div>
                  {hatalar.kategoriId && <div className="cm-hata-mesaji"><FontAwesomeIcon icon={faExclamationTriangle} />{hatalar.kategoriId}</div>}
                </div>
              )}

              {aktifAdim === 2 && secilenKategori && (
                <div className="cm-adim-icerik">
                  <h3>{secilenKategori.adi}</h3>
                  <p className="cm-aciklama">Bilgileri doldurun.</p>
                  <div className="cm-dinamik-form">
                    {dinamikAlanlar.map(alan => (
                      <div key={alan.id} className="cm-form-alani">
                        <label>{alan.label}{alan.zorunlu && <span className="cm-zorunlu">*</span>}</label>
                        {renderAlan(alan)}
                        {hatalar[alan.id] && <div className="cm-hata-mesaji"><FontAwesomeIcon icon={faExclamationTriangle} />{hatalar[alan.id]}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aktifAdim === 3 && (
                <div className="cm-adim-icerik">
                  <h3>Özet ve Gönder</h3>
                  <div className="cm-ozet">
                    <div className="cm-ozet-satir"><span className="cm-ozet-label">Tür:</span><span className="cm-ozet-deger">{secilenKategori?.adi}</span></div>
                    {dinamikAlanlar.map(a => <div key={a.id} className="cm-ozet-satir"><span className="cm-ozet-label">{a.label}:</span><span className="cm-ozet-deger">{dinamikDegerler[a.id] || '-'}</span></div>)}
                  </div>
                  <div className="cm-uyari"><FontAwesomeIcon icon={faShieldAlt} /><p>Şikayetiniz gizli tutulur. Yanlış şikayetler hesabınızın askıya alınmasına neden olabilir.</p></div>
                </div>
              )}

              <div className="cm-butonlar">
                {aktifAdim > 1 ? <button type="button" onClick={() => setAktifAdim(p => p - 1)} className="cm-btn-onceki"><FontAwesomeIcon icon={faArrowLeft} /> Geri</button> : <div />}
                {aktifAdim < 3 ? <button type="button" onClick={birSonrakiAdim} className="cm-btn-sonraki">Devam <FontAwesomeIcon icon={faArrowRight} /></button> :
                  <button type="button" onClick={handleSubmit} className="cm-btn-gonder" disabled={gönderiyor}>{gönderiyor ? <><FontAwesomeIcon icon={faSpinner} spin /> Gönderiliyor...</> : <><FontAwesomeIcon icon={faFlag} /> Gönder</>}</button>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComplaintModal;