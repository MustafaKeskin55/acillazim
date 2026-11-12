import React, { useState, useEffect } from 'react';
import {
  FaCheckCircle,
  FaEdit,
  FaSave,
  FaTimes,
  FaPlus,
  FaCalendarAlt,
  FaClock,
  FaChevronRight,
  FaStar,
  FaTag,
  FaPercent
} from 'react-icons/fa';
import '@/Page/ServiceDetail/ServiceDetailPage.css';
import './ServicePricing.css';

const PRICE_TYPES = [
  { value: 'per_package', label: 'Paket Başı' },
  { value: 'one_time', label: 'Tek Seferlik' },
  { value: 'per_month', label: 'Aylık' },
  { value: 'per_hour', label: 'Saatlik' },
  { value: 'per_day', label: 'Günlük' },
];

const CURRENCIES = [
  { value: 'TRY', label: '₺ TL' },
  { value: 'USD', label: '$ USD' },
  { value: 'EUR', label: '€ EUR' },
];

const getCurrencySymbol = (curr) => {
  if (!curr) return '₺';
  const c = curr.toUpperCase();
  if (c === 'USD') return '$';
  if (c === 'EUR') return '€';
  return '₺';
};

const getPriceTypeLabel = (val) => {
  const found = PRICE_TYPES.find((t) => t.value === val);
  return found ? found.label : 'Paket Başı';
};

