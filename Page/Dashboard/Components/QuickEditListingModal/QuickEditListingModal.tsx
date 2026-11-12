import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import categoryService from '@/services/category/categoryService';
import locationService from '@/services/location/locationService';
import { getFeatureOptionsForCategory } from '@/utils/serviceFilterHelper';
import { resolveImageUrl } from '@/utils/resolveImageUrl';
import styles from './QuickEditListingModal.module.css';

interface QuickEditListingModalProps {
  isOpen: boolean;
  listingId: number | string | null;
  listingTitleFallback?: string;
  onClose: () => void;
  onSaved: (updated: { title: string; price: number | null; description: string }) => void;
}

interface AttributeRow {
  key: string;
  value: string;
}

interface EditFormState {
  title: string;
  price: string;
  description: string;
  categoryId: string;
  subCategoryId: string;
  locationCity: string;
  locationDistrict: string;
  photos: string[];
  contactPhone: string;
  priceNegotiable: boolean;
  currency: string;
  attributes: AttributeRow[];
  /** Kategoriye özel hazır özellik seçenekleri (checkbox) — ör. "7/24 Hizmet", "Acil Servis". */
  selectedFeatures: string[];
}

interface CategoryOption {
  id: number;
  label: string;
}

const EMPTY_FORM: EditFormState = {
  title: '',
  price: '',
  description: '',
  categoryId: '',
  subCategoryId: '',
  locationCity: '',
  locationDistrict: '',
  photos: [],
  contactPhone: '',
  priceNegotiable: false,
  currency: 'TL',
  attributes: [],
  selectedFeatures: [],
};

function resolveV1Base(): string {
  const raw = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8080/api/v1'
  ).replace(/\/$/, '');
  // Base bazen /api/v1 ile bazen sadece host ile geliyor olabilir; her durumda /api/v1'e normalize et.
  const host = raw
    .replace(/\/api\/v1\/?$/i, '')
    .replace(/\/api\/?$/i, '');
  return `${host}/api/v1`;
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token') || localStorage.getItem('token');
}

