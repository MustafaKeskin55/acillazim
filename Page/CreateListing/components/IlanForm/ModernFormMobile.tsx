'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import './ModernFormMobile.css';
import createListingService from '@/services/createListing';
import * as locationService from '@/services/location/locationService';

interface FormImage {
  id: string;
  file?: File;
  url: string;
  name: string;
  size: number;
}

interface FormData {
  title: string;
  description: string;
  city: string;
  district: string;
  neighborhood: string;
  address: string;
  images: FormImage[];
  video_url: string;
  [key: string]: unknown;
}

interface CategoryField {
  id: number | string;
  label?: string;
  type?: string;
  db_field?: string | null;
  unit?: string | null;
  required?: boolean;
  options?: string[];
  priority?: boolean;
}

interface Province { id: number; name: string; }
interface District { id: number; name: string; provinceId: number; }
interface Neighborhood { id: string; name: string; districtId: number; }

interface Props { onSubmit?: () => void; }

const STEPS = [
  { id: 1, icon: '📝', label: 'Hizmet Bilgileri' },
  { id: 2, icon: '📍', label: 'Konum' },
  { id: 3, icon: '✨', label: 'Detay Özellikler' },
  { id: 4, icon: '📸', label: 'Fotoğraflar' },
];

const DEFAULT_FORM: FormData = {
  title: '',
  description: '',
  city: '',
  district: '',
  neighborhood: '',
  address: '',
  images: [],
  video_url: '',
};