/** Panel modali: özet ön izlemedekiyle aynı kabuk ve düzenleme formu */
const ServicePricing = ({ pricing, onUpdate, onViewAllPackages, previewLikePublic = true }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPricing, setEditedPricing] = useState([]);
  const [newFeatureText, setNewFeatureText] = useState({});

  useEffect(() => {
    if (!isEditing) {
      const list = Array.isArray(pricing) ? pricing : [];
      setEditedPricing(
        list.map((pkg) => ({
          ...pkg,
          title: pkg.title || pkg.package_title || '',
          package_title: pkg.package_title || pkg.title || '',
          price: pkg.price != null ? String(pkg.price) : '',
          currency: pkg.currency || 'TRY',
          price_type: pkg.price_type || 'per_package',
          delivery_days: pkg.deliveryDays != null ? String(pkg.deliveryDays) : (pkg.delivery_days != null ? String(pkg.delivery_days) : ''),
          deliveryDays: pkg.deliveryDays != null ? Number(pkg.deliveryDays) : (pkg.delivery_days != null ? Number(pkg.delivery_days) : null),
          discount_percentage: pkg.discount_percentage != null ? String(pkg.discount_percentage) : '0',
          popular: Boolean(pkg.popular ?? pkg.is_popular),
          is_popular: Boolean(pkg.popular ?? pkg.is_popular),
          features: Array.isArray(pkg.features) ? [...pkg.features] : [],
        }))
      );
    }
  }, [pricing, isEditing]);

  const MAX_PACKAGES = 5;
  const MAX_FEATURES = 10;

  const handlePackageChange = (index, field, value) => {
    setEditedPricing((prev) => {
      const next = [...prev];
      const target = { ...next[index] };

      if (field === 'title' || field === 'package_title') {
        const val = String(value).slice(0, 80);
        target.title = val;
        target.package_title = val;
      } else if (field === 'description') {
        target.description = String(value).slice(0, 80);
      } else if (field === 'price') {
        const clean = String(value).replace(/\D/g, '').slice(0, 12);
        target.price = clean;
      } else if (field === 'currency') {
        target.currency = value;
      } else if (field === 'price_type') {
        target.price_type = value;
      } else if (field === 'delivery_days' || field === 'deliveryDays') {
        const clean = String(value).replace(/\D/g, '').slice(0, 4);
        target.delivery_days = clean;
        target.deliveryDays = clean ? Number(clean) : null;
      } else if (field === 'discount_percentage') {
        let clean = String(value).replace(/\D/g, '').slice(0, 3);
        if (clean && Number(clean) > 100) clean = '100';
        target.discount_percentage = clean;
      } else if (field === 'popular' || field === 'is_popular') {
        target.popular = Boolean(value);
        target.is_popular = Boolean(value);
      } else {
        target[field] = value;
      }

      next[index] = target;
      return next;
    });
  };

  const handleAddFeature = (packageIndex) => {
    const text = (newFeatureText[packageIndex] || '').trim();
    if (!text) return;
    setEditedPricing((prev) => {
      const next = [...prev];
      const target = { ...next[packageIndex] };
      const feats = Array.isArray(target.features) ? [...target.features] : [];
      if (feats.length >= MAX_FEATURES) return prev;
      feats.push(text.slice(0, 80));
      target.features = feats;
      next[packageIndex] = target;
      return next;
    });
    setNewFeatureText((prev) => ({ ...prev, [packageIndex]: '' }));
  };

  const handleRemoveFeature = (packageIndex, featureIndex) => {
    setEditedPricing((prev) => {
      const next = [...prev];
      const target = { ...next[packageIndex] };
      target.features = (target.features || []).filter((_, i) => i !== featureIndex);
      next[packageIndex] = target;
      return next;
    });
  };

  const handleAddPackage = () => {
    if (editedPricing.length >= MAX_PACKAGES) return;
    const newPackage = {
      title: '',
      package_title: '',
      description: '',
      price: '',
      currency: 'TRY',
      price_type: 'per_package',
      delivery_days: '',
      deliveryDays: null,
      discount_percentage: '0',
      popular: false,
      is_popular: false,
      features: []
    };
    setEditedPricing((prev) => [...prev, newPackage]);
  };

  const handleRemovePackage = (index) => {
    if (editedPricing.length <= 1) return;
    setEditedPricing((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    for (let i = 0; i < editedPricing.length; i++) {
      const p = editedPricing[i];
      const title = (p.title || p.package_title || '').trim();
      if (!title) {
        alert(`${i + 1}. paket başlığı zorunludur.`);
        return;
      }
    }
    const cleanPayload = editedPricing.map((p) => ({
      ...p,
      title: (p.title || p.package_title || '').trim(),
      package_title: (p.title || p.package_title || '').trim(),
      description: (p.description || '').trim(),
      price: p.price ? Number(p.price) : 0,
      currency: p.currency || 'TRY',
      price_type: p.price_type || 'per_package',
      deliveryDays: p.deliveryDays != null ? Number(p.deliveryDays) : (p.delivery_days ? Number(p.delivery_days) : null),
      delivery_days: p.deliveryDays != null ? Number(p.deliveryDays) : (p.delivery_days ? Number(p.delivery_days) : null),
      discount_percentage: Number(p.discount_percentage) || 0,
      popular: Boolean(p.popular ?? p.is_popular),
      is_popular: Boolean(p.popular ?? p.is_popular),
      features: Array.isArray(p.features) ? p.features : [],
    }));
    onUpdate?.(cleanPayload);
    setIsEditing(false);
  };

  const handleCancel = () => {
    const list = Array.isArray(pricing) ? pricing : [];
    setEditedPricing(
      list.map((pkg) => ({
        ...pkg,
        title: pkg.title || pkg.package_title || '',
        package_title: pkg.package_title || pkg.title || '',
        price: pkg.price != null ? String(pkg.price) : '',
        currency: pkg.currency || 'TRY',
        price_type: pkg.price_type || 'per_package',
        delivery_days: pkg.deliveryDays != null ? String(pkg.deliveryDays) : '',
        deliveryDays: pkg.deliveryDays != null ? Number(pkg.deliveryDays) : null,
        discount_percentage: pkg.discount_percentage != null ? String(pkg.discount_percentage) : '0',
        popular: Boolean(pkg.popular ?? pkg.is_popular),
        is_popular: Boolean(pkg.popular ?? pkg.is_popular),
        features: Array.isArray(pkg.features) ? [...pkg.features] : [],
      }))
    );
    setIsEditing(false);
  };

  const rootClass = previewLikePublic
    ? 'service-detail__packages-preview service-detail__modern-card service-pricing--mirror-detail'
    : 'service-pricing-section';

  return (
    <div className={rootClass}>
      <div className="service-detail__section-header service-pricing-section__header">
        <h3>Hizmet Paketleri</h3>
        <div className="service-detail__section-header-actions">
          {!isEditing ? (
            <>
              <button type="button" className="service-detail__owner-edit-trigger" onClick={() => setIsEditing(true)}>
                <FaEdit size={14} aria-hidden />
                <span>Düzenle</span>
              </button>
              {typeof onViewAllPackages === 'function' ? (
                <button type="button" className="service-detail__view-all-btn" onClick={onViewAllPackages}>
                  Tümünü Gör <FaChevronRight size={16} aria-hidden />
                </button>
              ) : null}
            </>
          ) : (
            <>
              <button
                type="button"
                className="service-pricing__add-package-btn"
                onClick={handleAddPackage}
                disabled={editedPricing.length >= MAX_PACKAGES}
              >
                <FaPlus />
                <span>Paket Ekle ({editedPricing.length}/{MAX_PACKAGES})</span>
              </button>
              <button type="button" className="service-pricing__cancel-btn" onClick={handleCancel}>
                <FaTimes />
                <span>İptal</span>
              </button>
              <button type="button" className="service-pricing__save-btn" onClick={handleSave}>
                <FaSave />
                <span>Kaydet</span>
              </button>
            </>
          )}
        </div>
      </div>

      {!isEditing && editedPricing.length === 0 ? (
        <p className="service-pricing-section__no-features">Henüz paket eklenmemiş.</p>
      ) : null}

      <div className="service-detail__pricing-grid service-pricing-section__grid">
        {editedPricing.map((pkg, index) => (
          <div
            key={index}
            className={`service-detail__pricing-card ${pkg.popular || pkg.is_popular ? 'popular' : ''} ${isEditing ? 'pricing-package--editing' : ''}`}
          >
            {isEditing ? (
              <div className="sp-edit-card">
                {/* Paket Üst Bar */}
                <div className="sp-edit-header">
                  <div className="sp-edit-badge">Paket {index + 1}</div>
                  <div className="sp-edit-header-actions">
                    <button
                      type="button"
                      className={`sp-btn-popular ${pkg.popular || pkg.is_popular ? 'active' : ''}`}
                      onClick={() => handlePackageChange(index, 'popular', !(pkg.popular || pkg.is_popular))}
                      title="En Popüler Paket Olarak İşaretle"
                    >
                      <FaStar size={13} />
                      <span>{pkg.popular || pkg.is_popular ? 'Popüler' : 'Öne Çıkar'}</span>
                    </button>
                    {editedPricing.length > 1 && (
                      <button
                        type="button"
                        className="sp-btn-remove"
                        onClick={() => handleRemovePackage(index)}
                        title="Paketi Sil"
                      >
                        <FaTimes size={13} />
                        <span>Sil</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Form Alanları */}
                <div className="sp-form-grid">
                  {/* Paket Başlığı */}
                  <div className="sp-field">
                    <label className="sp-label">Paket Başlığı * (En fazla 80 karakter)</label>
                    <input
                      type="text"
                      className="sp-input"
                      value={pkg.title || pkg.package_title || ''}
                      onChange={(e) => handlePackageChange(index, 'title', e.target.value)}
                      placeholder="Örn: Temel Paket"
                      maxLength={80}
                    />
                  </div>

                  {/* Paket Açıklaması */}
                  <div className="sp-field">
                    <div className="sp-label-row">
                      <label className="sp-label">Açıklama (En fazla 80 karakter)</label>
                      <span className="sp-counter">{(pkg.description || '').length}/80</span>
                    </div>
                    <input
                      type="text"
                      className="sp-input"
                      value={pkg.description || ''}
                      onChange={(e) => handlePackageChange(index, 'description', e.target.value)}
                      placeholder="Paketin kısa açıklaması"
                      maxLength={80}
                    />
                  </div>

                  {/* Fiyat ve Para Birimi */}
                  <div className="sp-field-row">
                    <div className="sp-field sp-field-grow">
                      <label className="sp-label">Fiyat (En fazla 12 hane)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="sp-input"
                        value={pkg.price != null ? String(pkg.price) : ''}
                        onChange={(e) => handlePackageChange(index, 'price', e.target.value)}
                        placeholder="0"
                        maxLength={12}
                      />
                    </div>
                    <div className="sp-field sp-field-shrink">
                      <label className="sp-label">Birim</label>
                      <select
                        className="sp-select"
                        value={pkg.currency || 'TRY'}
                        onChange={(e) => handlePackageChange(index, 'currency', e.target.value)}
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Fiyatlandırma Tipi */}
                  <div className="sp-field">
                    <label className="sp-label">Fiyatlandırma Tipi</label>
                    <select
                      className="sp-select"
                      value={pkg.price_type || 'per_package'}
                      onChange={(e) => handlePackageChange(index, 'price_type', e.target.value)}
                    >
                      {PRICE_TYPES.map((pt) => (
                        <option key={pt.value} value={pt.value}>{pt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Teslimat Süresi & İndirim */}
                  <div className="sp-field-row">
                    <div className="sp-field">
                      <label className="sp-label">Teslimat Süresi (Gün)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="sp-input"
                        value={pkg.delivery_days ?? ''}
                        onChange={(e) => handlePackageChange(index, 'delivery_days', e.target.value)}
                        placeholder="Örn: 14"
                        maxLength={4}
                      />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">İndirim Oranı (%)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="sp-input"
                        value={pkg.discount_percentage ?? ''}
                        onChange={(e) => handlePackageChange(index, 'discount_percentage', e.target.value)}
                        placeholder="0"
                        maxLength={3}
                      />
                    </div>
                  </div>

                  {/* Özellikler */}
                  <div className="sp-field">
                    <label className="sp-label">Paket Kapsamındaki Özellikler ({pkg.features?.length || 0}/{MAX_FEATURES})</label>
                    <div className="sp-tags-list">
                      {(pkg.features || []).map((feat, fi) => (
                        <span key={fi} className="sp-tag">
                          <span>{typeof feat === 'string' ? feat : (feat.title || feat.text || '')}</span>
                          <button
                            type="button"
                            className="sp-tag-remove"
                            onClick={() => handleRemoveFeature(index, fi)}
                            title="Özelliği Kaldır"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>

                    {(pkg.features?.length || 0) < MAX_FEATURES && (
                      <div className="sp-add-feature-row">
                        <input
                          type="text"
                          className="sp-input sp-feature-input"
                          value={newFeatureText[index] || ''}
                          onChange={(e) => setNewFeatureText((prev) => ({ ...prev, [index]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddFeature(index);
                            }
                          }}
                          placeholder="Özellik yazın ve Enter'a basın (En fazla 80 karakter)"
                          maxLength={80}
                        />
                        <button
                          type="button"
                          className="sp-btn-add-feature"
                          onClick={() => handleAddFeature(index)}
                        >
                          Ekle
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : previewLikePublic ? (
              <>
                {pkg.popular || pkg.is_popular ? (
                  <div className="service-detail__popular-badge">
                    <FaStar size={12} style={{ marginRight: '4px' }} /> En Popüler
                  </div>
                ) : null}
                <div className="service-detail__package-header">
                  <h4>{pkg.title || pkg.package_title}</h4>
                  <div className="service-detail__price">
                    <span className="service-detail__currency">{getCurrencySymbol(pkg.currency)}</span>
                    <span className="service-detail__amount">{String(pkg.price ?? '')}</span>
                    <span className="sp-price-type-tag">/{getPriceTypeLabel(pkg.price_type)}</span>
                  </div>
                  {pkg.deliveryDays != null && Number(pkg.deliveryDays) > 0 ? (
                    <p className="service-detail__delivery-time">
                      <FaClock size={15} aria-hidden />
                      {pkg.deliveryDays} gün teslimat
                    </p>
                  ) : null}
                  {pkg.discount_percentage != null && Number(pkg.discount_percentage) > 0 ? (
                    <div className="sp-discount-badge">
                      %{pkg.discount_percentage} İndirim
                    </div>
                  ) : null}
                </div>
                {pkg.description ? (
                  <p className="sp-preview-desc">{pkg.description}</p>
                ) : null}
                <div className="service-detail__package-features">
                  {(pkg.features || []).length > 0 ? (
                    (pkg.features || []).map((feature, fi) => (
                      <div key={fi} className="service-detail__feature">
                        <FaCheckCircle size={15} className="service-detail__check-icon" aria-hidden />
                        <span>
                          {typeof feature === 'string'
                            ? feature
                            : String((feature && feature.title) || (feature && feature.text) || '')}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="service-pricing-section__no-features">Özellik bulunmamaktadır</p>
                  )}
                </div>
                <button
                  type="button"
                  className="service-detail__select-package-btn service-detail__select-package-btn--preview-only"
                  onClick={(e) => e.preventDefault()}
                  tabIndex={-1}
                  aria-label="Önizleme: Randevu ilan sayfasında kullanılır"
                >
                  <FaCalendarAlt size={16} aria-hidden />
                  Randevu Al
                </button>
              </>
            ) : (
              <>
                <h3 className="package-title">{pkg.title || pkg.package_title}</h3>
                <div className="package-price">
                  {getCurrencySymbol(pkg.currency)}{pkg.price}
                  <span className="sp-price-type-tag">/{getPriceTypeLabel(pkg.price_type)}</span>
                </div>
                {pkg.description ? <p className="package-description">{pkg.description}</p> : null}
                <div className="package-features">
                  {pkg.features && pkg.features.length > 0 ? (
                    <ul>
                      {pkg.features.map((feature, i) => (
                        <li key={i}>
                          <FaCheckCircle className="feature-icon" />
                          <span>{typeof feature === 'string' ? feature : (feature.title || '')}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="no-features">Özellik bulunmamaktadır</p>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServicePricing;