const QuickEditListingModal: React.FC<QuickEditListingModalProps> = ({
  isOpen,
  listingId,
  listingTitleFallback,
  onClose,
  onSaved,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [form, setForm] = useState<EditFormState>(EMPTY_FORM);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [subCategories, setSubCategories] = useState<CategoryOption[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [availableFeatures, setAvailableFeatures] = useState<string[]>([]);

  // Kategori listesi (Hizmetler ana kategorisinin alt kategorileri) — modal her açıldığında
  // yeniden istenir; categoryService kendi içinde localStorage cache'i tutuyor.
  useEffect(() => {
    if (!isOpen) return;
    categoryService.getServiceCategories()
      .then((cats) => setCategories(cats.map((c) => ({ id: Number(c.category_id), label: c.label }))))
      .catch((error) => console.error('Kategoriler alınamadı:', error));
    locationService.getAllCities()
      .then(setCities)
      .catch((error) => console.error('Şehirler alınamadı:', error));
  }, [isOpen]);

  // Seçili kategoriye göre alt kategoriler
  useEffect(() => {
    if (!form.categoryId) {
      setSubCategories([]);
      return;
    }
    categoryService.getSubCategories(form.categoryId)
      .then((subs) => setSubCategories(subs.map((c) => ({ id: Number(c.category_id), label: c.label }))))
      .catch(() => setSubCategories([]));
  }, [form.categoryId]);

  // Seçili kategoriye göre hazır "Hizmet Özellikleri" seçenekleri (İlan Ver formundaki
  // getFeatureOptionsForCategory ile aynı kaynak) — kategori değişince liste güncellenir,
  // önceden seçilmiş ama artık listede olmayan özellikler otomatik elenir.
  useEffect(() => {
    if (!form.categoryId) {
      setAvailableFeatures([]);
      return;
    }
    const options = getFeatureOptionsForCategory(Number(form.categoryId));
    setAvailableFeatures(options);
    if (options.length > 0) {
      setForm((prev) => ({
        ...prev,
        selectedFeatures: prev.selectedFeatures.filter((f) => options.includes(f)),
      }));
    }
  }, [form.categoryId]);

  // Seçili şehre göre ilçeler
  useEffect(() => {
    if (!form.locationCity) {
      setDistricts([]);
      return;
    }
    locationService.getDistrictsByCity(form.locationCity)
      .then(setDistricts)
      .catch(() => setDistricts([]));
  }, [form.locationCity]);

  useEffect(() => {
    if (!isOpen || listingId === null || listingId === undefined) return;

    let cancelled = false;
    setLoading(true);
    setForm({ ...EMPTY_FORM, title: listingTitleFallback || '' });

    const token = getAuthToken();
    fetch(`${resolveV1Base()}/listings/${listingId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error(`İlan bilgileri alınamadı (${res.status})`);
        return res.json();
      })
      .then((raw) => {
        if (cancelled) return;
        const data = raw && typeof raw === 'object' && 'data' in raw ? raw.data : raw;
        const attributesMap = (data?.attributes && typeof data.attributes === 'object')
          ? (data.attributes as Record<string, string>)
          : {};
        // "features" attribute'u kategoriye özel checkbox seçimlerini virgülle ayrılmış
        // metin olarak tutuyor; diğer tüm anahtarlar serbest "Özel Özellikler" listesine gider.
        const featuresRaw = attributesMap.features;
        const selectedFeatures = featuresRaw
          ? featuresRaw.split(',').map((f) => f.trim()).filter(Boolean)
          : [];
        const attrs = Object.entries(attributesMap)
          .filter(([key]) => key !== 'features')
          .map(([key, value]) => ({ key, value: String(value) }));
        setForm({
          title: data?.title || data?.baslik || listingTitleFallback || '',
          price: data?.price ?? data?.fiyat ?? '',
          description: data?.description || data?.acikAdres || '',
          categoryId: data?.categoryId ? String(data.categoryId) : '',
          subCategoryId: data?.subCategoryId ? String(data.subCategoryId) : '',
          locationCity: data?.locationCity || data?.il || '',
          locationDistrict: data?.locationDistrict || data?.ilce || '',
          photos: Array.isArray(data?.imageUrls) ? data.imageUrls : (Array.isArray(data?.photos) ? data.photos : []),
          contactPhone: data?.contactPhone || '',
          priceNegotiable: !!(data?.priceNegotiable ?? data?.takas),
          currency: data?.currency || data?.paraBirimi || 'TL',
          attributes: attrs,
          selectedFeatures,
        });
      })
      .catch((error) => {
        console.error('İlan detayları alınırken hata:', error);
        toast.error('İlan bilgileri yüklenemedi');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, listingId, listingTitleFallback]);

  const handleUploadPhotos = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (form.photos.length + files.length > 10) {
      toast.error('En fazla 10 görsel ekleyebilirsiniz');
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/pjpeg'];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/') || (!allowedTypes.includes(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name))) {
        toast.error('Sadece JPG, JPEG, PNG veya WEBP görsel yükleyebilirsiniz');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`"${file.name}" boyutu 5 MB\'tan büyük olamaz (Maks. 5 MB/dosya)`);
        return;
      }
    }
    const token = getAuthToken();
    if (!token) {
      toast.error('Oturum bulunamadı, lütfen tekrar giriş yapın');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append('images', file));

      const res = await fetch(`${resolveV1Base()}/listings/images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error(`Görsel yüklenemedi (${res.status})`);
      const raw = await res.json();
      const uploaded: Array<{ url?: string }> = raw?.data?.images || [];
      const urls = uploaded.map((img) => img.url).filter((u): u is string => !!u);
      setForm((prev) => ({ ...prev, photos: [...prev.photos, ...urls] }));
      toast.success(`${urls.length} görsel yüklendi`);
    } catch (error) {
      console.error('Görsel yüklenirken hata:', error);
      toast.error('Görsel yüklenemedi');
    } finally {
      setUploading(false);
    }
  }, []);

  const handleRemovePhoto = (url: string) => {
    setForm((prev) => ({ ...prev, photos: prev.photos.filter((p) => p !== url) }));
  };

  const handleAttributeChange = (index: number, field: 'key' | 'value', value: string) => {
    setForm((prev) => ({
      ...prev,
      attributes: prev.attributes.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    }));
  };

  const handleAddAttribute = () => {
    setForm((prev) => ({ ...prev, attributes: [...prev.attributes, { key: '', value: '' }] }));
  };

  const handleRemoveAttribute = (index: number) => {
    setForm((prev) => ({ ...prev, attributes: prev.attributes.filter((_, i) => i !== index) }));
  };

  const handleToggleFeature = (feature: string) => {
    setForm((prev) => ({
      ...prev,
      selectedFeatures: prev.selectedFeatures.includes(feature)
        ? prev.selectedFeatures.filter((f) => f !== feature)
        : [...prev.selectedFeatures, feature],
    }));
  };

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!form.title || form.title.trim().length < 5) {
      toast.error('Başlık en az 5 karakter olmalı');
      return;
    }
    const token = getAuthToken();
    if (!token) {
      toast.error('Oturum bulunamadı, lütfen tekrar giriş yapın');
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description,
        priceNegotiable: form.priceNegotiable,
        currency: form.currency,
        // Fotoğraflar: dizi her zaman gönderilir; boşsa "tüm fotoğraflar kaldırıldı" anlamına gelir.
        photos: form.photos,
      };
      if (form.price !== '') {
        body.price = Number(form.price);
      }
      if (form.categoryId) {
        body.categoryId = Number(form.categoryId);
      }
      if (form.subCategoryId) {
        body.subCategoryId = Number(form.subCategoryId);
      }
      if (form.locationCity) {
        body.locationCity = form.locationCity;
      }
      if (form.locationDistrict) {
        body.locationDistrict = form.locationDistrict;
      }
      if (form.contactPhone) {
        body.contactPhone = form.contactPhone;
      }
      // Kategoriye özel hazır özellik seçimleri (checkbox'lar); virgülle ayrılmış tek bir
      // metin olarak attributes.features altına kaydedilir (İlan Ver formuyla aynı format).
      if (availableFeatures.length > 0) {
        body.features = form.selectedFeatures.join(',');
      }
      // Özel özellikler (attribute'lar) WebListingFormDTO'nun @JsonAnySetter'ı sayesinde
      // top-level alanlar olarak backend'e gönderilir (ör. {"deneyim": "5 yıl"}).
      form.attributes.forEach((row) => {
        if (row.key.trim()) {
          body[row.key.trim()] = row.value;
        }
      });

      const res = await fetch(`${resolveV1Base()}/listings/${listingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null as { message?: string } | null);
        throw new Error(errBody?.message || `İlan güncellenemedi (${res.status})`);
      }

      // Backend içerik değişikliklerini hemen yayına almıyor: admin onayına gönderiyor.
      // Onaylanana kadar ilan üzerinde eski (yayındaki) içerik gösterilmeye devam eder.
      const raw = await res.json().catch(() => null as { message?: string } | null);
      toast.success(raw?.message || 'Değişiklikleriniz admin onayına gönderildi', { duration: 5000 });
      onSaved({
        title: body.title as string,
        price: body.price !== undefined ? Number(body.price) : null,
        description: body.description as string,
      });
      onClose();
    } catch (error) {
      console.error('İlan güncellenirken hata:', error);
      toast.error(error instanceof Error ? error.message : 'İlan güncellenemedi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>İlanı Düzenle</div>

        {loading ? (
          <div className={styles.loadingText}>Yükleniyor...</div>
        ) : (
          <div className={styles.body}>
            <div className={styles.field}>
              <label htmlFor="qe-title">Başlık</label>
              <input
                id="qe-title"
                type="text"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                maxLength={100}
              />
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="qe-price">Fiyat</label>
                <input
                  id="qe-price"
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                  min={0}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="qe-currency">Para Birimi</label>
                <select
                  id="qe-currency"
                  value={form.currency}
                  onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))}
                >
                  <option value="TL">TL</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={form.priceNegotiable}
                onChange={(e) => setForm((prev) => ({ ...prev, priceNegotiable: e.target.checked }))}
              />
              Fiyat pazarlığa açık
            </label>

            <div className={styles.field}>
              <label htmlFor="qe-description">Açıklama</label>
              <textarea
                id="qe-description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                maxLength={2000}
              />
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="qe-category">Kategori</label>
                <select
                  id="qe-category"
                  value={form.categoryId}
                  onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value, subCategoryId: '' }))}
                >
                  <option value="">Seçiniz</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              {subCategories.length > 0 && (
                <div className={styles.field}>
                  <label htmlFor="qe-subcategory">Alt Kategori</label>
                  <select
                    id="qe-subcategory"
                    value={form.subCategoryId}
                    onChange={(e) => setForm((prev) => ({ ...prev, subCategoryId: e.target.value }))}
                  >
                    <option value="">Seçiniz</option>
                    {subCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="qe-city">İl</label>
                <select
                  id="qe-city"
                  value={form.locationCity}
                  onChange={(e) => setForm((prev) => ({ ...prev, locationCity: e.target.value, locationDistrict: '' }))}
                >
                  <option value="">Seçiniz</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor="qe-district">İlçe</label>
                <select
                  id="qe-district"
                  value={form.locationDistrict}
                  onChange={(e) => setForm((prev) => ({ ...prev, locationDistrict: e.target.value }))}
                  disabled={districts.length === 0}
                >
                  <option value="">Seçiniz</option>
                  {districts.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="qe-phone">İletişim Telefonu</label>
              <input
                id="qe-phone"
                type="tel"
                placeholder="Boş bırakırsanız hesap telefonunuz gösterilir"
                value={form.contactPhone}
                onChange={(e) => setForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
                maxLength={20}
              />
            </div>

            <div className={styles.field}>
              <label>Fotoğraflar</label>
              <div className={styles.photoGrid}>
                {form.photos.map((url) => (
                  <div key={url} className={styles.photoThumb}>
                    {/* form.photos içinde backend'e kaydedilecek ham (relative) URL tutulur;
                        gösterim için sadece burada backend origin'i ile çözülür. */}
                    <img src={resolveImageUrl(url)} alt="ilan görseli" />
                    <button type="button" onClick={() => handleRemovePhoto(url)} aria-label="Kaldır">×</button>
                  </div>
                ))}
                <label className={styles.photoUploadBtn}>
                  {uploading ? '...' : '+ Ekle'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    disabled={uploading}
                    onChange={(e) => handleUploadPhotos(e.target.files)}
                  />
                </label>
              </div>
            </div>

            {availableFeatures.length > 0 && (
              <div className={styles.field}>
                <label>Hizmet Özellikleri</label>
                <div className={styles.featureGrid}>
                  {availableFeatures.map((feature) => (
                    <label key={feature} className={styles.featureChip}>
                      <input
                        type="checkbox"
                        checked={form.selectedFeatures.includes(feature)}
                        onChange={() => handleToggleFeature(feature)}
                      />
                      {feature}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.field}>
              <label>Özel Özellikler</label>
              {form.attributes.map((row, index) => (
                <div key={index} className={styles.attributeRow}>
                  <input
                    type="text"
                    placeholder="Örn: Deneyim"
                    value={row.key}
                    onChange={(e) => handleAttributeChange(index, 'key', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Örn: 5 yıl"
                    value={row.value}
                    onChange={(e) => handleAttributeChange(index, 'value', e.target.value)}
                  />
                  <button type="button" onClick={() => handleRemoveAttribute(index)} aria-label="Kaldır">×</button>
                </div>
              ))}
              <button type="button" className={styles.addAttributeBtn} onClick={handleAddAttribute}>
                + Özellik ekle
              </button>
            </div>
          </div>
        )}

        <div className={styles.buttons}>
          <button className={`${styles.baseButton} ${styles.cancelButton}`} onClick={onClose} disabled={saving}>
            İptal
          </button>
          <button
            className={`${styles.baseButton} ${styles.confirmButton}`}
            onClick={handleSave}
            disabled={loading || saving}
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickEditListingModal;