const ModernFormMobile: React.FC<Props> = ({ onSubmit }) => {
  const router = useRouter();

  const [selectedCategory] = useState<{ id: string | number; name: string } | null>(() => {
    if (typeof window === 'undefined') return null;
    for (let i = 6; i >= 1; i--) {
      const id = sessionStorage.getItem(`level${i}_id`);
      const name = sessionStorage.getItem(`level${i}_name`);
      if (id && name) return { id, name };
    }
    return null;
  });

  const [step, setStep] = useState(1);
  const totalSteps = STEPS.length;

  const [formData, setFormData] = useState<FormData>(() => {
    if (typeof window === 'undefined') return DEFAULT_FORM;
    try {
      const s = sessionStorage.getItem('currentFormData');
      if (s) { const p = JSON.parse(s); return { ...DEFAULT_FORM, ...p, images: p.images || [] }; }
    } catch { /* */ }
    return DEFAULT_FORM;
  });

  const [catFields, setCatFields] = useState<CategoryField[]>([]);
  const [catLoading, setCatLoading] = useState(false);

  const [cities, setCities] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);

  const [totalSize, setTotalSize] = useState(0);
  const [imageError, setImageError] = useState('');
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('left');
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => { locationService.getProvinces().then(setCities).catch(() => {}); }, []);

  useEffect(() => {
    if (formData.city) {
      locationService.getDistricts(formData.city).then((d) => setDistricts(d as District[])).catch(() => setDistricts([]));
      setFormData((p) => ({ ...p, district: '', neighborhood: '' }));
    } else { setDistricts([]); setNeighborhoods([]); }
  }, [formData.city]);

  useEffect(() => {
    if (formData.district) {
      locationService.getNeighborhoods(formData.district).then((n) => setNeighborhoods(n as Neighborhood[])).catch(() => setNeighborhoods([]));
      setFormData((p) => ({ ...p, neighborhood: '' }));
    } else { setNeighborhoods([]); }
  }, [formData.district]);

  const loadCatFields = useCallback(async (catId: string | number) => {
    setCatLoading(true);
    try {
      const filters = await createListingService.getCategoryFilters(Number(catId));
      const { priority, more } = createListingService.groupFiltersByPriority(filters);
      const all = [...priority, ...more] as CategoryField[];
      const defaults = createListingService.createDefaultFormData(filters);
      setFormData((p) => ({ ...p, ...defaults }));
      setCatFields(all);
    } catch { /* */ } finally { setCatLoading(false); }
  }, []);

  useEffect(() => {
    if (selectedCategory?.id && step === 3) loadCatFields(selectedCategory.id);
  }, [selectedCategory, step, loadCatFields]);

  const save = (data: FormData) => { try { sessionStorage.setItem('currentFormData', JSON.stringify(data)); } catch { /* */ } };

  const set = (field: keyof FormData, value: unknown) => {
    const next = { ...formData, [field]: value } as FormData;
    setFormData(next); save(next);
    if (errors[field]) setErrors((p) => ({ ...p, [field]: '' }));
  };

  const fmtSize = (b: number) => (b / (1024 * 1024)).toFixed(1);

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setImageError('');
    if (formData.images.length + files.length > 10) { setImageError('En fazla 10 fotoğraf ekleyebilirsiniz'); return; }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/pjpeg'];
    let sz = totalSize;
    for (const f of files) {
      if (!f.type.startsWith('image/') || (!allowedTypes.includes(f.type) && !/\.(jpe?g|png|webp)$/i.test(f.name))) {
        setImageError('Sadece JPG, JPEG, PNG veya WEBP yükleyebilirsiniz');
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        setImageError('Her bir fotoğraf en fazla 5 MB olabilir');
        return;
      }
      sz += f.size;
    }
    const tempImgs: FormImage[] = files.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      file: f,
      url: URL.createObjectURL(f),
      name: f.name,
      size: f.size,
      uploading: true
    }));
    const next = { ...formData, images: [...formData.images, ...tempImgs] };
    setFormData(next); save(next); setTotalSize(sz);
    if (errors.images) setErrors((p) => ({ ...p, images: '' }));

    try {
      setIsUploadingImages(true);
      const uploaded = await createListingService.uploadImages(files);
      if (uploaded && uploaded.length > 0) {
        setFormData((current) => {
          const updated = current.images.map((img) => {
            const foundIdx = tempImgs.findIndex((t) => t.id === img.id);
            if (foundIdx !== -1 && uploaded[foundIdx]) {
              if (img.url?.startsWith('blob:')) URL.revokeObjectURL(img.url);
              return {
                ...img,
                url: uploaded[foundIdx].url,
                file: undefined,
                uploading: false
              };
            }
            return img;
          });
          const updatedData = { ...current, images: updated };
          save(updatedData);
          return updatedData;
        });
      }
    } catch (err) {
      console.error('Mobil fotoğraf yükleme hatası:', err);
      setImageError('Fotoğraflar sunucuya yüklenirken hata oluştu.');
    } finally {
      setIsUploadingImages(false);
    }
  };

  const removeImg = (id: string) => {
    const img = formData.images.find((x) => x.id === id);
    if (!img) return;
    setTotalSize((p) => p - img.size);
    if (img.url?.startsWith('blob:')) URL.revokeObjectURL(img.url);
    const next = { ...formData, images: formData.images.filter((x) => x.id !== id) };
    setFormData(next); save(next);
  };

  const moveToFirst = (idx: number) => {
    const arr = [...formData.images];
    const [item] = arr.splice(idx, 1);
    arr.unshift(item);
    const next = { ...formData, images: arr };
    setFormData(next); save(next);
  };

  const handleDragStart = (e: React.DragEvent, i: number) => { setDraggedIdx(i); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setDragOverIdx(i); };
  const handleDrop = (e: React.DragEvent, to: number) => {
    e.preventDefault();
    if (draggedIdx !== null && draggedIdx !== to) {
      const arr = [...formData.images];
      const [m] = arr.splice(draggedIdx, 1);
      arr.splice(to, 0, m);
      const next = { ...formData, images: arr };
      setFormData(next); save(next);
    }
    setDraggedIdx(null); setDragOverIdx(null);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (step === 1) {
      if (!formData.title.trim()) e.title = 'Hizmet başlığı zorunludur';
      else if (formData.title.trim().length < 5) e.title = 'En az 5 karakter olmalı';
      else if (formData.title.trim().length > 70) e.title = 'En fazla 70 karakter olabilir';
    }
    if (step === 2) {
      if (!formData.city) e.city = 'İl seçin';
      if (!formData.district) e.district = 'İlçe seçin';
    }
    if (step === 3) {
      catFields.forEach((f) => {
        if (f.required && f.db_field) {
          const v = formData[f.db_field];
          if (!v || (typeof v === 'string' && !v.trim())) e[f.db_field] = `${f.label} zorunludur`;
        }
      });
    }
    if (step === 4) {
      if (formData.images.length === 0) e.images = 'En az 1 fotoğraf ekleyin';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goTo = (next: number) => {
    if (!validate()) return;
    setSlideDir(next > step ? 'left' : 'right');
    setAnimKey((k) => k + 1);
    setStep(next);
  };

  const handleBack = () => {
    if (step === 1) { router.push('/kategori-sec'); return; }
    setSlideDir('right'); setAnimKey((k) => k + 1); setStep((p) => p - 1); setErrors({});
  };

  const handleFinish = () => {
    if (!validate()) return;
    const cityName = sessionStorage.getItem('selectedCity') || formData.city;
    const districtName = sessionStorage.getItem('selectedDistrict') || formData.district;
    const neighborhoodName = sessionStorage.getItem('selectedNeighborhood') || formData.neighborhood;
    const rootCatId = sessionStorage.getItem('level1_id');
    const rootCatName = sessionStorage.getItem('level1_name');
    const rootCategory = rootCatId ? { id: rootCatId, name: rootCatName || '' } : null;
    const submitData = {
      ...formData,
      category: selectedCategory,
      categoryId: selectedCategory?.id,
      category_id: selectedCategory?.id,
      rootCategory,
      il: cityName,
      ilce: districtName,
      mahalle: neighborhoodName,
      locationCity: cityName,
      locationDistrict: districtName,
      city: cityName, district: districtName, neighborhood: neighborhoodName,
      images: formData.images
        .filter((img) => img.url && !img.url.startsWith('blob:'))
        .map((img) => ({ id: img.id, url: img.url, name: img.name, size: img.size })),
    };
    sessionStorage.setItem('listingFormData', JSON.stringify(submitData));
    sessionStorage.setItem('returningFromPreview', 'true');
    onSubmit?.();
    router.push('/ilan-ver/onizleme');
  };

  const renderStep1 = () => (
    <div className="mfm-step-body">
      <div className="mfm-field">
        <label className="mfm-label">Hizmet Başlığı <span className="mfm-req">*</span></label>
        <input type="text" value={formData.title} onChange={(e) => set('title', e.target.value)} placeholder="Örn: Eskişehir Düğün Fotoğrafçısı" className={`mfm-input${errors.title ? ' mfm-input--err' : ''}`} maxLength={70} />
        <div className="mfm-char-count"><span className={formData.title.length > 70 ? 'mfm-char-over' : ''}>{formData.title.length}/70</span></div>
        {errors.title && <span className="mfm-err">{errors.title}</span>}
      </div>

      <div className="mfm-field">
        <label className="mfm-label">Hizmet Açıklaması <span className="mfm-req">*</span></label>
        <textarea value={formData.description} onChange={(e) => set('description', e.target.value)} placeholder="Hizmetinizi detaylı açıklayın (sunduğunuz hizmetler, tecrübeniz...)" className="mfm-textarea" rows={5} maxLength={800} />
        <div className="mfm-char-count"><span>{(formData.description || '').length}/800</span></div>
      </div>

    </div>
  );

  const renderStep2 = () => (
    <div className="mfm-step-body">
      <div className="mfm-field">
        <label className="mfm-label">İl <span className="mfm-req">*</span></label>
        <div className={`mfm-select-wrap${errors.city ? ' mfm-select-wrap--err' : ''}`}>
          <select value={formData.city} onChange={(e) => { const c = cities.find((x) => String(x.id) === e.target.value); if (c) sessionStorage.setItem('selectedCity', c.name); const next = { ...formData, city: e.target.value, district: '', neighborhood: '' }; setFormData(next); save(next); if (errors.city) setErrors((p) => ({ ...p, city: '' })); }} className="mfm-select">
            <option value="">İl seçin</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <svg className="mfm-select-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </div>
        {errors.city && <span className="mfm-err">{errors.city}</span>}
      </div>

      <div className="mfm-field">
        <label className="mfm-label">İlçe <span className="mfm-req">*</span></label>
        <div className={`mfm-select-wrap${errors.district ? ' mfm-select-wrap--err' : ''}${!formData.city ? ' mfm-select-wrap--disabled' : ''}`}>
          <select value={formData.district} onChange={(e) => { const d = districts.find((x) => String(x.id) === e.target.value); if (d) sessionStorage.setItem('selectedDistrict', d.name); const next = { ...formData, district: e.target.value, neighborhood: '' }; setFormData(next); save(next); if (errors.district) setErrors((p) => ({ ...p, district: '' })); }} className="mfm-select" disabled={!formData.city}>
            <option value="">İlçe seçin</option>
            {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <svg className="mfm-select-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </div>
        {errors.district && <span className="mfm-err">{errors.district}</span>}
      </div>

      <div className="mfm-field">
        <label className="mfm-label">Mahalle <span className="mfm-opt">(opsiyonel)</span></label>
        <div className={`mfm-select-wrap${!formData.district ? ' mfm-select-wrap--disabled' : ''}`}>
          <select value={formData.neighborhood} onChange={(e) => { const n = neighborhoods.find((x) => x.id === e.target.value); if (n) sessionStorage.setItem('selectedNeighborhood', n.name); const next = { ...formData, neighborhood: e.target.value }; setFormData(next); save(next); }} className="mfm-select" disabled={!formData.district}>
            <option value="">Mahalle seçin</option>
            {neighborhoods.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
          <svg className="mfm-select-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </div>
      </div>

      <div className="mfm-field">
        <label className="mfm-label">Hizmet Adresi <span className="mfm-opt">(opsiyonel)</span></label>
        <textarea value={formData.address} onChange={(e) => set('address', e.target.value)} placeholder="Hizmet verdiğiniz adresi yazın" className="mfm-textarea" rows={3} />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="mfm-step-body">
      {catLoading ? (
        <div className="mfm-cat-loading"><div className="mfm-spinner" /><p>Özellikler yükleniyor...</p></div>
      ) : catFields.length === 0 ? (
        <div className="mfm-cat-empty"><span>✅</span><p>Bu hizmet kategorisi için ek özellik yok.</p><p className="mfm-cat-empty-sub">Devam ederek önizlemeye geçebilirsiniz.</p></div>
      ) : (
        <>
          <p className="mfm-cat-title">{selectedCategory?.name} için özellikler</p>
          {catFields.map((f) => {
            if (!f.db_field) return null;
            return (
              <div key={f.id} className="mfm-field">
                <label className="mfm-label">{f.label}{f.required && <span className="mfm-req"> *</span>}</label>
                {f.type === 'multi-select' && (
                  <div className={`mfm-select-wrap${errors[f.db_field] ? ' mfm-select-wrap--err' : ''}`}>
                    <select value={String(formData[f.db_field] ?? '')} onChange={(e) => { const next = { ...formData, [f.db_field!]: e.target.value }; setFormData(next); save(next); if (errors[f.db_field!]) setErrors((p) => ({ ...p, [f.db_field!]: '' })); }} className="mfm-select">
                      <option value="">Seçiniz</option>
                      {f.options?.map((o, i) => <option key={i} value={o}>{o}</option>)}
                    </select>
                    <svg className="mfm-select-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </div>
                )}
                {f.type === 'checkbox' && (
                  <div className="mfm-chip-wrap">
                    {f.options?.map((o, i) => (
                      <button key={i} type="button" className={`mfm-chip${formData[f.db_field!] === o ? ' mfm-chip--active' : ''}`} onClick={() => { const cur = formData[f.db_field!]; const next = { ...formData, [f.db_field!]: cur === o ? '' : o }; setFormData(next); save(next); }}>{o}</button>
                    ))}
                  </div>
                )}
                {f.type === 'range' && (
                  <div className="mfm-range-row">
                    <input type="text" value={String(formData[`${f.db_field}_min`] ?? '')} onChange={(e) => { const next = { ...formData, [`${f.db_field}_min`]: e.target.value }; setFormData(next); save(next); }} placeholder="Min" className="mfm-input" inputMode="numeric" />
                    <span className="mfm-range-sep">—</span>
                    <input type="text" value={String(formData[`${f.db_field}_max`] ?? '')} onChange={(e) => { const next = { ...formData, [`${f.db_field}_max`]: e.target.value }; setFormData(next); save(next); }} placeholder="Max" className="mfm-input" inputMode="numeric" />
                    {f.unit && <span className="mfm-range-unit">{f.unit}</span>}
                  </div>
                )}
                {f.db_field && errors[f.db_field] && (<span className="mfm-err">{errors[f.db_field]}</span>)}
              </div>
            );
          })}
        </>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="mfm-step-body">
      {formData.images.length === 0 ? (
        <label className="mfm-upload-hero">
          <input type="file" accept="image/*" multiple onChange={handleImagePick} />
          <div className="mfm-upload-hero-inner">
            <div className="mfm-upload-hero-icon">📷</div>
            <p className="mfm-upload-hero-title">Fotoğraf Ekle</p>
            <p className="mfm-upload-hero-sub">En fazla 10 fotoğraf · Maks. 5 MB / dosya</p>
          </div>
        </label>
      ) : (
        <>
          <div className="mfm-photo-grid">
            {formData.images.map((img, idx) => (
              <div key={img.id} className={`mfm-photo-cell${idx === 0 ? ' mfm-photo-cell--main' : ''}${draggedIdx === idx ? ' mfm-photo-cell--dragging' : ''}${dragOverIdx === idx ? ' mfm-photo-cell--over' : ''}`} draggable onDragStart={(e) => handleDragStart(e, idx)} onDragOver={(e) => handleDragOver(e, idx)} onDrop={(e) => handleDrop(e, idx)} onDragEnd={() => { setDraggedIdx(null); setDragOverIdx(null); }}>
                <img src={img.url} alt={img.name} className="mfm-photo-img" />
                {idx === 0 && <span className="mfm-photo-badge">Kapak</span>}
                <div className="mfm-photo-overlay">
                  <button type="button" className="mfm-photo-del" onClick={() => removeImg(img.id)}><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg></button>
                  {idx > 0 && (<button type="button" className="mfm-photo-cover" onClick={() => moveToFirst(idx)} title="Kapak yap"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" fill="#fff"/></svg></button>)}
                </div>
                <span className="mfm-photo-num">{idx + 1}</span>
              </div>
            ))}
            {formData.images.length < 20 && (
              <label className="mfm-photo-add">
                <input type="file" accept="image/*" multiple onChange={handleImagePick} />
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round"/></svg>
                <span>Ekle</span>
              </label>
            )}
          </div>
          <div className="mfm-photo-stats"><span>📸 {formData.images.length}/10</span><span>💾 Maks. 5 MB / dosya</span></div>
          <p className="mfm-photo-hint">İlk fotoğraf kapak resmi olacak · Sürükleyerek sıralayabilirsiniz</p>
        </>
      )}
      {(errors.images || imageError) && (<div className="mfm-err">{errors.images || imageError}</div>)}
    </div>
  );

  const stepContent = [renderStep1, renderStep2, renderStep3, renderStep4];

  return (
    <div className="mfm-root">
      <div className="mfm-topbar">
        <button type="button" className="mfm-back-btn" onClick={handleBack}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15l-5-5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div className="mfm-topbar-center">
          <span className="mfm-step-label">{STEPS[step - 1]?.label}</span>
          <span className="mfm-step-counter">{step}/{totalSteps}</span>
        </div>
        {step < totalSteps ? (
          <button type="button" className="mfm-topbar-next" onClick={() => goTo(step + 1)}>
            Devam
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        ) : (
          <button type="button" className="mfm-topbar-next mfm-topbar-next--finish" onClick={handleFinish}>
            Önizleme Yap
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        )}
      </div>
      <div className="mfm-progress"><div className="mfm-progress-fill" style={{ width: `${(step / totalSteps) * 100}%` }} /></div>
      <div key={animKey} className={`mfm-content mfm-slide-${slideDir}`}>
        <h2 className="mfm-step-title">{STEPS[step - 1]?.icon} {STEPS[step - 1]?.label}</h2>
        {stepContent[step - 1]?.()}
      </div>
    </div>
  );
};

export default ModernFormMobile;