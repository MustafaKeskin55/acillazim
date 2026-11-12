'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFlag, faTimes, faSpinner, faCheckCircle, faExclamationTriangle,
  faInfoCircle, faArrowLeft, faArrowRight, faShieldAlt, faHome, faListUl,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@/context/AuthContext';
import { sikayetService } from '@/services/sikayet';
import sikayetKategorileriData from '@/data/sikayet-kategorileri.json';
import '../../SikayetForm.css';

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

interface SikayetFormu {
  kategoriId: string;
  dinamikDegerler: Record<string, string>;
}

interface FormHatalari {
  kategoriId?: string;
  [key: string]: string | undefined;
}

/**
 * `data/sikayet-kategorileri.json` sadece sunum (ikon/renk/dinamik form alanları) için
 * kullanılır — id/label BE'nin (GET /api/v1/complaints/categories) USER_CATEGORIES ile
 * bilerek birebir eşleşiyor. Liste her sayfa yüklemesinde BE'den doğrulanır.
 */
const UI_META_BY_ID: Record<string, Omit<SikayetKategoriUI, 'id' | 'adi'>> = (() => {
  const map: Record<string, Omit<SikayetKategoriUI, 'id' | 'adi'>> = {};
  sikayetKategorileriData.kullaniciSikayetleri.forEach((k) => {
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

const KullaniciSikayetPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const { currentUser, isAuthenticated, authToken } = useAuth();

  const userId = params.userId as string;
  const [kategoriler, setKategoriler] = useState<SikayetKategoriUI[]>([]);

  // Kategori listesini canlı BE'den al (GET /api/v1/complaints/categories)
  useEffect(() => {
    let iptal = false;
    sikayetService
      .getKategoriler('user')
      .then((beKategoriler) => {
        if (iptal) return;
        setKategoriler(
          beKategoriler.map((k) => ({
            id: k.id,
            adi: k.adi,
            ...(UI_META_BY_ID[k.id] || varsayilanUIMeta(k.adi)),
          }))
        );
      })
      .catch((err) => {
        console.error('Şikayet kategorileri BE\'den alınamadı:', err);
        if (iptal) return;
        setKategoriler(sikayetKategorileriData.kullaniciSikayetleri as SikayetKategoriUI[]);
      });
    return () => {
      iptal = true;
    };
  }, []);

  const [form, setForm] = useState<SikayetFormu>({ kategoriId: '', dinamikDegerler: {} });
  const [hatalar, setHatalar] = useState<FormHatalari>({});
  const [gönderiyor, setGönderiyor] = useState(false);
  const [basarili, setBasarili] = useState(false);
  const [sikayetId, setSikayetId] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [aktifAdim, setAktifAdim] = useState(1);

  const secilenKategori = kategoriler.find(k => k.id === form.kategoriId);
  const dinamikAlanlar: DinamikFormAlani[] = secilenKategori?.formAlanlari || [];

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/giris?returnUrl=' + encodeURIComponent(`/sikayet/kullanici/${userId}`));
    }
  }, [isAuthenticated, router, userId]);

  useEffect(() => {
    setForm(prev => ({ ...prev, dinamikDegerler: {} }));
    setHatalar({});
  }, [form.kategoriId]);

  const handleKategoriSelect = (kategoriId: string) => {
    setForm(prev => ({ ...prev, kategoriId }));
    if (hatalar.kategoriId) setHatalar(prev => ({ ...prev, kategoriId: undefined }));
  };

  const handleDinamikInputChange = (alanId: string, deger: string) => {
    setForm(prev => ({ ...prev, dinamikDegerler: { ...prev.dinamikDegerler, [alanId]: deger } }));
    if (hatalar[alanId]) setHatalar(prev => ({ ...prev, [alanId]: undefined }));
  };

  const formuDogrula = (): boolean => {
    const yeniHatalar: FormHatalari = {};
    if (!form.kategoriId) { yeniHatalar.kategoriId = 'Şikayet türü seçin'; setHatalar(yeniHatalar); return false; }
    dinamikAlanlar.forEach(alan => {
      if (alan.zorunlu && !form.dinamikDegerler[alan.id]?.trim()) {
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
    setGönderiyor(true);
    setHata(null);
    try {
      const detaylar = dinamikAlanlar
        .map(alan => `${alan.label}: ${form.dinamikDegerler[alan.id] || '-'}`)
        .join('\n');
      const aciklama = detaylar ? `${secilenKategori.aciklama}\n\n${detaylar}` : secilenKategori.aciklama;

      const created = await sikayetService.createSikayet({
        targetType: 'user',
        sikayetEdilenId: userId,
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
    if (aktifAdim === 1 && !form.kategoriId) { setHatalar({ kategoriId: 'Bir tür seçin' }); return; }
    if (aktifAdim === 2) {
      const eksik = dinamikAlanlar.filter(a => a.zorunlu && !form.dinamikDegerler[a.id]?.trim());
      if (eksik.length > 0) { const h: FormHatalari = {}; eksik.forEach(a => { h[a.id] = `${a.label} zorunludur`; }); setHatalar(h); return; }
    }
    setAktifAdim(prev => Math.min(prev + 1, 3));
  };

  const renderAlan = (alan: DinamikFormAlani) => {
    const d = form.dinamikDegerler[alan.id] || '';
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

  if (basarili) {
    return (
      <div className="sikayet-form-container">
        <div className="sikayet-basarili">
          <div className="basarili-icon"><FontAwesomeIcon icon={faCheckCircle} /></div>
          <h1>Kullanıcı Şikayetiniz Alındı!</h1>
          <p className="basarili-metin">Şikayetiniz başarıyla kaydedildi. Kullanıcıyla ilgili değerlendirmemiz en kısa sürede yapılacak ve size geri dönüş sağlanacaktır.</p>
          <div className="sikayet-bilgileri">
            <div className="bilgi-kutusu"><span className="bilgi-etiketi">Şikayet No</span><span className="bilgi-deger">{sikayetId}</span></div>
            <div className="bilgi-kutusu"><span className="bilgi-etiketi">Tahmini Süre</span><span className="bilgi-deger">24-48 saat</span></div>
          </div>
          <div className="basarili-bilgilendirme"><FontAwesomeIcon icon={faInfoCircle} /><p>Takip için <strong>dashboard/sikayetlerim-taleplerim</strong> sayfasına gidin.</p></div>
          <div className="basarili-butonlar">
            <button onClick={() => router.push('/dashboard/sikayetlerim-taleplerim')} className="btn-takip"><FontAwesomeIcon icon={faListUl} /> Şikayetlerim</button>
            <button onClick={() => router.back()} className="btn-geri-don"><FontAwesomeIcon icon={faArrowLeft} /> Geri Dön</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sikayet-form-container">
      <div className="sikayet-form-header">
        <button onClick={() => router.back()} className="btn-geri"><FontAwesomeIcon icon={faArrowLeft} /></button>
        <div className="header-baslik"><FontAwesomeIcon icon={faFlag} /><h1>Kullanıcı Şikayeti</h1></div>
        <div className="header-bilgi"><FontAwesomeIcon icon={faShieldAlt} /><span>Gizli</span></div>
      </div>

      <div className="sikayet-form-adimlar">
        <div className={`adim ${aktifAdim >= 1 ? 'aktif' : ''} ${aktifAdim > 1 ? 'tamamlandi' : ''}`}><span className="adim-numarasi">1</span><span className="adim-adi">Tür</span></div>
        <div className={`adim-cizgi ${aktifAdim >= 2 ? 'aktif' : ''}`}></div>
        <div className={`adim ${aktifAdim >= 2 ? 'aktif' : ''} ${aktifAdim > 2 ? 'tamamlandi' : ''}`}><span className="adim-numarasi">2</span><span className="adim-adi">Detay</span></div>
        <div className={`adim-cizgi ${aktifAdim >= 3 ? 'aktif' : ''}`}></div>
        <div className={`adim ${aktifAdim >= 3 ? 'aktif' : ''}`}><span className="adim-numarasi">3</span><span className="adim-adi">Gönder</span></div>
      </div>

      {hata && <div className="sikayet-hata"><FontAwesomeIcon icon={faExclamationTriangle} /><span>{hata}</span><button onClick={() => setHata(null)}><FontAwesomeIcon icon={faTimes} /></button></div>}

      <div className="sikayet-form">
        {aktifAdim === 1 && (
          <div className="adim-icerik">
            <h2>Şikayet Türünü Seçin</h2>
            <p className="adim-aciklama">Kullanıcıyla ilgili sorunu belirleyin.</p>
            <div className="kategori-listesi">
              {kategoriler.map(k => (
                <button key={k.id} type="button" className={`kategori-secenek ${form.kategoriId === k.id ? 'secili' : ''}`} onClick={() => handleKategoriSelect(k.id)} style={{ '--kategori-renk': k.renk } as React.CSSProperties}>
                  <div className="kategori-ikon-kutu"><FontAwesomeIcon icon={faFlag} /></div>
                  <div className="kategori-metin"><span className="kategori-adi">{k.adi}</span><span className="kategori-aciklama">{k.aciklama}</span></div>
                  {form.kategoriId === k.id && <FontAwesomeIcon icon={faCheckCircle} className="secili-ikon" />}
                </button>
              ))}
            </div>
            {hatalar.kategoriId && <div className="hata-mesaji"><FontAwesomeIcon icon={faExclamationTriangle} />{hatalar.kategoriId}</div>}
          </div>
        )}

        {aktifAdim === 2 && secilenKategori && (
          <div className="adim-icerik">
            <h2>{secilenKategori.adi}</h2>
            <p className="adim-aciklama">Bilgileri doldurun.</p>
            <div className="dinamik-form">
              {dinamikAlanlar.map(alan => (
                <div key={alan.id} className="form-alani">
                  <label>{alan.label}{alan.zorunlu && <span className="zorunlu">*</span>}</label>
                  {renderAlan(alan)}
                  {hatalar[alan.id] && <div className="hata-mesaji"><FontAwesomeIcon icon={faExclamationTriangle} />{hatalar[alan.id]}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {aktifAdim === 3 && (
          <div className="adim-icerik">
            <h2>Özet ve Gönder</h2>
            <div className="ozet-kutusu">
              <div className="ozet-satir"><span className="ozet-etiket">Tür:</span><span className="ozet-deger">{secilenKategori?.adi}</span></div>
              {dinamikAlanlar.map(a => <div key={a.id} className="ozet-satir"><span className="ozet-etiket">{a.label}:</span><span className="ozet-deger">{form.dinamikDegerler[a.id] || '-'}</span></div>)}
            </div>
            <div className="uyari-kutusu"><FontAwesomeIcon icon={faShieldAlt} /><p>Şikayetiniz gizli tutulur. Yanlış şikayetler hesabınızın askıya alınmasına neden olabilir.</p></div>
          </div>
        )}

        <div className="form-butonlari">
          {aktifAdim > 1 ? <button type="button" onClick={() => setAktifAdim(p => p - 1)} className="btn-onceki"><FontAwesomeIcon icon={faArrowLeft} /> Geri</button> : <div />}
          {aktifAdim < 3 ? <button type="button" onClick={birSonrakiAdim} className="btn-sonraki">Devam <FontAwesomeIcon icon={faArrowRight} /></button> :
            <button type="button" onClick={handleSubmit} className="btn-gonder" disabled={gönderiyor}>{gönderiyor ? <><FontAwesomeIcon icon={faSpinner} spin /> Gönderiliyor...</> : <><FontAwesomeIcon icon={faFlag} /> Gönder</>}</button>}
        </div>
      </div>
    </div>
  );
};

export default KullaniciSikayetPage;