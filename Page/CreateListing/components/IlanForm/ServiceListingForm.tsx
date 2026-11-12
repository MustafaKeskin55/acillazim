'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import './ServiceListingForm.css';
import createListingService from '@/services/createListing';
import RichTextEditor from './RichTextEditor';
import { useAuth } from '@/context/AuthContext';
import * as locationService from '@/services/location/locationService';
import ServiceListingFormMobile from './ServiceListingFormMobile';
import {
  getServiceFieldsForCategory,
  getFeatureOptionsForCategory,
  getActiveFieldKeys,
  type ServiceFieldConfig
} from '@/utils/serviceFilterHelper';

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

const DAY_LABELS: Record<string, string> = {
  monday: 'Pazartesi',
  tuesday: 'Salı',
  wednesday: 'Çarşamba',
  thursday: 'Perşembe',
  friday: 'Cuma',
  saturday: 'Cumartesi',
  sunday: 'Pazar',
};

const PRICE_TYPES = [
  { value: 'per_package', label: 'Paket Başı' },
  { value: 'one_time', label: 'Tek Seferlik' },
  { value: 'per_month', label: 'Aylık' },
  { value: 'per_hour', label: 'Saatlik' },
  { value: 'per_day', label: 'Günlük' },
];

const createDefaultWorkingHours = (): WorkingHours => {
  const defaultDay: WorkingHoursDay = { start: '09:00', end: '18:00', is_active: true, break_start: '12:00', break_end: '13:00' };
  return {
    monday: { ...defaultDay },
    tuesday: { ...defaultDay },
    wednesday: { ...defaultDay },
    thursday: { ...defaultDay },
    friday: { ...defaultDay },
    saturday: { start: '10:00', end: '16:00', is_active: true, break_start: '13:00', break_end: '14:00' },
    sunday: { ...defaultDay, is_active: false, break_start: '', break_end: '' },
    special_notes: '',
  };
};

