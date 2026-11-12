import React, { useState, useEffect } from 'react';
import { FiSave, FiX } from 'react-icons/fi';
import { FaEdit } from 'react-icons/fa';
import './ServiceDescription.css';

const ServiceDescription = ({ description, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState(description || '');

  useEffect(() => {
    setEditedDescription(description || '');
  }, [description]);

  const handleDescriptionChange = (e) => {
    const newText = e.target.value.slice(0, 800);
    setEditedDescription(newText);
  };

  const handleSave = () => {
    onUpdate(editedDescription);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedDescription(description || '');
    setIsEditing(false);
  };

  const charCount = (editedDescription || '').length;

  return (
    <div className="service-description-section">
      <div className="service-description-header">
        <h2>Hizmet Açıklaması</h2>
        {!isEditing && (
          <button className="edit-description" onClick={() => setIsEditing(true)}>
            <FaEdit />
            <span>Düzenle</span>
          </button>
        )}
      </div>

      <div className="service-description-content">
        {isEditing ? (
          <>
            <div className="description-input-wrapper">
              <textarea
                className="description-content-input"
                value={editedDescription}
                onChange={handleDescriptionChange}
                placeholder="Hizmetiniz hakkında detaylı bilgi verin..."
                maxLength={800}
                rows={8}
              />
              <div className="word-counter">
                <span className={charCount >= 800 ? 'limit-reached' : ''}>
                  {charCount}/800 karakter
                </span>
              </div>
            </div>
            <div className="description-actions">
              <button className="cancel-description" onClick={handleCancel}>
                <FiX />
                <span>İptal</span>
              </button>
              <button className="save-description" onClick={handleSave}>
                <FiSave />
                <span>Kaydet</span>
              </button>
            </div>
          </>
        ) : (
          <p className="description-content">{description || 'Henüz açıklama eklenmemiş.'}</p>
        )}
      </div>
    </div>
  );
};

export default ServiceDescription;
