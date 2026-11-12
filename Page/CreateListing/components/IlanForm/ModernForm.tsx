'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import './ModernForm.css';
import createListingService from '@/services/createListing';
import RichTextEditor from './RichTextEditor';
import { useAuth } from '@/context/AuthContext';
import * as locationService from '@/services/location/locationService';
import ModernFormMobile from './ModernFormMobile';
import ServiceListingForm from './ServiceListingForm';

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

interface FormImage {
  id: string;
  file?: File;
  url: string;
  name: string;
  size: number;
  uploading?: boolean;
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

interface ModernFormProps { onSubmit?: () => void; }

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

const ModernForm: React.FC<ModernFormProps> = ({ onSubmit }) => {
  const [isHizmet, setIsHizmet] = useState<boolean | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const mainCatId = sessionStorage.getItem('selectedMainCategoryId');
    if (mainCatId === '12540') {
      setIsHizmet(true);
      return;
    }

    for (let i = 6; i >= 1; i--) {
      const id = sessionStorage.getItem(`level${i}_id`);
      if (id === '12540') {
        setIsHizmet(true);
        return;
      }
    }

    setIsHizmet(false);
  }, []);

  if (isHizmet === null) return null;
  if (isHizmet) return <ServiceListingForm onSubmit={onSubmit} />;

  return isMobile
    ? <ModernFormMobile onSubmit={onSubmit} />
    : <ModernFormDesktop onSubmit={onSubmit} />;
};