const createEmptyPackage = (): PricingPackage => ({
  id: `pkg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
  package_title: '',
  description: '',
  price: '',
  currency: 'TL',
  price_type: 'one_time',
  delivery_days: '',
  features: [],
  is_popular: false,
  discount_percentage: '',
});

const DEFAULT_FORM: ServiceFormData = {
  title: '',
  description: '',
  pricing_packages: [createEmptyPackage()],
  working_hours: createDefaultWorkingHours(),
  city: '',
  district: '',
  neighborhood: '',
  address: '',
  images: [],
  portfolio_images: [],
  service_areas: [],
  certificates: [],
  faq_items: [],
  service_features: [],
  about_text: '',
  quick_action_prefs: { whatsapp: true, message: true, phone: true, appointment: true },
  response_rate: '1 saat',
};

const ServiceListingForm: React.FC<Props> = ({ onSubmit }) => {
  const isMobile = useIsMobile();
  return isMobile
    ? <ServiceListingFormMobile onSubmit={onSubmit} />
    : <ServiceListingFormDesktop onSubmit={onSubmit} />;
};

const ServiceListingFormDesktop: React.FC<Props> = ({ onSubmit }) => {
  const { isAuthenticated, currentUser } = useAuth();
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
    return ALL_STEPS.filter((step) => {
      if (!step.fieldKey) return true;
      return serviceFields[step.fieldKey as keyof ServiceFieldConfig] === true;
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
          ...DEFAULT_FORM,
          ...p,
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

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const [newFeature, setNewFeature] = useState<Record<string, string>>({});

  useEffect(() => { locationService.getProvinces().then(setCities).catch(() => setCities([])); }, []);

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

  const loadCategoryFields = useCallback(async (categoryId: string | number) => {
    setLoadingFields(true);
    try {
      const filters = await createListingService.getCategoryFilters(Number(categoryId));
      const { priority, more } = createListingService.groupFiltersByPriority(filters);
      const all = [...priority, ...more] as CategoryField[];
      const defaults = createListingService.createDefaultFormData(filters);
      setFormData((p) => ({ ...p, ...defaults }));
      setCategoryFields(all);
    } catch { /* */ } finally { setLoadingFields(false); }
  }, []);

  useEffect(() => {
    if (selectedCategory?.id && currentStep === 6 && categoryFields.length === 0) {
      loadCategoryFields(selectedCategory.id);
    }
  }, [selectedCategory, currentStep, categoryFields.length, loadCategoryFields]);

  const saveFormData = (data: ServiceFormData) => {
    try { sessionStorage.setItem('serviceFormData', JSON.stringify(data)); } catch { /* */ }
  };

  const updateFormData = (updater: (prev: ServiceFormData) => ServiceFormData) => {
    const next = updater(formData);
    setFormData(next);
    saveFormData(next);
  };

  const formatPrice = (v: string) => v ? v.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
  const unformatPrice = (v: string) => v.replace(/\./g, '');

  const formatFileSize = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);

  // ===== PACKAGE METHODS =====
  const addPackage = () => {
    if (formData.pricing_packages.length >= 5) return;
    updateFormData((p) => ({
      ...p,
      pricing_packages: [...p.pricing_packages, createEmptyPackage()],
    }));
  };

  const removePackage = (id: string) => {
    updateFormData((p) => ({
      ...p,
      pricing_packages: p.pricing_packages.filter((pkg) => pkg.id !== id),
    }));
  };

  const updatePackage = (id: string, field: keyof PricingPackage, value: unknown) => {
    updateFormData((p) => ({
      ...p,
      pricing_packages: p.pricing_packages.map((pkg) =>
        pkg.id === id ? { ...pkg, [field]: value } : pkg
      ),
    }));
  };

  const addFeatureToPackage = (pkgId: string) => {
    const feature = newFeature[pkgId]?.trim();
    if (!feature) return;
    updateFormData((p) => ({
      ...p,
      pricing_packages: p.pricing_packages.map((pkg) =>
        pkg.id === pkgId ? { ...pkg, features: [...pkg.features, feature] } : pkg
      ),
    }));
    setNewFeature((p) => ({ ...p, [pkgId]: '' }));
  };

  const removeFeatureFromPackage = (pkgId: string, featureIdx: number) => {
    updateFormData((p) => ({
      ...p,
      pricing_packages: p.pricing_packages.map((pkg) =>
        pkg.id === pkgId
          ? { ...pkg, features: pkg.features.filter((_, i) => i !== featureIdx) }
          : pkg
      ),
    }));
  };

  // ===== WORKING HOURS METHODS =====
  const updateWorkingHours = (day: keyof WorkingHours, field: keyof WorkingHoursDay, value: string | boolean) => {
    updateFormData((p) => ({
      ...p,
      working_hours: {
        ...p.working_hours,
        [day]: { ...(p.working_hours[day] as WorkingHoursDay), [field]: value },
      },
    }));
  };

  const updateSpecialNotes = (notes: string) => {
    updateFormData((p) => ({
      ...p,
      working_hours: { ...p.working_hours, special_notes: notes },
    }));
  };

  // ===== IMAGE METHODS =====
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (formData.images.length + files.length > 10) {
      setErrors((p) => ({ ...p, images: 'En fazla 10 fotoğraf ekleyebilirsiniz' }));
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/pjpeg'];
    for (const f of files) {
      if (!f.type.startsWith('image/') || (!allowedTypes.includes(f.type) && !/\.(jpe?g|png|webp)$/i.test(f.name))) {
        setErrors((p) => ({ ...p, images: 'Sadece JPG, JPEG, PNG veya WEBP yükleyebilirsiniz' }));
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        setErrors((p) => ({ ...p, images: `"${f.name}" boyutu 5 MB\'tan büyük olamaz (Maks. 5 MB/dosya)` }));
        return;
      }
    }
    const tempImgs: FormImage[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      uploading: true
    }));
    const nextData = { ...formData, images: [...formData.images, ...tempImgs] };
    setFormData(nextData);
    saveFormData(nextData);

    try {
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
      console.error('ServiceListingForm upload error:', err);
    }
  };

  const removeImage = (id: string) => {
    const img = formData.images.find((x) => x.id === id);
    if (img) {
      setTotalSize((p) => p - (img.size || 0));
      if (img.url?.startsWith('blob:')) URL.revokeObjectURL(img.url);
      updateFormData((p) => ({ ...p, images: p.images.filter((x) => x.id !== id) }));
    }
  };

  const moveImage = (from: number, to: number) => {
    const arr = [...formData.images];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    updateFormData((p) => ({ ...p, images: arr }));
  };

  const handleDragStart = (e: React.DragEvent, i: number) => { setDraggedIndex(i); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setDragOverIndex(i); };
  const handleDrop = (e: React.DragEvent, to: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== to) moveImage(draggedIndex, to);
    setDraggedIndex(null); setDragOverIndex(null);
  };

  // ===== CATEGORY FIELD METHODS =====
  const handleCategoryFieldChange = (fieldName: string, value: unknown) => {
    updateFormData((p) => ({ ...p, [fieldName]: value }));
    if (errors[fieldName]) setErrors((p) => ({ ...p, [fieldName]: '' }));
  };

  // ===== VALIDATION =====
  const validateStep = (stepId: number): boolean => {
    const errs: Record<string, string> = {};

    if (stepId === 1) {
      if (!formData.title.trim()) errs.title = 'Hizmet başlığı zorunludur';
      else if (formData.title.trim().length < 5) errs.title = 'En az 5 karakter olmalı';
      else if (formData.title.trim().length > 70) errs.title = 'En fazla 70 karakter olabilir';
      if (!formData.description.trim()) errs.description = 'Açıklama zorunludur';
    }

    if (stepId === 2) {
      if (formData.pricing_packages.length === 0) {
        errs.packages = 'En az bir fiyat paketi ekleyin';
      } else {
        formData.pricing_packages.forEach((pkg, idx) => {
          if (!pkg.package_title.trim()) errs[`pkg_title_${pkg.id}`] = `${idx + 1}. paket başlığı zorunludur`;
          if (!pkg.price.trim() || Number(pkg.price) <= 0) errs[`pkg_price_${pkg.id}`] = `${idx + 1}. paket fiyatı geçersiz`;
        });
      }
    }

    if (stepId === 3) {
      const days = Object.keys(DAY_LABELS) as Array<keyof WorkingHours>;
      const hasActiveDay = days.some((d) => {
        const dayData = formData.working_hours[d] as WorkingHoursDay;
        return dayData.is_active;
      });
      if (!hasActiveDay) errs.working_hours = 'En az bir gün aktif olmalıdır';
    }

    if (stepId === 4) {
      if (!formData.city) errs.city = 'İl seçimi zorunludur';
      if (!formData.district && formData.city) errs.district = 'İlçe seçimi zorunludur';
    }

    if (stepId === 5) {
      if (formData.images.length === 0) errs.images = 'En az 1 fotoğraf yükleyin';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < totalSteps) setCurrentStep((p) => p + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) { setCurrentStep((p) => p - 1); setErrors({}); }
  };

  const handleSubmit = () => {
    if (!validateStep(currentStep)) return;
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

  if (!selectedCategory) {
    return <div className="slf-container"><div className="slf-error-global">Lütfen önce kategori seçimi yapınız.</div></div>;
  }

  // ===== STEP RENDERERS =====
  const renderStep1 = () => (
    <div className="slf-step-content">
      <h2 className="slf-step-title">Hizmet Bilgileri</h2>
      <p className="slf-step-desc">Hizmetinizin temel bilgilerini girin</p>

      <div className="slf-field">
        <label className="slf-label">Hizmet Başlığı <span className="slf-required">*</span></label>
        <input type="text" value={formData.title} onChange={(e) => { updateFormData((p) => ({ ...p, title: e.target.value })); if (errors.title) setErrors((p) => ({ ...p, title: '' })); }} placeholder="Örn: Eskişehir Düğün Fotoğrafçısı" className={`slf-input ${errors.title ? 'slf-input--error' : ''}`} maxLength={70} />
        <div className="slf-char-count"><span className={formData.title.length > 70 ? 'slf-char-over' : ''}>{formData.title.length}/70</span></div>
        {errors.title && <span className="slf-error">{errors.title}</span>}
      </div>

      <div className="slf-field">
        <label className="slf-label">Hizmet Açıklaması <span className="slf-required">*</span></label>
        <RichTextEditor id="description" value={formData.description} onChange={(content: string) => { updateFormData((p) => ({ ...p, description: content })); if (errors.description) setErrors((p) => ({ ...p, description: '' })); }} placeholder="Hizmetinizi detaylı açıklayın..." error={!!errors.description} className="slf-rich-editor" maxLength={800} />
        {errors.description && <span className="slf-error">{errors.description}</span>}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="slf-step-content">
      <h2 className="slf-step-title">Fiyat Paketleri</h2>
      <p className="slf-step-desc">Hizmetiniz için fiyat paketleri oluşturun</p>
      {errors.packages && <div className="slf-error-global">{errors.packages}</div>}

      <div className="slf-packages">
        {formData.pricing_packages.map((pkg, idx) => (
          <div key={pkg.id} className={`slf-package ${pkg.is_popular ? 'slf-package--popular' : ''}`}>
            <div className="slf-package-header">
              <span className="slf-package-num">Paket {idx + 1}</span>
              <div className="slf-package-actions">
                <button type="button" className={`slf-popular-btn ${pkg.is_popular ? 'active' : ''}`} onClick={() => updatePackage(pkg.id, 'is_popular', !pkg.is_popular)}>
                  {pkg.is_popular ? '⭐ Popüler' : 'Popüler Yap'}
                </button>
                {formData.pricing_packages.length > 1 && (
                  <button type="button" className="slf-remove-btn" onClick={() => removePackage(pkg.id)}>Sil</button>
                )}
              </div>
            </div>

            <div className="slf-package-grid">
              <div className="slf-field">
                <label className="slf-label">Paket Adı <span className="slf-required">*</span></label>
                <input type="text" value={pkg.package_title} onChange={(e) => updatePackage(pkg.id, 'package_title', e.target.value)} placeholder="Örn: Temel Paket" className={`slf-input ${errors[`pkg_title_${pkg.id}`] ? 'slf-input--error' : ''}`} maxLength={80} />
                {errors[`pkg_title_${pkg.id}`] && <span className="slf-error">{errors[`pkg_title_${pkg.id}`]}</span>}
              </div>

              <div className="slf-field">
                <label className="slf-label">Paket Açıklaması</label>
                <input type="text" value={pkg.description} onChange={(e) => updatePackage(pkg.id, 'description', e.target.value)} placeholder="Paketin kısa açıklaması" className="slf-input" maxLength={80} />
                <span className="slf-hint">Paket hakkında kısa bir açıklama yazın (isteğe bağlı)</span>
              </div>

              <div className="slf-field">
                <label className="slf-label">Fiyat <span className="slf-required">*</span></label>
                <div className="slf-price-row">
                  <input type="text" value={formatPrice(pkg.price)} onChange={(e) => { const clean = unformatPrice(e.target.value); if ((clean === '' || /^\d+$/.test(clean)) && clean.length <= 12) updatePackage(pkg.id, 'price', clean); }} placeholder="0" className={`slf-input slf-price-input ${errors[`pkg_price_${pkg.id}`] ? 'slf-input--error' : ''}`} inputMode="numeric" />
                  <select value={pkg.currency} onChange={(e) => updatePackage(pkg.id, 'currency', e.target.value)} className="slf-select slf-currency-select">
                    <option value="TL">₺ TL</option>
                    <option value="USD">$ USD</option>
                    <option value="EUR">€ EUR</option>
                  </select>
                </div>
                {errors[`pkg_price_${pkg.id}`] && <span className="slf-error">{errors[`pkg_price_${pkg.id}`]}</span>}
              </div>

              <div className="slf-field">
                <label className="slf-label">Fiyat Tipi</label>
                <select value={pkg.price_type} onChange={(e) => updatePackage(pkg.id, 'price_type', e.target.value)} className="slf-select">
                  {PRICE_TYPES.map((pt) => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
                </select>
              </div>

              <div className="slf-field">
                <label className="slf-label">Teslim Süresi (gün)</label>
                <input type="text" value={pkg.delivery_days} onChange={(e) => { if (e.target.value === '' || /^\d+$/.test(e.target.value)) updatePackage(pkg.id, 'delivery_days', e.target.value); }} placeholder="Örn: 14" className="slf-input" inputMode="numeric" />
              </div>

              <div className="slf-field">
                <label className="slf-label">İndirim (%)</label>
                <input type="text" value={pkg.discount_percentage} onChange={(e) => { const v = e.target.value; if ((v === '' || (/^\d+$/.test(v) && Number(v) <= 100))) updatePackage(pkg.id, 'discount_percentage', v); }} placeholder="0" className="slf-input" inputMode="numeric" />
              </div>
            </div>

            <div className="slf-field">
              <label className="slf-label">Paket Özellikleri</label>
              <div className="slf-features-list">
                {pkg.features.map((feat, fi) => (
                  <span key={fi} className="slf-feature-tag">
                    {feat}
                    <button type="button" className="slf-feature-remove" onClick={() => removeFeatureFromPackage(pkg.id, fi)}>×</button>
                  </span>
                ))}
              </div>
              <div className="slf-feature-add">
                <input type="text" value={newFeature[pkg.id] || ''} onChange={(e) => setNewFeature((p) => ({ ...p, [pkg.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFeatureToPackage(pkg.id); } }} placeholder="Özellik yazın ve Enter'a basın" className="slf-input" maxLength={80} />
                <button type="button" className="slf-add-feature-btn" onClick={() => addFeatureToPackage(pkg.id)}>Ekle</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="slf-add-package-btn" onClick={addPackage} disabled={formData.pricing_packages.length >= 5}>
        + Yeni Paket Ekle ({formData.pricing_packages.length}/5)
      </button>
    </div>
  );

  const renderStep3 = () => {
    const days = Object.keys(DAY_LABELS) as Array<keyof WorkingHours>;
    return (
      <div className="slf-step-content">
        <h2 className="slf-step-title">Çalışma Saatleri</h2>
        <p className="slf-step-desc">Haftalık çalışma programınızı ayarlayın</p>
        {errors.working_hours && <div className="slf-error-global">{errors.working_hours}</div>}

        <div className="slf-working-hours">
          {days.map((day) => {
            const dayData = formData.working_hours[day] as WorkingHoursDay;
            return (
              <div key={day} className={`slf-day-row ${dayData.is_active ? 'slf-day-row--active' : 'slf-day-row--inactive'}`}>
                <div className="slf-day-toggle">
                  <label className="slf-switch">
                    <input type="checkbox" checked={dayData.is_active} onChange={(e) => updateWorkingHours(day, 'is_active', e.target.checked)} />
                    <span className="slf-switch-slider"></span>
                  </label>
                  <span className="slf-day-name">{DAY_LABELS[day]}</span>
                </div>
                {dayData.is_active && (
                  <div className="slf-day-times">
                    <div className="slf-time-group">
                      <label className="slf-time-label">Başlangıç</label>
                      <input type="time" value={dayData.start} onChange={(e) => updateWorkingHours(day, 'start', e.target.value)} className="slf-time-input" />
                    </div>
                    <span className="slf-time-sep">—</span>
                    <div className="slf-time-group">
                      <label className="slf-time-label">Bitiş</label>
                      <input type="time" value={dayData.end} onChange={(e) => updateWorkingHours(day, 'end', e.target.value)} className="slf-time-input" />
                    </div>
                    <div className="slf-break-group">
                      <label className="slf-time-label">Mola</label>
                      <div className="slf-break-inputs">
                        <input type="time" value={dayData.break_start} onChange={(e) => updateWorkingHours(day, 'break_start', e.target.value)} className="slf-time-input" />
                        <span className="slf-time-sep">—</span>
                        <input type="time" value={dayData.break_end} onChange={(e) => updateWorkingHours(day, 'break_end', e.target.value)} className="slf-time-input" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="slf-field" style={{ marginTop: '16px' }}>
          <label className="slf-label">Özel Notlar</label>
          <textarea value={formData.working_hours.special_notes} onChange={(e) => updateSpecialNotes(e.target.value)} placeholder="Örn: Acil durumlar için 24 saat ulaşılabilir" className="slf-textarea" rows={2} maxLength={80} />
          <div className="slf-char-count"><span>{(formData.working_hours.special_notes || '').length}/80</span></div>
        </div>
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="slf-step-content">
      <h2 className="slf-step-title">Konum</h2>
      <p className="slf-step-desc">Hizmet verdiğiniz konumu seçin</p>

      <div className="slf-row">
        <div className="slf-field">
          <label className="slf-label">İl <span className="slf-required">*</span></label>
          <select value={formData.city} onChange={(e) => { const c = cities.find((x) => String(x.id) === e.target.value); if (c) sessionStorage.setItem('selectedCity', c.name); updateFormData((p) => ({ ...p, city: e.target.value, district: '', neighborhood: '' })); if (errors.city) setErrors((p) => ({ ...p, city: '' })); }} className={`slf-select ${errors.city ? 'slf-select--error' : ''}`}>
            <option value="">İl Seçin</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {errors.city && <span className="slf-error">{errors.city}</span>}
        </div>

        <div className="slf-field">
          <label className="slf-label">İlçe <span className="slf-required">*</span></label>
          <select value={formData.district} onChange={(e) => { const d = districts.find((x) => String(x.id) === e.target.value); if (d) sessionStorage.setItem('selectedDistrict', d.name); updateFormData((p) => ({ ...p, district: e.target.value, neighborhood: '' })); if (errors.district) setErrors((p) => ({ ...p, district: '' })); }} className={`slf-select ${errors.district ? 'slf-select--error' : ''}`} disabled={!formData.city}>
            <option value="">İlçe Seçin</option>
            {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          {errors.district && <span className="slf-error">{errors.district}</span>}
        </div>
      </div>

      <div className="slf-field">
        <label className="slf-label">Mahalle</label>
        <select value={formData.neighborhood} onChange={(e) => { const n = neighborhoods.find((x) => x.id === e.target.value); if (n) sessionStorage.setItem('selectedNeighborhood', n.name); updateFormData((p) => ({ ...p, neighborhood: e.target.value })); }} className="slf-select" disabled={!formData.district}>
          <option value="">Mahalle Seçin</option>
          {neighborhoods.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
        </select>
      </div>

      <div className="slf-field">
        <label className="slf-label">Hizmet Adresi</label>
        <textarea value={formData.address} onChange={(e) => updateFormData((p) => ({ ...p, address: e.target.value }))} placeholder="Hizmet verdiğiniz adresi yazın" className="slf-textarea" rows={3} maxLength={80} />
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="slf-step-content">
      <h2 className="slf-step-title">Fotoğraflar</h2>
      <p className="slf-step-desc">Hizmetinizi en iyi şekilde gösteren fotoğrafları ekleyin</p>

      {formData.images.length === 0 ? (
        <label className="slf-upload-area">
          <input type="file" accept="image/*" multiple onChange={handleImageUpload} />
          <div className="slf-upload-inner">
            <div className="slf-upload-icon">📷</div>
            <p className="slf-upload-title">Fotoğraf Ekle</p>
            <p className="slf-upload-sub">En fazla 10 fotoğraf · Maks. 5 MB / dosya</p>
          </div>
        </label>
      ) : (
        <>
          <div className="slf-image-grid">
            {formData.images.map((img, idx) => (
              <div key={img.id} className={`slf-image-item ${draggedIndex === idx ? 'slf-dragging' : ''} ${dragOverIndex === idx ? 'slf-drag-over' : ''}`} draggable onDragStart={(e) => handleDragStart(e, idx)} onDragOver={(e) => handleDragOver(e, idx)} onDrop={(e) => handleDrop(e, idx)}>
                <img src={img.url} alt={img.name} className="slf-image-img" />
                {idx === 0 && <span className="slf-image-badge">Kapak</span>}
                <div className="slf-image-overlay">
                  <button type="button" className="slf-image-del" onClick={() => removeImage(img.id)}>×</button>
                  {idx > 0 && <button type="button" className="slf-image-cover" onClick={() => moveImage(idx, 0)} title="Kapak yap">⭐</button>}
                </div>
                <span className="slf-image-num">{idx + 1}</span>
              </div>
            ))}
            {formData.images.length < 10 && (
              <label className="slf-image-add">
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} />
                <span className="slf-image-add-icon">+</span>
                <span>Ekle</span>
              </label>
            )}
          </div>
          <div className="slf-image-stats">
            <span>📸 {formData.images.length}/10</span>
            <span>💾 Maks. 5 MB / dosya</span>
          </div>
          <p className="slf-image-hint">İlk fotoğraf kapak resmi olacak · Sürükleyerek sıralayabilirsiniz</p>
        </>
      )}
      {errors.images && <span className="slf-error">{errors.images}</span>}
    </div>
  );

  const renderStep6 = () => (
    <div className="slf-step-content">
      <h2 className="slf-step-title">Hizmet Bölgeleri</h2>
      <p className="slf-step-desc">Hangi illerde hizmet veriyorsunuz?</p>

      <div className="slf-field">
        <label className="slf-label">Hizmet Verilen İller</label>
        <div className="slf-tags">
          {formData.service_areas.map((area) => (
            <span key={area} className="slf-tag">
              {area}
              <button type="button" className="slf-tag-remove" onClick={() => updateFormData((p) => ({ ...p, service_areas: p.service_areas.filter((a) => a !== area) }))}>×</button>
            </span>
          ))}
        </div>
        <div className="slf-tag-input-row">
          <select className="slf-select" onChange={(e) => {
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
      </div>
    </div>
  );

  const renderStep7 = () => (
    <div className="slf-step-content">
      <h2 className="slf-step-title">Sertifikalar</h2>
      <p className="slf-step-desc">Sertifikanız varsa ekleyin (isteğe bağlı)</p>

      {formData.certificates.length > 0 && (
        <div className="slf-cert-grid">
          {formData.certificates.map((cert, idx) => (
            <div key={idx} className="slf-cert-card">
              <div className="slf-cert-header">
                <span className="slf-cert-num">📜 Sertifika {idx + 1}</span>
                <button type="button" className="slf-remove-btn" onClick={() => {
                  const newCerts = formData.certificates.filter((_, i) => i !== idx);
                  updateFormData((p) => ({ ...p, certificates: newCerts }));
                }}>Sil</button>
              </div>
              <div className="slf-field">
                <label className="slf-label">Sertifika Adı</label>
                <input type="text" value={cert.name} onChange={(e) => {
                  const newCerts = [...formData.certificates];
                  newCerts[idx] = { ...newCerts[idx], name: e.target.value };
                  updateFormData((p) => ({ ...p, certificates: newCerts }));
                }} placeholder="Örn: Adobe Certified Expert" className="slf-input" maxLength={80} />
              </div>
              <div className="slf-field">
                <label className="slf-label">Başlık</label>
                <input type="text" value={cert.title} onChange={(e) => {
                  const newCerts = [...formData.certificates];
                  newCerts[idx] = { ...newCerts[idx], title: e.target.value };
                  updateFormData((p) => ({ ...p, certificates: newCerts }));
                }} placeholder="Sertifika detayı" className="slf-input" maxLength={80} />
              </div>
              <div className="slf-field">
                <label className="slf-label">Tarih</label>
                <input type="date" value={cert.date} onChange={(e) => {
                  const newCerts = [...formData.certificates];
                  newCerts[idx] = { ...newCerts[idx], date: e.target.value };
                  updateFormData((p) => ({ ...p, certificates: newCerts }));
                }} className="slf-input" />
              </div>
            </div>
          ))}
        </div>
      )}

      {formData.certificates.length < 10 && (
        <button type="button" className="slf-add-package-btn" onClick={() => {
          updateFormData((p) => ({ ...p, certificates: [...p.certificates, { name: '', title: '', date: new Date().toISOString().split('T')[0] }] }));
        }}>+ Sertifika Ekle</button>
      )}
    </div>
  );

  const renderStep8 = () => (
    <div className="slf-step-content">
      <h2 className="slf-step-title">Sıkça Sorulan Sorular</h2>
      <p className="slf-step-desc">Müşterilerinizin sıkça sorduğu soruları ekleyin</p>

      {formData.faq_items.map((item, idx) => (
        <div key={idx} className="slf-faq-item">
          <div className="slf-field">
            <label className="slf-label">Soru</label>
            <input type="text" value={item.question} onChange={(e) => {
              const newFaq = [...formData.faq_items];
              newFaq[idx] = { ...newFaq[idx], question: e.target.value };
              updateFormData((p) => ({ ...p, faq_items: newFaq }));
            }} placeholder="Soru yazın" className="slf-input" maxLength={80} />
          </div>
          <div className="slf-field">
            <label className="slf-label">Cevap</label>
            <textarea value={item.answer} onChange={(e) => {
              const newFaq = [...formData.faq_items];
              newFaq[idx] = { ...newFaq[idx], answer: e.target.value };
              updateFormData((p) => ({ ...p, faq_items: newFaq }));
            }} placeholder="Cevap yazın" className="slf-textarea" rows={3} maxLength={80} />
          </div>
          <button type="button" className="slf-remove-btn" onClick={() => updateFormData((p) => ({ ...p, faq_items: p.faq_items.filter((_, i) => i !== idx) }))}>Sil</button>
        </div>
      ))}

      <button type="button" className="slf-add-package-btn" onClick={() => updateFormData((p) => ({ ...p, faq_items: [...p.faq_items, { question: '', answer: '' }] }))}>+ Soru Ekle</button>
    </div>
  );

  const renderStep9 = () => (
    <div className="slf-step-content">
      <h2 className="slf-step-title">Hizmet Özellikleri</h2>
      <p className="slf-step-desc">Hizmetinizin özelliklerini seçin</p>

      {featureOptions.length > 0 ? (
        <div className="slf-features-grid">
          {featureOptions.map((feature) => {
            const isSelected = formData.service_features.includes(feature);
            return (
              <label key={feature} className={`slf-feature-checkbox ${isSelected ? 'slf-feature-checkbox--selected' : ''}`}>
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
                <span className="slf-feature-check">{isSelected ? '✓' : ''}</span>
                <span className="slf-feature-text">{feature}</span>
              </label>
            );
          })}
        </div>
      ) : (
        <div className="slf-empty-features">
          <p>Bu kategori için tanımlı özellik seçeneği bulunmamaktadır.</p>
        </div>
      )}

      {formData.service_features.length > 0 && (
        <div className="slf-selected-count">
          <span>{formData.service_features.length} özellik seçildi</span>
        </div>
      )}
    </div>
  );

  const renderStep10 = () => (
    <div className="slf-step-content">
      <h2 className="slf-step-title">Hakkında</h2>
      <p className="slf-step-desc">Kendinizi ve işinizi tanıtın</p>

      <div className="slf-field">
        <label className="slf-label">Hakkında Yazısı</label>
        <textarea
          value={formData.about_text}
          onChange={(e) => updateFormData((p) => ({ ...p, about_text: e.target.value }))}
          placeholder="Kendinizi ve işinizi tanıtın..."
          className="slf-textarea"
          rows={8}
          maxLength={800}
        />
        <div className="slf-char-count"><span>{(formData.about_text || '').length}/800</span></div>
      </div>

      <div className="slf-section-card">
        <div className="slf-section-header">
          <h3 className="slf-section-title">Müşteri İletişim Kanalları</h3>
        </div>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem', lineHeight: 1.6 }}>
          İletişim bilgileriniz (telefon, WhatsApp) hesap ayarlarınızdan değiştirilir. Bu bölüm yalnızca ilanınızda hangi kısayolların görüneceğini kontrol eder.
        </p>
        <div className="slf-channels">
          {[
            { key: 'whatsapp', label: 'WhatsApp Kısayolu', desc: 'Özet yan sütun' },
            { key: 'message', label: 'Site İçi Mesaj', desc: 'Özet + mobil alt çubuk' },
            { key: 'phone', label: 'Telefon - Hemen Ara', desc: 'Üst başlık + mobil' },
            { key: 'appointment', label: 'Randevu Al', desc: 'Üst başlık, paketler ve mobil' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="slf-channel-row">
              <div className="slf-channel-info">
                <span className="slf-channel-label">{label}</span>
                <span className="slf-channel-desc">{desc}</span>
              </div>
              <label className="slf-switch">
                <input
                  type="checkbox"
                  checked={formData.quick_action_prefs[key as keyof typeof formData.quick_action_prefs]}
                  onChange={(e) => updateFormData((p) => ({
                    ...p,
                    quick_action_prefs: { ...p.quick_action_prefs, [key]: e.target.checked }
                  }))}
                />
                <span className="slf-switch-slider"></span>
              </label>
            </div>
          ))}
        </div>
        <div className="slf-response-rate">
          <label>Yanıt süresi ifadesi:</label>
          <input
            type="text"
            value={formData.response_rate}
            onChange={(e) => updateFormData((p) => ({ ...p, response_rate: e.target.value }))}
            placeholder="örn. 1 saat"
            className="slf-input"
            maxLength={80}
          />
          <span className="slf-hint">"Genelde ... içinde yanıtlar" metninde kullanılır.</span>
        </div>
      </div>
    </div>
  );

  const stepRenderers: Record<number, () => JSX.Element> = {
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
    const step = steps[currentStep - 1];
    if (!step) return null;
    const renderer = stepRenderers[step.id];
    return renderer ? renderer() : null;
  };

  return (
    <div className="slf-container">
      <div className="slf-sidebar">
        <h2 className="slf-sidebar-title">Hizmet İlanı Oluştur</h2>
        <div className="slf-steps">
          {steps.map((s) => (
            <div key={s.id} className={`slf-step ${currentStep === s.id ? 'slf-step--active' : ''} ${currentStep > s.id ? 'slf-step--done' : ''}`}>
              <div className="slf-step-dot">{currentStep > s.id ? '✓' : s.icon}</div>
              <div className="slf-step-info">
                <span className="slf-step-label">{s.label}</span>
                <span className="slf-step-num">Adım {s.id}/{totalSteps}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="slf-main">
        <div className="slf-progress"><div className="slf-progress-fill" style={{ width: `${(currentStep / totalSteps) * 100}%` }} /></div>

        <div className="slf-content">
          {getCurrentStepRenderer()}
        </div>

        <div className="slf-actions">
          {currentStep > 1 && <button type="button" className="slf-btn slf-btn--back" onClick={handlePrev}>← Geri</button>}
          <div className="slf-actions-right">
            {currentStep < totalSteps ? (
              <button type="button" className="slf-btn slf-btn--next" onClick={handleNext}>Devam →</button>
            ) : (
              <button type="button" className="slf-btn slf-btn--submit" onClick={handleSubmit}>Önizlemeye Git →</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceListingForm;