'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import './ServiceListingFormMobile.css';
import createListingService from '@/services/createListing';
import RichTextEditor from './RichTextEditor';
import * as locationService from '@/services/location/locationService';
import { useAuth } from '@/context/AuthContext';
import {
  getServiceFieldsForCategory,
  getFeatureOptionsForCategory,
  type ServiceFieldConfig
} from '@/utils/serviceFilterHelper';

interface FormImage {
  id: string;
  file?: File;
  url: string;
  name: string;
  size: number;
}

interface PricingPackage {
  id: string;
  package_title: string;
  description: string;
  price: string;
  currency: string;
  price_type: 'per_package' | 'one_time' | 'per_month' | 'per_hour' | 'per_day';
  delivery_days: string;
  features: string[];
  is_popular: boolean;
  discount_percentage: string;
}

interface WorkingHoursDay {
  start: string;
  end: string;
  is_active: boolean;
  break_start: string;
  break_end: string;
}

interface WorkingHours {
  monday: WorkingHoursDay;
  tuesday: WorkingHoursDay;
  wednesday: WorkingHoursDay;
  thursday: WorkingHoursDay;
  friday: WorkingHoursDay;
  saturday: WorkingHoursDay;
  sunday: WorkingHoursDay;
  special_notes: string;
}

interface ServiceFormData {
  title: string;
  description: string;
  pricing_packages: PricingPackage[];
  working_hours: WorkingHours;
  city: string;
  district: string;
  neighborhood: string;
  address: string;
  images: FormImage[];
  portfolio_images: FormImage[];
  service_areas: string[];
  certificates: { name: string; title: string; date: string }[];
  faq_items: { question: string; answer: string }[];
  service_features: string[];
  about_text: string;
  quick_action_prefs: { whatsapp: boolean; message: boolean; phone: boolean; appointment: boolean };
  response_rate: string;
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

const DAY_LABELS: Record<string, string> = {
  monday: 'Pzt', tuesday: 'Sal', wednesday: 'Çar', thursday: 'Per', friday: 'Cum', saturday: 'Cmt', sunday: 'Paz',
};

const DAY_LABELS_FULL: Record<string, string> = {
  monday: 'Pazartesi', tuesday: 'Salı', wednesday: 'Çarşamba', thursday: 'Perşembe', friday: 'Cuma', saturday: 'Cumartesi', sunday: 'Pazar',
};

const PRICE_TYPES = [
  { value: 'per_package', label: 'Paket Başı' },
  { value: 'one_time', label: 'Tek Seferlik' },
  { value: 'per_month', label: 'Aylık' },
  { value: 'per_hour', label: 'Saatlik' },
  { value: 'per_day', label: 'Günlük' },
];

interface StepConfig {
  id: number;
  icon: string;
  label: string;
  fieldKey?: string;
}

const ALL_STEPS: StepConfig[] = [
  { id: 1, icon: '📝', label: 'Temel Bilgiler', fieldKey: 'service_description' },
  { id: 2, icon: '💰', label: 'Fiyat Paketleri', fieldKey: 'service_packages' },
  { id: 3, icon: '🕐', label: 'Çalışma Saatleri', fieldKey: 'working_hours' },
  { id: 4, icon: '📍', label: 'Konum' },
  { id: 5, icon: '📸', label: 'Fotoğraflar' },
  { id: 6, icon: '🗺️', label: 'Hizmet Bölgeleri', fieldKey: 'service_areas' },
  { id: 7, icon: '📜', label: 'Sertifikalar', fieldKey: 'certificates' },
  { id: 8, icon: '❓', label: 'Sıkça Sorulan Sorular', fieldKey: 'faq' },
  { id: 9, icon: '✨', label: 'Hizmet Özellikleri', fieldKey: 'service_features' },
  { id: 10, icon: '👤', label: 'Hakkında', fieldKey: 'about' },
];

const createDefaultWorkingHours = (): WorkingHours => {
  const defaultDay: WorkingHoursDay = { start: '09:00', end: '18:00', is_active: true, break_start: '12:00', break_end: '13:00' };
  return {
    monday: { ...defaultDay }, tuesday: { ...defaultDay }, wednesday: { ...defaultDay },
    thursday: { ...defaultDay }, friday: { ...defaultDay },
    saturday: { start: '10:00', end: '16:00', is_active: true, break_start: '13:00', break_end: '14:00' },
    sunday: { ...defaultDay, is_active: false, break_start: '', break_end: '' },
    special_notes: '',
  };
};

const createEmptyPackage = (): PricingPackage => ({
  id: `pkg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
  package_title: '', description: '', price: '', currency: 'TL', price_type: 'one_time',
  delivery_days: '', features: [], is_popular: false, discount_percentage: '',
});

const DEFAULT_FORM: ServiceFormData = {
  title: '', description: '', pricing_packages: [createEmptyPackage()],
  working_hours: createDefaultWorkingHours(),
  city: '', district: '',
  neighborhood: '', address: '', images: [],
  portfolio_images: [], service_areas: [], certificates: [],
  faq_items: [], service_features: [], about_text: '', quick_action_prefs: { whatsapp: true, message: true, phone: true, appointment: true }, response_rate: '1 saat',
};

const ServiceListingFormMobile: React.FC<Props> = ({ onSubmit }) => {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [step, setStep] = useState(1);

  const [selectedCategory] = useState<{ id: string | number; name: string } | null>(() => {
    if (typeof window === 'undefined') return null;
    for (let i = 6; i >= 1; i--) {
      const id = sessionStorage.getItem(`level${i}_id`);
      const name = sessionStorage.getItem(`level${i}_name`);
      if (id && name) return { id, name };
    }
    return null;
  });

  const serviceFields = useMemo<ServiceFieldConfig>(() => {
    if (!selectedCategory?.id) {
      return getServiceFieldsForCategory(12542);
    }
    return getServiceFieldsForCategory(Number(selectedCategory.id));
  }, [selectedCategory?.id]);

  const featureOptions = useMemo<string[]>(() => {
    if (!selectedCategory?.id) {
      return getFeatureOptionsForCategory(12542);
    }
    return getFeatureOptionsForCategory(Number(selectedCategory.id));
  }, [selectedCategory?.id]);

  const steps = useMemo(() => {
    return ALL_STEPS.filter((s) => {
      if (!s.fieldKey) return true;
      return serviceFields[s.fieldKey as keyof ServiceFieldConfig] === true;
    });
  }, [serviceFields]);

  const totalSteps = steps.length;

  const [formData, setFormData] = useState<ServiceFormData>(() => {
    if (typeof window === 'undefined') return DEFAULT_FORM;
    try {
      const saved = sessionStorage.getItem('serviceFormData');
      if (saved) {
        const p = JSON.parse(saved);
        return {
          ...DEFAULT_FORM, ...p,
          pricing_packages: p.pricing_packages?.length ? p.pricing_packages : [createEmptyPackage()],
          working_hours: p.working_hours || createDefaultWorkingHours(),
          images: p.images || [],
        };
      }
    } catch { /* */ }
    return DEFAULT_FORM;
  });

  const [categoryFields, setCategoryFields] = useState<CategoryField[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [totalSize, setTotalSize] = useState(0);

  const [cities, setCities] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);

  const [slideDir, setSlideDir] = useState<'left' | 'right'>('left');
  const [animKey, setAnimKey] = useState(0);
  const [newFeature, setNewFeature] = useState<Record<string, string>>({});

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

  const loadCategoryFields = useCallback(async (catId: string | number) => {
    setLoadingFields(true);
    try {
      const filters = await createListingService.getCategoryFilters(Number(catId));
      const { priority, more } = createListingService.groupFiltersByPriority(filters);
      const all = [...priority, ...more] as CategoryField[];
      const defaults = createListingService.createDefaultFormData(filters);
      setFormData((p) => ({ ...p, ...defaults }));
      setCategoryFields(all);
    } catch { /* */ } finally { setLoadingFields(false); }
  }, []);

  useEffect(() => {
    if (selectedCategory?.id && step === 6 && categoryFields.length === 0) loadCategoryFields(selectedCategory.id);
  }, [selectedCategory, step, categoryFields.length, loadCategoryFields]);

  const save = (data: ServiceFormData) => { try { sessionStorage.setItem('serviceFormData', JSON.stringify(data)); } catch { /* */ } };

  const updateFormData = (updater: (prev: ServiceFormData) => ServiceFormData) => {
    const next = updater(formData);
    setFormData(next); save(next);
  };

  const formatPrice = (v: string) => v ? v.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
  const unformatPrice = (v: string) => v.replace(/\./g, '');
  const formatFileSize = (b: number) => (b / (1024 * 1024)).toFixed(1);

  // ===== PACKAGE METHODS =====
  const addPackage = () => {
    if (formData.pricing_packages.length >= 5) return;
    updateFormData((p) => ({ ...p, pricing_packages: [...p.pricing_packages, createEmptyPackage()] }));
  };
  const removePackage = (id: string) => updateFormData((p) => ({ ...p, pricing_packages: p.pricing_packages.filter((pkg) => pkg.id !== id) }));
  const updatePackage = (id: string, field: keyof PricingPackage, value: unknown) => {
    updateFormData((p) => ({ ...p, pricing_packages: p.pricing_packages.map((pkg) => pkg.id === id ? { ...pkg, [field]: value } : pkg) }));
  };
  const addFeatureToPackage = (pkgId: string) => {
    const feat = newFeature[pkgId]?.trim();
    if (!feat) return;
    updateFormData((p) => ({ ...p, pricing_packages: p.pricing_packages.map((pkg) => pkg.id === pkgId ? { ...pkg, features: [...pkg.features, feat] } : pkg) }));
    setNewFeature((prev) => ({ ...prev, [pkgId]: '' }));
  };
  const removeFeatureFromPackage = (pkgId: string, idx: number) => {
    updateFormData((p) => ({ ...p, pricing_packages: p.pricing_packages.map((pkg) => pkg.id === pkgId ? { ...pkg, features: pkg.features.filter((_, i) => i !== idx) } : pkg) }));
  };

  // ===== WORKING HOURS =====
  const updateDay = (day: keyof WorkingHours, field: keyof WorkingHoursDay, value: string | boolean) => {
    updateFormData((p) => ({ ...p, working_hours: { ...p.working_hours, [day]: { ...(p.working_hours[day] as WorkingHoursDay), [field]: value } } }));
  };

  // ===== IMAGES =====
  const [imageError, setImageError] = useState('');
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setImageError('');
    if (formData.images.length + files.length > 10) { setImageError('En fazla 10 fotoğraf yükleyebilirsiniz'); return; }
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
    updateFormData((p) => ({ ...p, images: [...p.images, ...tempImgs] }));
    setTotalSize(sz);

    try {
      setIsUploadingImages(true);
      const uploaded = await createListingService.uploadImages(files);
      if (uploaded && uploaded.length > 0) {
        updateFormData((current) => {
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
          return { ...current, images: updated };
        });
      }
    } catch (err) {
      console.error('Mobil fotoğraf yükleme hatası:', err);
      setImageError('Fotoğraflar sunucuya yüklenirken hata oluştu.');
      updateFormData((current) => {
        const tempIds = new Set(tempImgs.map((t) => t.id));
        tempImgs.forEach((t) => { if (t.url?.startsWith('blob:')) URL.revokeObjectURL(t.url); });
        return { ...current, images: current.images.filter((img) => !tempIds.has(img.id)) };
      });
    } finally {
      setIsUploadingImages(false);
    }
  };
  const removeImg = (id: string) => {
    const img = formData.images.find((x) => x.id === id);
    if (img) { setTotalSize((p) => p - img.size); if (img.url?.startsWith('blob:')) URL.revokeObjectURL(img.url); updateFormData((p) => ({ ...p, images: p.images.filter((x) => x.id !== id) })); }
  };
  const moveToFirst = (idx: number) => {
    const arr = [...formData.images]; const [item] = arr.splice(idx, 1); arr.unshift(item);
    updateFormData((p) => ({ ...p, images: arr }));
  };

  // ===== VALIDATION =====
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (step === 1) {
      if (!formData.title.trim()) e.title = 'Başlık zorunludur';
      else if (formData.title.trim().length < 5) e.title = 'En az 5 karakter';
      else if (formData.title.trim().length > 70) e.title = 'En fazla 70 karakter';
      if (!formData.description.trim()) e.description = 'Açıklama zorunludur';
    }
    if (step === 2) {
      if (formData.pricing_packages.length === 0) e.packages = 'En az bir paket ekleyin';
      formData.pricing_packages.forEach((pkg, idx) => {
        if (!pkg.package_title.trim()) e[`pkg_title_${pkg.id}`] = `${idx + 1}. paket başlığı zorunlu`;
        if (!pkg.price.trim() || Number(pkg.price) <= 0) e[`pkg_price_${pkg.id}`] = `${idx + 1}. paket fiyatı geçersiz`;
      });
    }
    if (step === 3) {
      const hasActive = Object.keys(DAY_LABELS).some((d) => (formData.working_hours[d as keyof WorkingHours] as WorkingHoursDay).is_active);
      if (!hasActive) e.working_hours = 'En az bir gün aktif olmalı';
    }
    if (step === 4) {
      if (!formData.city) e.city = 'İl seçin';
      if (!formData.district) e.district = 'İlçe seçin';
    }
    if (step === 5) {
      if (formData.images.length === 0) e.images = 'En az 1 fotoğraf ekleyin';
    }
    if (step === 6) {
      categoryFields.forEach((f) => {
        if (f.required && f.db_field) {
          const v = formData[f.db_field];
          if (!v || (typeof v === 'string' && !v.trim())) e[f.db_field] = `${f.label} zorunludur`;
        }
      });
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

    const mainImages = formData.images.map((img) => ({ id: img.id, url: img.url, name: img.name, size: img.size }));

    const submitData = {
      ...formData,
      category: selectedCategory,
      rootCategory,
      city: cityName,
      district: districtName,
      neighborhood: neighborhoodName,
      konum: { il: cityName, ilce: districtName, mahalle: neighborhoodName },
      adres: formData.address,
      images: mainImages,
      packages: formData.pricing_packages.map((pkg) => ({
        title: pkg.package_title || '',
        description: pkg.description || '',
        price: pkg.price || 0,
        popular: pkg.is_popular || false,
        deliveryDays: pkg.delivery_days ? Number(pkg.delivery_days) : undefined,
        features: Array.isArray(pkg.features) ? pkg.features : [],
        currency: pkg.currency || 'TRY',
      })),
      workingHours: formData.working_hours,
      working_hours: formData.working_hours,
      service_working_hours: formData.working_hours,
      serviceAreas: formData.service_areas,
      service_areas: formData.service_areas,
      faq: formData.faq_items,
      faq_items: formData.faq_items,
      service_faqs: formData.faq_items,
      // Backend WebListingFormDTO @JsonAnySetter üzerinden attributes.features'a düz metin
      // olarak kaydediliyor; dizi olarak gönderilirse Java List.toString() ("[a, b]") gibi
      // temiz olmayan bir string olarak saklanır — bu yüzden virgülle birleştirip gönderiyoruz.
      features: formData.service_features.join(','),
      quickActionPrefs: formData.quick_action_prefs,
      previewProvider: {
        name: currentUser?.name || '',
        profileImage: currentUser ? (currentUser.picture || currentUser.profileImage || currentUser.avatar || currentUser.photo || currentUser.profile_photo || currentUser.imageUrl || currentUser.profile_photo_url || null) : null,
        responseRate: formData.response_rate || '1 saat',
        bio: formData.about_text || '',
      },
      sertifikalar: formData.certificates.map((c) => ({
        name: c.name || '',
        title: c.title || '',
        date: c.date || '',
        issueDate: c.date || '',
      })),
      certificates: formData.certificates.map((c) => ({
        name: c.name || '',
        title: c.title || '',
        date: c.date || '',
        issueDate: c.date || '',
      })),
    };
    sessionStorage.setItem('listingFormData', JSON.stringify(submitData));
    sessionStorage.setItem('returningFromPreview', 'true');
    onSubmit?.();
    router.push('/ilan-ver/onizleme');
  };

  // ===== STEP RENDERERS =====
  const renderStep1 = () => (
    <div className="sfm-step-body">
      <div className="sfm-field">
        <label className="sfm-label">Hizmet Başlığı <span className="sfm-required">*</span></label>
        <input type="text" value={formData.title} onChange={(e) => { updateFormData((p) => ({ ...p, title: e.target.value })); if (errors.title) setErrors((p) => ({ ...p, title: '' })); }} placeholder="Örn: Eskişehir Düğün Fotoğrafçısı" className={`sfm-input ${errors.title ? 'sfm-input--error' : ''}`} maxLength={70} />
        <div className="sfm-char-count"><span className={formData.title.length > 70 ? 'sfm-char-over' : ''}>{formData.title.length}/70</span></div>
        {errors.title && <span className="sfm-error">{errors.title}</span>}
      </div>

      <div className="sfm-field">
        <label className="sfm-label">Hizmet Açıklaması <span className="sfm-required">*</span></label>
        <RichTextEditor id="description" value={formData.description} onChange={(content: string) => { updateFormData((p) => ({ ...p, description: content })); if (errors.description) setErrors((p) => ({ ...p, description: '' })); }} placeholder="Hizmetinizi detaylı açıklayın..." error={!!errors.description} className="sfm-rich-editor" maxLength={800} />
        {errors.description && <span className="sfm-error">{errors.description}</span>}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="sfm-step-body">
      {errors.packages && <div className="sfm-error-global">{errors.packages}</div>}

      <div className="sfm-packages">
        {formData.pricing_packages.map((pkg, idx) => (
          <div key={pkg.id} className={`sfm-package ${pkg.is_popular ? 'sfm-package--popular' : ''}`}>
            <div className="sfm-pkg-header">
              <span className="sfm-pkg-num">Paket {idx + 1}</span>
              <div className="sfm-pkg-actions">
                <button type="button" className={`sfm-popular-btn ${pkg.is_popular ? 'active' : ''}`} onClick={() => updatePackage(pkg.id, 'is_popular', !pkg.is_popular)}>
                  {pkg.is_popular ? '⭐ Popüler' : 'Popüler Yap'}
                </button>
                {formData.pricing_packages.length > 1 && (
                  <button type="button" className="sfm-remove-btn" onClick={() => removePackage(pkg.id)}>Sil</button>
                )}
              </div>
            </div>

            <div className="sfm-field">
              <label className="sfm-label">Paket Adı <span className="sfm-required">*</span></label>
              <input type="text" value={pkg.package_title} onChange={(e) => updatePackage(pkg.id, 'package_title', e.target.value)} placeholder="Örn: Temel Paket" className={`sfm-input ${errors[`pkg_title_${pkg.id}`] ? 'sfm-input--error' : ''}`} maxLength={80} />
              {errors[`pkg_title_${pkg.id}`] && <span className="sfm-error">{errors[`pkg_title_${pkg.id}`]}</span>}
            </div>

            <div className="sfm-field">
              <label className="sfm-label">Paket Açıklaması</label>
              <input type="text" value={pkg.description} onChange={(e) => updatePackage(pkg.id, 'description', e.target.value)} placeholder="Paketin kısa açıklaması" className="sfm-input" maxLength={80} />
              <span className="sfm-hint">Paket hakkında kısa bir açıklama yazın (isteğe bağlı)</span>
            </div>

            <div className="sfm-field">
              <label className="sfm-label">Fiyat <span className="sfm-required">*</span></label>
              <div className="sfm-price-row">
                <input type="text" value={formatPrice(pkg.price)} onChange={(e) => { const clean = unformatPrice(e.target.value); if ((clean === '' || /^\d+$/.test(clean)) && clean.length <= 12) updatePackage(pkg.id, 'price', clean); }} placeholder="0" className={`sfm-input sfm-price-input ${errors[`pkg_price_${pkg.id}`] ? 'sfm-input--error' : ''}`} inputMode="numeric" />
                <select value={pkg.currency} onChange={(e) => updatePackage(pkg.id, 'currency', e.target.value)} className="sfm-select sfm-currency-select">
                  <option value="TL">₺ TL</option>
                  <option value="USD">$ USD</option>
                  <option value="EUR">€ EUR</option>
                </select>
              </div>
              {errors[`pkg_price_${pkg.id}`] && <span className="sfm-error">{errors[`pkg_price_${pkg.id}`]}</span>}
            </div>

            <div className="sfm-row">
              <div className="sfm-field sfm-field--half">
                <label className="sfm-label">Fiyat Tipi</label>
                <select value={pkg.price_type} onChange={(e) => updatePackage(pkg.id, 'price_type', e.target.value)} className="sfm-select">
                  {PRICE_TYPES.map((pt) => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
                </select>
              </div>
              <div className="sfm-field sfm-field--half">
                <label className="sfm-label">Teslim (gün)</label>
                <input type="text" value={pkg.delivery_days} onChange={(e) => { if (e.target.value === '' || /^\d+$/.test(e.target.value)) updatePackage(pkg.id, 'delivery_days', e.target.value); }} placeholder="14" className="sfm-input" inputMode="numeric" />
              </div>
            </div>

            <div className="sfm-field">
              <label className="sfm-label">İndirim (%)</label>
              <input type="text" value={pkg.discount_percentage} onChange={(e) => { const v = e.target.value; if (v === '' || (/^\d+$/.test(v) && Number(v) <= 100)) updatePackage(pkg.id, 'discount_percentage', v); }} placeholder="0" className="sfm-input" inputMode="numeric" />
            </div>

            <div className="sfm-field">
              <label className="sfm-label">Özellikler</label>
              <div className="sfm-features-list">
                {pkg.features.map((feat, fi) => (
                  <span key={fi} className="sfm-feature-tag">
                    {feat}
                    <button type="button" className="sfm-feature-remove" onClick={() => removeFeatureFromPackage(pkg.id, fi)}>×</button>
                  </span>
                ))}
              </div>
              <div className="sfm-feature-add">
                <input type="text" value={newFeature[pkg.id] || ''} onChange={(e) => setNewFeature((p) => ({ ...p, [pkg.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFeatureToPackage(pkg.id); } }} placeholder="Özellik yazın" className="sfm-input" maxLength={80} />
                <button type="button" className="sfm-add-feature-btn" onClick={() => addFeatureToPackage(pkg.id)}>+</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="sfm-add-pkg-btn" onClick={addPackage} disabled={formData.pricing_packages.length >= 5}>
        + Yeni Paket Ekle ({formData.pricing_packages.length}/5)
      </button>
    </div>
  );

  const renderStep3 = () => {
    const days = Object.keys(DAY_LABELS) as Array<keyof WorkingHours>;
    return (
      <div className="sfm-step-body">
        {errors.working_hours && <div className="sfm-error-global">{errors.working_hours}</div>}

        <div className="sfm-wh-grid">
          {days.map((day) => {
            const d = formData.working_hours[day] as WorkingHoursDay;
            return (
              <div key={day} className={`sfm-wh-card ${d.is_active ? 'sfm-wh-card--active' : 'sfm-wh-card--inactive'}`}>
                <div className="sfm-wh-header">
                  <div className="sfm-wh-day-info">
                    <span className="sfm-wh-day">{DAY_LABELS_FULL[day] || DAY_LABELS[day]}</span>
                    <span className={`sfm-wh-badge ${d.is_active ? 'sfm-wh-badge--active' : 'sfm-wh-badge--inactive'}`}>
                      {d.is_active ? 'Açık' : 'Kapalı'}
                    </span>
                  </div>
                  <label className="sfm-switch" aria-label={`${DAY_LABELS_FULL[day] || day} çalışma durumu`}>
                    <input type="checkbox" checked={d.is_active} onChange={(e) => updateDay(day, 'is_active', e.target.checked)} />
                    <span className="sfm-switch-slider"></span>
                  </label>
                </div>
                {d.is_active && (
                  <div className="sfm-wh-times">
                    <div className="sfm-wh-times-row">
                      <div className="sfm-wh-time-group">
                        <span className="sfm-wh-time-label">Mesai Başlangıç</span>
                        <input type="time" value={d.start} onChange={(e) => updateDay(day, 'start', e.target.value)} className="sfm-time-input" />
                      </div>
                      <span className="sfm-wh-time-sep">-</span>
                      <div className="sfm-wh-time-group">
                        <span className="sfm-wh-time-label">Mesai Bitiş</span>
                        <input type="time" value={d.end} onChange={(e) => updateDay(day, 'end', e.target.value)} className="sfm-time-input" />
                      </div>
                    </div>
                    <div className="sfm-wh-times-row sfm-wh-times-row--break">
                      <div className="sfm-wh-time-group">
                        <span className="sfm-wh-time-label">Öğle / Mola Başla</span>
                        <input type="time" value={d.break_start} onChange={(e) => updateDay(day, 'break_start', e.target.value)} className="sfm-time-input" />
                      </div>
                      <span className="sfm-wh-time-sep">-</span>
                      <div className="sfm-wh-time-group">
                        <span className="sfm-wh-time-label">Öğle / Mola Bitiş</span>
                        <input type="time" value={d.break_end} onChange={(e) => updateDay(day, 'break_end', e.target.value)} className="sfm-time-input" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="sfm-field" style={{ marginTop: '12px' }}>
          <label className="sfm-label">Özel Notlar</label>
          <textarea value={formData.working_hours.special_notes} onChange={(e) => updateFormData((p) => ({ ...p, working_hours: { ...p.working_hours, special_notes: e.target.value } }))} placeholder="Örn: Acil durumlar için 24 saat ulaşılabilir" className="sfm-textarea" rows={2} maxLength={80} />
        </div>
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="sfm-step-body">
      <div className="sfm-field">
        <label className="sfm-label">İl <span className="sfm-required">*</span></label>
        <select value={formData.city} onChange={(e) => { const c = cities.find((x) => String(x.id) === e.target.value); if (c) sessionStorage.setItem('selectedCity', c.name); updateFormData((p) => ({ ...p, city: e.target.value, district: '', neighborhood: '' })); if (errors.city) setErrors((p) => ({ ...p, city: '' })); }} className={`sfm-select ${errors.city ? 'sfm-select--error' : ''}`}>
          <option value="">İl seçin</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {errors.city && <span className="sfm-error">{errors.city}</span>}
      </div>

      <div className="sfm-field">
        <label className="sfm-label">İlçe <span className="sfm-required">*</span></label>
        <select value={formData.district} onChange={(e) => { const d = districts.find((x) => String(x.id) === e.target.value); if (d) sessionStorage.setItem('selectedDistrict', d.name); updateFormData((p) => ({ ...p, district: e.target.value, neighborhood: '' })); if (errors.district) setErrors((p) => ({ ...p, district: '' })); }} className={`sfm-select ${errors.district ? 'sfm-select--error' : ''}`} disabled={!formData.city}>
          <option value="">İlçe seçin</option>
          {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        {errors.district && <span className="sfm-error">{errors.district}</span>}
      </div>

      <div className="sfm-field">
        <label className="sfm-label">Mahalle</label>
        <select value={formData.neighborhood} onChange={(e) => { const n = neighborhoods.find((x) => x.id === e.target.value); if (n) sessionStorage.setItem('selectedNeighborhood', n.name); updateFormData((p) => ({ ...p, neighborhood: e.target.value })); }} className="sfm-select" disabled={!formData.district}>
          <option value="">Mahalle seçin</option>
          {neighborhoods.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
        </select>
      </div>

      <div className="sfm-field">
        <label className="sfm-label">Hizmet Adresi</label>
        <textarea value={formData.address} onChange={(e) => updateFormData((p) => ({ ...p, address: e.target.value }))} placeholder="Hizmet verdiğiniz adresi yazın" className="sfm-textarea" rows={3} maxLength={80} />
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="sfm-step-body">
      {formData.images.length === 0 ? (
        <label className="sfm-upload-area">
          <input type="file" accept="image/*" multiple onChange={handleImagePick} />
          <div className="sfm-upload-inner">
            <div className="sfm-upload-icon">📷</div>
            <p className="sfm-upload-title">Fotoğraf Ekle</p>
            <p className="sfm-upload-sub">En fazla 20 fotoğraf · 10 MB</p>
          </div>
        </label>
      ) : (
        <>
          <div className="sfm-photo-grid">
            {formData.images.map((img, idx) => (
              <div key={img.id} className="sfm-photo-cell">
                <img src={img.url} alt={img.name} className="sfm-photo-img" />
                {idx === 0 && <span className="sfm-photo-badge">Kapak</span>}
                <div className="sfm-photo-overlay">
                  <button type="button" className="sfm-photo-del" onClick={() => removeImg(img.id)}>×</button>
                  {idx > 0 && <button type="button" className="sfm-photo-cover" onClick={() => moveToFirst(idx)}>⭐</button>}
                </div>
                <span className="sfm-photo-num">{idx + 1}</span>
              </div>
            ))}
            {formData.images.length < 10 && (
              <label className="sfm-photo-add">
                <input type="file" accept="image/*" multiple onChange={handleImagePick} />
                <span>+</span>
              </label>
            )}
          </div>
          <div className="sfm-photo-stats"><span>📸 {formData.images.length}/10</span><span>💾 Maks. 5 MB / dosya</span></div>
          <p className="sfm-photo-hint">İlk fotoğraf kapak resmi · Sürükleyerek sırala</p>
        </>
      )}
      {(errors.images || imageError) && <span className="sfm-error">{errors.images || imageError}</span>}
    </div>
  );

  const renderStep6 = () => (
    <div className="sfm-step-body">
      <h3 className="sfm-step-heading">Hizmet Bölgeleri</h3>
      <p className="sfm-step-sub">Hangi illerde hizmet veriyorsunuz?</p>

      <div className="sfm-tags">
        {formData.service_areas.map((area) => (
          <span key={area} className="sfm-tag">
            {area}
            <button type="button" className="sfm-tag-remove" onClick={() => updateFormData((p) => ({ ...p, service_areas: p.service_areas.filter((a) => a !== area) }))}>×</button>
          </span>
        ))}
      </div>

      <select className="sfm-select" onChange={(e) => {
        if (e.target.value && !formData.service_areas.includes(e.target.value)) {
          updateFormData((p) => ({ ...p, service_areas: [...p.service_areas, e.target.value] }));
        }
        e.target.value = '';
      }}>
        <option value="">İl Ekleyin</option>
        {cities.filter((c) => !formData.service_areas.includes(c.name)).map((c) => (
          <option key={c.id} value={c.name}>{c.name}</option>
        ))}
      </select>
    </div>
  );

  const renderStep7 = () => (
    <div className="sfm-step-body">
      <h3 className="sfm-step-heading">Sertifikalar</h3>
      <p className="sfm-step-sub">Sertifikanız varsa ekleyin (isteğe bağlı)</p>

      {formData.certificates.length > 0 && (
        <div className="sfm-cert-grid">
          {formData.certificates.map((cert, idx) => (
            <div key={idx} className="sfm-section-card">
              <div className="sfm-cert-header">
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>📜 Sertifika {idx + 1}</span>
                <button type="button" className="sfm-remove-btn" onClick={() => {
                  const newCerts = formData.certificates.filter((_, i) => i !== idx);
                  updateFormData((p) => ({ ...p, certificates: newCerts }));
                }}>Sil</button>
              </div>
              <div className="sfm-field">
                <label className="sfm-label">Sertifika Adı</label>
                <input type="text" value={cert.name} onChange={(e) => {
                  const newCerts = [...formData.certificates];
                  newCerts[idx] = { ...newCerts[idx], name: e.target.value };
                  updateFormData((p) => ({ ...p, certificates: newCerts }));
                }} placeholder="Örn: Adobe Certified Expert" className="sfm-input" maxLength={80} />
              </div>
              <div className="sfm-field">
                <label className="sfm-label">Başlık</label>
                <input type="text" value={cert.title} onChange={(e) => {
                  const newCerts = [...formData.certificates];
                  newCerts[idx] = { ...newCerts[idx], title: e.target.value };
                  updateFormData((p) => ({ ...p, certificates: newCerts }));
                }} placeholder="Sertifika detayı" className="sfm-input" maxLength={80} />
              </div>
              <div className="sfm-field">
                <label className="sfm-label">Tarih</label>
                <input type="date" value={cert.date} onChange={(e) => {
                  const newCerts = [...formData.certificates];
                  newCerts[idx] = { ...newCerts[idx], date: e.target.value };
                  updateFormData((p) => ({ ...p, certificates: newCerts }));
                }} className="sfm-input" />
              </div>
            </div>
          ))}
        </div>
      )}

      {formData.certificates.length < 10 && (
        <button type="button" className="sfm-add-btn" onClick={() => {
          updateFormData((p) => ({ ...p, certificates: [...p.certificates, { name: '', title: '', date: new Date().toISOString().split('T')[0] }] }));
        }}>+ Sertifika Ekle</button>
      )}
    </div>
  );

  const renderStep8 = () => (
    <div className="sfm-step-body">
      <h3 className="sfm-step-heading">Sıkça Sorulan Sorular</h3>
      <p className="sfm-step-sub">Müşterilerinizin sıkça sorduğu soruları ekleyin</p>

      {formData.faq_items.map((item, idx) => (
        <div key={idx} className="sfm-faq-item">
          <div className="sfm-field">
            <label className="sfm-label">Soru</label>
            <input type="text" value={item.question} onChange={(e) => {
              const newFaq = [...formData.faq_items];
              newFaq[idx] = { ...newFaq[idx], question: e.target.value };
              updateFormData((p) => ({ ...p, faq_items: newFaq }));
            }} placeholder="Soru yazın" className="sfm-input" maxLength={80} />
          </div>
          <div className="sfm-field">
            <label className="sfm-label">Cevap</label>
            <textarea value={item.answer} onChange={(e) => {
              const newFaq = [...formData.faq_items];
              newFaq[idx] = { ...newFaq[idx], answer: e.target.value };
              updateFormData((p) => ({ ...p, faq_items: newFaq }));
            }} placeholder="Cevap yazın" className="sfm-textarea" rows={3} maxLength={80} />
          </div>
          <button type="button" className="sfm-remove-btn" onClick={() => updateFormData((p) => ({ ...p, faq_items: p.faq_items.filter((_, i) => i !== idx) }))}>Sil</button>
        </div>
      ))}

      <button type="button" className="sfm-add-btn" onClick={() => updateFormData((p) => ({ ...p, faq_items: [...p.faq_items, { question: '', answer: '' }] }))}>+ Soru Ekle</button>
    </div>
  );

  const renderStep9 = () => (
    <div className="sfm-step-body">
      <h3 className="sfm-step-heading">Hizmet Özellikleri</h3>
      <p className="sfm-step-sub">Hizmetinizin özelliklerini seçin</p>

      {featureOptions.length > 0 ? (
        <div className="sfm-features-grid">
          {featureOptions.map((feature) => {
            const isSelected = formData.service_features.includes(feature);
            return (
              <label key={feature} className={`sfm-feature-checkbox ${isSelected ? 'sfm-feature-checkbox--selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {
                    if (isSelected) {
                      updateFormData((p) => ({
                        ...p,
                        service_features: p.service_features.filter((f) => f !== feature),
                      }));
                    } else {
                      updateFormData((p) => ({
                        ...p,
                        service_features: [...p.service_features, feature],
                      }));
                    }
                  }}
                />
                <span className="sfm-feature-check">{isSelected ? '✓' : ''}</span>
                <span className="sfm-feature-text">{feature}</span>
              </label>
            );
          })}
        </div>
      ) : (
        <div className="sfm-empty-features">
          <p>Bu kategori için tanımlı özellik seçeneği bulunmamaktadır.</p>
        </div>
      )}

      {formData.service_features.length > 0 && (
        <div className="sfm-selected-count">
          <span>{formData.service_features.length} özellik seçildi</span>
        </div>
      )}
    </div>
  );

  const renderStep10 = () => (
    <div className="sfm-step-body">
      <h3 className="sfm-step-heading">Hakkında</h3>
      <p className="sfm-step-sub">Kendinizi ve işinizi tanıtın</p>

      <div className="sfm-field">
        <label className="sfm-label">Hakkında Yazısı</label>
        <textarea
          value={formData.about_text}
          onChange={(e) => updateFormData((p) => ({ ...p, about_text: e.target.value }))}
          placeholder="Kendinizi ve işinizi tanıtın..."
          className="sfm-textarea"
          rows={6}
          maxLength={800}
        />
        <div className="sfm-char-count"><span>{(formData.about_text || '').length}/800</span></div>
      </div>

      <div className="sfm-section-card">
        <h3 className="sfm-section-title">Müşteri İletişim Kanalları</h3>
        <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.75rem', lineHeight: 1.5 }}>
          İletişim bilgileriniz hesap ayarlarınızdan değiştirilir. Bu bölüm yalnızca ilanınızda hangi kısayolların görüneceğini kontrol eder.
        </p>
        {[
          { key: 'whatsapp', label: 'WhatsApp Kısayolu', desc: 'Özet yan sütun' },
          { key: 'message', label: 'Site İçi Mesaj', desc: 'Özet + mobil alt çubuk' },
          { key: 'phone', label: 'Telefon - Hemen Ara', desc: 'Üst başlık + mobil' },
          { key: 'appointment', label: 'Randevu Al', desc: 'Üst başlık, paketler ve mobil' },
        ].map(({ key, label, desc }) => (
          <div key={key} className="sfm-channel-row">
            <div className="sfm-channel-info">
              <span className="sfm-channel-label">{label}</span>
              <span className="sfm-channel-desc">{desc}</span>
            </div>
            <label className="sfm-switch">
              <input
                type="checkbox"
                checked={formData.quick_action_prefs[key as keyof typeof formData.quick_action_prefs]}
                onChange={(e) => updateFormData((p) => ({
                  ...p,
                  quick_action_prefs: { ...p.quick_action_prefs, [key]: e.target.checked }
                }))}
              />
              <span className="sfm-switch-slider"></span>
            </label>
          </div>
        ))}
        <div className="sfm-response-rate">
          <label className="sfm-label">Yanıt süresi:</label>
          <input
            type="text"
            value={formData.response_rate}
            onChange={(e) => updateFormData((p) => ({ ...p, response_rate: e.target.value }))}
            placeholder="örn. 1 saat"
            className="sfm-input"
            maxLength={80}
          />
        </div>
      </div>
    </div>
  );

  const stepRenderersMap: Record<number, () => JSX.Element> = {
    1: renderStep1,
    2: renderStep2,
    3: renderStep3,
    4: renderStep4,
    5: renderStep5,
    6: renderStep6,
    7: renderStep7,
    8: renderStep8,
    9: renderStep9,
    10: renderStep10,
  };

  const getCurrentStepRenderer = () => {
    const currentStepConfig = steps[step - 1];
    if (!currentStepConfig) return null;
    const renderer = stepRenderersMap[currentStepConfig.id];
    return renderer ? renderer() : null;
  };

  return (
    <div className="sfm-root">
      <div className="sfm-topbar">
        <button type="button" className="sfm-back-btn" onClick={handleBack}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15l-5-5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div className="sfm-topbar-center">
          <span className="sfm-step-label">{steps[step - 1]?.label}</span>
          <span className="sfm-step-counter">{step}/{totalSteps}</span>
        </div>
        {step < totalSteps ? (
          <button type="button" className="sfm-topbar-next" onClick={() => goTo(step + 1)}>Devam →</button>
        ) : (
          <button type="button" className="sfm-topbar-next sfm-topbar-next--finish" onClick={handleFinish}>Önizleme →</button>
        )}
      </div>
      <div className="sfm-progress"><div className="sfm-progress-fill" style={{ width: `${(step / totalSteps) * 100}%` }} /></div>
      <div key={animKey} className={`sfm-content sfm-slide-${slideDir}`}>
        {getCurrentStepRenderer()}
      </div>
    </div>
  );
};

export default ServiceListingFormMobile;