const ModernFormDesktop: React.FC<ModernFormProps> = ({ onSubmit }) => {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);

  const [selectedCategory] = useState<{ id: string | number; name: string } | null>(() => {
    if (typeof window === 'undefined') return null;
    for (let i = 6; i >= 1; i--) {
      const id = sessionStorage.getItem(`level${i}_id`);
      const name = sessionStorage.getItem(`level${i}_name`);
      if (id && name) return { id, name };
    }
    return null;
  });

  const [formData, setFormData] = useState<FormData>(() => {
    if (typeof window === 'undefined') return DEFAULT_FORM;
    try {
      const saved = sessionStorage.getItem('currentFormData');
      if (saved) {
        const p = JSON.parse(saved);
        return {
          title: p.title || '',
          description: p.description || '',
          city: p.city || '',
          district: p.district || '',
          neighborhood: p.neighborhood || '',
          address: p.address || '',
          images: p.images || [],
          video_url: p.video_url || '',
          ...Object.keys(p).reduce((acc: Record<string, unknown>, k) => {
            if (k.startsWith('category_')) acc[k] = p[k];
            return acc;
          }, {}),
        };
      }
    } catch { /* ignore */ }
    return DEFAULT_FORM;
  });

  const [categoryFields, setCategoryFields] = useState<{ default: CategoryField[] }>({ default: [] });
  const [loadingFields, setLoadingFields] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [totalSize, setTotalSize] = useState(0);

  const [cities, setCities] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => { locationService.getProvinces().then(setCities).catch(() => setCities([])); }, []);

  useEffect(() => {
    if (formData.city) {
      locationService.getDistricts(formData.city).then((d) => setDistricts(d as District[])).catch(() => setDistricts([]));
    } else { setDistricts([]); setNeighborhoods([]); }
  }, [formData.city]);

  useEffect(() => {
    if (formData.district) {
      locationService.getNeighborhoods(formData.district).then((n) => setNeighborhoods(n as Neighborhood[])).catch(() => setNeighborhoods([]));
    } else { setNeighborhoods([]); }
  }, [formData.district]);

  const loadCategoryFields = useCallback(async (categoryId: string | number) => {
    setLoadingFields(true);
    try {
      const filters = await createListingService.getCategoryFilters(Number(categoryId));
      const { priority, more } = createListingService.groupFiltersByPriority(filters);
      const sorted = [...priority, ...more] as CategoryField[];
      const defaults = createListingService.createDefaultFormData(filters);
      const saved = sessionStorage.getItem('currentFormData');
      let existing: Record<string, unknown> = {};
      if (saved) {
        const p = JSON.parse(saved);
        existing = Object.keys(p).reduce((acc: Record<string, unknown>, k) => {
          if (k.startsWith('category_')) acc[k] = p[k];
          return acc;
        }, {});
      }
      setFormData((prev) => ({ ...prev, ...defaults, ...existing }));
      const labels: Record<string, string> = {};
      sorted.forEach((f) => { if (f.db_field) labels[f.db_field] = f.label || f.db_field; });
      sessionStorage.setItem('categoryFieldLabels', JSON.stringify(labels));
      setCategoryFields({ default: sorted });
    } catch { /* ignore */ } finally { setLoadingFields(false); }
  }, []);

  useEffect(() => { if (selectedCategory?.id) loadCategoryFields(selectedCategory.id); }, [selectedCategory, loadCategoryFields]);

  useEffect(() => {
    sessionStorage.setItem('progress-v1', currentStep.toString());
  }, [currentStep]);

  const saveFormData = (data: FormData) => { try { sessionStorage.setItem('currentFormData', JSON.stringify(data)); } catch { /* ignore */ } };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const newData = { ...formData, [name]: value } as FormData;
    setFormData(newData);
    saveFormData(newData);
    if (name === 'city' && value) {
      const c = cities.find((x) => String(x.id) === String(value));
      if (c) sessionStorage.setItem('selectedCity', c.name);
      setFormData((prev) => ({ ...prev, district: '', neighborhood: '' }));
    }
    if (name === 'district' && value) {
      const d = districts.find((x) => String(x.id) === String(value));
      if (d) sessionStorage.setItem('selectedDistrict', d.name);
      setFormData((prev) => ({ ...prev, neighborhood: '' }));
    }
    if (name === 'neighborhood' && value) {
      const n = neighborhoods.find((x) => String(x.id) === String(value));
      if (n) sessionStorage.setItem('selectedNeighborhood', n.name);
    }
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleCategoryFieldChange = (fieldName: string, value: unknown) => {
    const newData = { ...formData, [fieldName]: value };
    setFormData(newData);
    saveFormData(newData);
    if (errors[fieldName]) setErrors((prev) => ({ ...prev, [fieldName]: '' }));
  };

  const formatFileSize = (bytes: number) => (bytes / (1024 * 1024)).toFixed(2);

  const [isUploadingImages, setIsUploadingImages] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (formData.images.length + files.length > 10) {
      setErrors((prev) => ({ ...prev, images: 'En fazla 10 fotoğraf yükleyebilirsiniz' }));
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/pjpeg'];
    for (const file of files) {
      if (!file.type.startsWith('image/') || (!allowedTypes.includes(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name))) {
        setErrors((prev) => ({ ...prev, images: 'Sadece JPG, JPEG, PNG veya WEBP formatında görsel yükleyebilirsiniz' }));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, images: `"${file.name}" boyutu 5 MB\'tan büyük olamaz (Maks. 5 MB/dosya)` }));
        return;
      }
    }
    const tempImgs: FormImage[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      uploading: true
    }));
    setErrors((prev) => ({ ...prev, images: '' }));
    const addedTotal = files.reduce((acc, f) => acc + f.size, 0);
    const newData = { ...formData, images: [...formData.images, ...tempImgs] };
    setFormData(newData);
    saveFormData(newData);
    setTotalSize((prev) => prev + addedTotal);

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
          const res = { ...current, images: updated };
          saveFormData(res);
          return res;
        });
      }
    } catch (err) {
      console.error('Fotoğraf yükleme hatası:', err);
      setErrors((prev) => ({ ...prev, images: 'Fotoğraflar sunucuya yüklenirken hata oluştu. Lütfen tekrar deneyin.' }));
      setFormData((current) => {
        const tempIds = new Set(tempImgs.map((t) => t.id));
        tempImgs.forEach((t) => { if (t.url?.startsWith('blob:')) URL.revokeObjectURL(t.url); });
        const filtered = current.images.filter((img) => !tempIds.has(img.id));
        const res = { ...current, images: filtered };
        saveFormData(res);
        return res;
      });
      setTotalSize((prev) => Math.max(0, prev - addedTotal));
    } finally {
      setIsUploadingImages(false);
    }
  };

  const removeImage = (id: string) => {
    const img = formData.images.find((x) => x.id === id);
    if (img) {
      setTotalSize((prev) => prev - (img.size || 0));
      if (img.url?.startsWith('blob:')) URL.revokeObjectURL(img.url);
      const newData = { ...formData, images: formData.images.filter((x) => x.id !== id) };
      setFormData(newData);
      saveFormData(newData);
    }
  };

  const moveImage = (from: number, to: number) => {
    const arr = [...formData.images];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    const newData = { ...formData, images: arr };
    setFormData(newData);
    saveFormData(newData);
  };

  const handleDragStart = (e: React.DragEvent, i: number) => { setDraggedIndex(i); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setDragOverIndex(i); };
  const handleDragLeave = () => setDragOverIndex(null);
  const handleDrop = (e: React.DragEvent, to: number) => { e.preventDefault(); if (draggedIndex !== null && draggedIndex !== to) moveImage(draggedIndex, to); setDraggedIndex(null); setDragOverIndex(null); };
  const handleDragEnd = () => { setDraggedIndex(null); setDragOverIndex(null); };

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!formData.title.trim()) errs.title = 'Hizmet başlığı zorunludur';
    else if (formData.title.trim().length < 5) errs.title = 'Başlık en az 5 karakter olmalıdır';
    else if (formData.title.trim().length > 70) errs.title = 'Başlık en fazla 70 karakter olabilir';
    if (!formData.description.trim()) errs.description = 'Açıklama zorunludur';
    else {
      const tmp = document.createElement('div');
      tmp.innerHTML = formData.description;
      const text = tmp.textContent || tmp.innerText || '';
      if (text.length < 20) errs.description = 'Açıklama en az 20 karakter olmalıdır';
      else if (text.length > 800) errs.description = 'Açıklama en fazla 800 karakter olabilir';
    }
    if (!formData.city) errs.city = 'İl seçimi zorunludur';
    if (!formData.district && formData.city) errs.district = 'İlçe seçimi zorunludur';
    if (formData.images.length === 0) errs.images = 'En az 1 fotoğraf yüklemeniz gerekiyor';
    else if (isUploadingImages) errs.images = 'Fotoğraflar sunucuya yükleniyor, lütfen bekleyin...';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    categoryFields.default.forEach((f) => {
      if (f.required && f.db_field) {
        const v = formData[f.db_field];
        if (!v || (typeof v === 'string' && !v.trim())) errs[f.db_field] = `${f.label} zorunludur`;
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
      if (selectedCategory?.id && categoryFields.default.length === 0) loadCategoryFields(selectedCategory.id);
    }
  };

  const handlePrevStep = () => { if (currentStep === 2) { setCurrentStep(1); setErrors({}); } };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep === 1) { handleNextStep(); return; }
    if (currentStep === 2) {
      if (!validateStep2()) return;
      const cityName = sessionStorage.getItem('selectedCity') || formData.city;
      const districtName = sessionStorage.getItem('selectedDistrict') || formData.district;
      const neighborhoodName = sessionStorage.getItem('selectedNeighborhood') || formData.neighborhood;
      const rootCatId = sessionStorage.getItem('level1_id');
      const rootCatName = sessionStorage.getItem('level1_name');
      const rootCategory = rootCatId ? { id: rootCatId, name: rootCatName || '' } : null;
      const validImages = formData.images
        .filter((img) => img.url && !img.url.startsWith('blob:'))
        .map((img) => ({ id: img.id, url: img.url, name: img.name, size: img.size }));
      const submitData = {
        ...formData,
        category: selectedCategory,
        categoryId: selectedCategory?.id,
        category_id: selectedCategory?.id,
        rootCategory,
        city: cityName,
        district: districtName,
        neighborhood: neighborhoodName,
        il: cityName,
        ilce: districtName,
        mahalle: neighborhoodName,
        locationCity: cityName,
        locationDistrict: districtName,
        images: validImages,
        photos: validImages,
        imageUrls: validImages.map((img) => img.url),
      };
      sessionStorage.setItem('listingFormData', JSON.stringify(submitData));
      sessionStorage.setItem('returningFromPreview', 'true');
      onSubmit?.();
      router.push('/ilan-ver/onizleme');
    }
  };

  if (!selectedCategory) {
    return (<div className="mf-container"><div className="mf-error-message">Lütfen önce kategori seçimi yapınız.</div></div>);
  }

  return (
    <div className="mf-container">
      <div className="mf-mobile-steps">
        <div className={`mf-mobile-step-item ${currentStep === 1 ? 'active' : ''} ${currentStep > 1 ? 'done' : ''}`}>
          <div className="mf-mobile-step-dot">{currentStep > 1 ? '✓' : '1'}</div>
          <span>Hizmet Bilgileri</span>
        </div>
        <div className="mf-mobile-step-line" />
        <div className={`mf-mobile-step-item ${currentStep === 2 ? 'active' : ''}`}>
          <div className="mf-mobile-step-dot">2</div>
          <span>Detay Özellikler</span>
        </div>
      </div>

      <div className="mf-header">
        <h1 className="mf-title">{currentStep === 1 ? 'Hizmet Bilgileri' : 'Detay Özellikler'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="mf-form">
        {currentStep === 1 && (
          <div className="mf-section">
            <div className="mf-group">
              <label htmlFor="title" className="mf-label">
                Hizmet Başlığı <span className="mf-required">*</span>
              </label>
              <input type="text" id="title" name="title" value={formData.title} onChange={handleInputChange} placeholder="Örn: Eskişehir Düğün Fotoğrafçısı" className={`mf-input ${errors.title ? 'error' : ''}`} maxLength={70} />
              <div className="mf-title-counter"><span className={`mf-counter-text ${formData.title.length > 70 ? 'mf-counter-over' : ''}`}>{formData.title.length}/70</span></div>
              {errors.title && <div className="mf-error">{errors.title}</div>}
            </div>

            <div className="mf-group">
              <label className="mf-label">Hizmet Açıklaması <span className="mf-required">*</span></label>
              <RichTextEditor id="description" value={formData.description} onChange={(content: string) => { const newData = { ...formData, description: content }; setFormData(newData); saveFormData(newData); if (errors.description) setErrors((prev) => ({ ...prev, description: '' })); }} placeholder="Hizmetinizi detaylı olarak açıklayın..." error={!!errors.description} className="mf-rich-editor" maxLength={800} />
              {errors.description && <div className="mf-error">{errors.description}</div>}
            </div>



            <div className="mf-row">
              <div className="mf-group">
                <label htmlFor="city" className="mf-label">İl <span className="mf-required">*</span></label>
                <select id="city" name="city" value={formData.city} onChange={handleInputChange} className={`mf-select ${errors.city ? 'error' : ''}`}>
                  <option value="">İl Seçin</option>
                  {cities.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
                {errors.city && <div className="mf-error">{errors.city}</div>}
              </div>
              <div className="mf-group">
                <label htmlFor="district" className="mf-label">İlçe <span className="mf-required">*</span></label>
                <select id="district" name="district" value={formData.district} onChange={handleInputChange} className={`mf-select ${errors.district ? 'error' : ''}`} disabled={!formData.city}>
                  <option value="">İlçe Seçin</option>
                  {districts.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                </select>
                {errors.district && <div className="mf-error">{errors.district}</div>}
              </div>
            </div>

            <div className="mf-row">
              <div className="mf-group">
                <label htmlFor="neighborhood" className="mf-label">Mahalle</label>
                <select id="neighborhood" name="neighborhood" value={formData.neighborhood} onChange={handleInputChange} className="mf-select" disabled={!formData.district}>
                  <option value="">Mahalle Seçin</option>
                  {neighborhoods.map((n) => (<option key={n.id} value={n.id}>{n.name}</option>))}
                </select>
              </div>
            </div>

            <div className="mf-group">
              <label htmlFor="address" className="mf-label">Açık Adres</label>
              <textarea id="address" name="address" value={formData.address} onChange={handleInputChange} placeholder="Hizmet verdiğiniz adresi yazın" rows={3} className="mf-textarea" />
            </div>

            <div className="mf-group">
              <label className="mf-label">Hizmet Fotoğrafları <span className="mf-required">*</span></label>
              <div className="mf-image-grid">
                {formData.images.map((img, idx) => (
                  <div key={img.id} className={`mf-image-item${draggedIndex === idx ? ' dragging' : ''}${dragOverIndex === idx ? ' drag-over' : ''}`} draggable onDragStart={(e) => handleDragStart(e, idx)} onDragOver={(e) => handleDragOver(e, idx)} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, idx)} onDragEnd={handleDragEnd}>
                    <img src={img.url} alt={img.name} />
                    {idx === 0 && <div className="mf-vitrin-badge">Kapak</div>}
                    <button type="button" className="mf-image-remove" onClick={() => removeImage(img.id)}>✕</button>
                    {idx > 0 && (<button type="button" className="mf-image-up" onClick={() => moveImage(idx, 0)} title="Kapak resmi yap">↑</button>)}
                    <div className="mf-image-order">{idx + 1}</div>
                  </div>
                ))}
                {formData.images.length < 10 && (
                  <label className="mf-image-upload">
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageUpload} disabled={isUploadingImages} />
                    <div className="mf-upload-text">
                      <span>{isUploadingImages ? '⏳' : '+'}</span>
                      <span>{isUploadingImages ? 'Yükleniyor...' : 'Fotoğraf Ekle'}</span>
                      <div className="mf-upload-stats">
                        <div className="mf-stat">📸 {formData.images.length}/10</div>
                        <div className="mf-stat">💾 Maks. 5 MB / dosya</div>
                      </div>
                    </div>
                  </label>
                )}
              </div>
              {errors.images && <div className="mf-error">{errors.images}</div>}
              {formData.images.length > 0 && (<div className="mf-hint">İlk resim kapak fotoğrafı olacaktır. Sürükleyerek sıralayabilirsiniz.</div>)}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="mf-section">
            {categoryFields.default.length > 0 ? (
              <>
                <h2 className="mf-section-title">{selectedCategory?.name ? `${selectedCategory.name} Özellikleri` : 'Hizmet Detayları'}</h2>
                {loadingFields ? (
                  <div className="mf-loading">Özellikler yükleniyor...</div>
                ) : (
                  <div className="mf-category-fields">
                    {categoryFields.default.sort((a, b) => Number(a.id) - Number(b.id)).map((field) => (
                      <div key={field.id} className="mf-field-group">
                        {field.type === 'checkbox' ? (
                          <>
                            <label className="mf-label">{field.label}{field.required && <span className="mf-required">*</span>}</label>
                            <div className="mf-checkbox-options">
                              {field.options?.map((opt, i) => (
                                <div key={i} className={`mf-checkbox-group ${formData[field.db_field!] === opt ? 'selected' : ''}`} onClick={() => handleCategoryFieldChange(field.db_field!, formData[field.db_field!] === opt ? '' : opt)}>
                                  <input type="checkbox" id={`${field.db_field}_${i}`} checked={formData[field.db_field!] === opt} onChange={() => { }} className="mf-checkbox" />
                                  <label className="mf-checkbox-label">{opt}</label>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : field.type === 'multi-select' ? (
                          <>
                            <label htmlFor={field.db_field!} className="mf-label">{field.label}{field.required && <span className="mf-required">*</span>}</label>
                            <select id={field.db_field!} value={String(formData[field.db_field!] ?? '')} onChange={(e) => handleCategoryFieldChange(field.db_field!, e.target.value)} className={`mf-select ${errors[field.db_field!] ? 'error' : ''}`}>
                              <option value="">Seçiniz</option>
                              {field.options?.map((opt, i) => (<option key={i} value={opt}>{opt}</option>))}
                            </select>
                          </>
                        ) : field.type === 'range' ? (
                          <>
                            <label className="mf-label">{field.label}{field.required && <span className="mf-required">*</span>}</label>
                            <div className="mf-range-group">
                              <input type="text" value={String(formData[`${field.db_field}_min`] ?? '')} onChange={(e) => handleCategoryFieldChange(`${field.db_field}_min`, e.target.value)} placeholder="Min" className="mf-input" />
                              <span className="mf-range-separator">-</span>
                              <input type="text" value={String(formData[`${field.db_field}_max`] ?? '')} onChange={(e) => handleCategoryFieldChange(`${field.db_field}_max`, e.target.value)} placeholder="Max" className="mf-input" />
                              {field.unit && <span className="mf-range-unit">{field.unit}</span>}
                            </div>
                          </>
                        ) : null}
                        {field.db_field && errors[field.db_field] && (<div className="mf-error">{errors[field.db_field]}</div>)}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="mf-no-fields">Bu hizmet kategorisi için ek özellik bulunmamaktadır. Önizlemeye geçebilirsiniz.</div>
            )}
          </div>
        )}

        <div className="mf-actions">
          {currentStep === 1 && (<button type="button" className="mf-submit" onClick={handleNextStep} disabled={isUploadingImages}>{isUploadingImages ? 'Fotoğraflar Yükleniyor...' : 'İleri →'}</button>)}
          {currentStep === 2 && (
            <>
              <button type="button" className="mf-back" onClick={handlePrevStep}>← Geri</button>
              <button type="submit" className="mf-submit" disabled={isUploadingImages}>{isUploadingImages ? 'Lütfen Bekleyin...' : 'Önizlemeye Git →'}</button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default ModernForm;