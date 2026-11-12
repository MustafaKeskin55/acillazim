import React, { useState, useEffect } from 'react';
import { FiSave, FiX, FiPlus, FiTrash2, FiList, FiBookOpen } from 'react-icons/fi';
import { FaEdit } from 'react-icons/fa';
import { getIconForTitle, getAllFeatures } from './ServiceFeaturesList';
import FeaturesSuggestionModal from './FeaturesSuggestionModal';
import '@/Page/ServiceDetail/ServiceDetailPage.css';
import './ServiceFeatures.css';

/** Backend `icon` alanını (JSX serileştirilemez) taşımaz — her zaman title'dan yeniden türetilir. */
const withIcons = (list) => (list || []).map((f) => ({ ...f, icon: getIconForTitle(f.title) }));

const ServiceFeatures = ({ features, onUpdate, isStatic = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedFeatures, setEditedFeatures] = useState(withIcons(features));
  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);

  useEffect(() => {
    if (!isEditing) setEditedFeatures(withIcons(features));
  }, [features, isEditing]);

  const MAX_FEATURES = 10;

  const handleFeatureChange = (index, field, value) => {
    const newFeatures = [...editedFeatures];
    if (field === 'title') {
      const clean = String(value).slice(0, 80);
      const capitalizedValue = clean.charAt(0).toUpperCase() + clean.slice(1);
      newFeatures[index] = {
        ...newFeatures[index],
        title: capitalizedValue,
        icon: getIconForTitle(capitalizedValue)
      };
    } else if (field === 'description') {
      newFeatures[index] = {
        ...newFeatures[index],
        description: String(value).slice(0, 80)
      };
    } else {
      newFeatures[index] = {
        ...newFeatures[index],
        [field]: value
      };
    }
    setEditedFeatures(newFeatures);
  };

  const handleAddFeature = () => {
    if (editedFeatures.length >= MAX_FEATURES) {
      alert(`En fazla ${MAX_FEATURES} özellik ekleyebilirsiniz.`);
      return;
    }
    
    setEditedFeatures([
      ...editedFeatures,
      {
        icon: getIconForTitle(''),
        title: '',
        description: ''
      }
    ]);
  };

  const handleRemoveFeature = (index) => {
    setEditedFeatures(editedFeatures.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const clean = editedFeatures
      .filter((f) => f.title && f.title.trim())
      .map((f) => ({
        ...f,
        title: f.title.trim().slice(0, 80),
        description: (f.description || '').trim().slice(0, 80),
      }));
    onUpdate(clean);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedFeatures(withIcons(features));
    setIsEditing(false);
  };

  const handleSuggestionSelect = (feature) => {
    if (editedFeatures.length >= MAX_FEATURES) {
      alert(`En fazla ${MAX_FEATURES} özellik ekleyebilirsiniz.`);
      return;
    }
    setEditedFeatures([
      ...editedFeatures,
      {
        ...feature,
        title: (feature.title || '').slice(0, 80),
        description: (feature.description || '').slice(0, 80),
      },
    ]);
  };

  return (
    <div className="service-detail__features service-features--mirror-detail">
      <div className="service-detail__tab-title-row service-features-section__header">
        <h3>Hizmet Özellikleri</h3>
        {!isStatic && (
          isEditing ? (
            <div className="service-detail__section-header-actions service-features-section__edit-actions">
              <button
                type="button"
                className="service-features__suggestions-btn"
                onClick={() => setIsSuggestionModalOpen(true)}
              >
                <FiBookOpen />
                <span>Öneriler</span>
              </button>
              <button type="button" className="service-features__cancel-btn" onClick={handleCancel}>
                <FiX />
                <span>İptal</span>
              </button>
              <button type="button" className="service-features__save-btn" onClick={handleSave}>
                <FiSave />
                <span>Kaydet</span>
              </button>
            </div>
          ) : (
            <button type="button" className="service-detail__owner-edit-trigger" onClick={() => setIsEditing(true)}>
              <FaEdit size={14} aria-hidden />
              <span>Düzenle</span>
            </button>
          )
        )}
      </div>

      <div className="service-features-content">
        {isEditing && !isStatic ? (
          <>
            <div className="features-grid">
              {editedFeatures.map((feature, index) => (
                <div key={index} className="feature-edit-item">
                  <div className="feature-edit-header">
                    <input
                      type="text"
                      value={feature.title}
                      onChange={(e) => handleFeatureChange(index, 'title', e.target.value)}
                      placeholder="Özellik başlığı (En fazla 80 karakter)"
                      className="feature-title-input"
                      maxLength={80}
                    />
                    <button 
                      className="remove-feature"
                      onClick={() => handleRemoveFeature(index)}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                  <textarea
                    value={feature.description}
                    onChange={(e) => handleFeatureChange(index, 'description', e.target.value)}
                    placeholder="Özellik açıklaması (En fazla 80 karakter)"
                    className="feature-description-input"
                    maxLength={80}
                    rows={2}
                  />
                </div>
              ))}
            </div>
            <button 
              className="add-feature" 
              onClick={handleAddFeature}
              disabled={editedFeatures.length >= MAX_FEATURES}
            >
              <FiPlus />
              <span>Yeni Özellik Ekle</span>
              <span className="feature-count">({editedFeatures.length}/{MAX_FEATURES})</span>
            </button>
          </>
        ) : (
          <div className="service-detail__features-grid">
            {editedFeatures.map((feature, index) => (
              <div key={index} className="service-detail__feature-item">
                <div className="service-detail__feature-icon">{feature.icon}</div>
                <div className="service-detail__feature-content">
                  <h4 className="service-detail__feature-title">{feature.title}</h4>
                  {feature.description ? (
                    <p className="service-detail__feature-description">{feature.description}</p>
                  ) : null}
                </div>
              </div>
            ))}
            {editedFeatures.length === 0 && !isEditing && !isStatic && (
              <div className="empty-features">
                <p>Henüz özellik eklenmemiş. Düzenle butonuna tıklayarak özellik ekleyebilirsiniz.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <FeaturesSuggestionModal
        isOpen={isSuggestionModalOpen}
        onClose={() => setIsSuggestionModalOpen(false)}
        onSelect={handleSuggestionSelect}
      />
    </div>
  );
};

export default ServiceFeatures;
