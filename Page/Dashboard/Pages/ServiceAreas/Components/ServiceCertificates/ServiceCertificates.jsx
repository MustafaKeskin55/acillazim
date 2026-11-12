import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaEdit, FaSave, FaTimes, FaPlus, FaAward } from 'react-icons/fa';
import './ServiceCertificates.css';

const WarningModal = ({ onClose }) => {
  return createPortal(
    <div className="certificate-warning-modal-overlay">
      <div className="certificate-warning-modal">
        <div className="certificate-warning-modal-header">
          <h3>Dikkat</h3>
        </div>
        <div className="certificate-warning-modal-body">
          <p>Başlığı olmayan sertifika kaydedemezsiniz. Lütfen tüm sertifikalara başlık ekleyin.</p>
        </div>
        <div className="certificate-warning-modal-footer">
          <button className="certificate-warning-ok-button" onClick={onClose}>
            Tamam
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const ServiceCertificates = ({ certificates: initialCertificates, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [certificates, setCertificates] = useState(initialCertificates || []);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const MAX_CERTIFICATES = 10;

  /** `initialCertificates` backend'den asenkron yükleniyor (bkz. ServiceEdit.jsx) — düzenleme dışındayken senkron kal. */
  useEffect(() => {
    if (!isEditing) setCertificates(initialCertificates || []);
  }, [initialCertificates, isEditing]);

  const handleAddCertificate = () => {
    if (certificates.length >= MAX_CERTIFICATES) return;
    setCertificates([
      ...certificates,
      {
        name: '',
        title: '',
        date: new Date().toISOString().split('T')[0],
      }
    ]);
  };

  const handleRemoveCertificate = (index) => {
    setCertificates(certificates.filter((_, i) => i !== index));
  };

  const handleCertificateChange = (index, field, value) => {
    const updatedCertificates = [...certificates];
    updatedCertificates[index] = {
      ...updatedCertificates[index],
      [field]: value
    };
    setCertificates(updatedCertificates);
  };

  const validateCertificates = () => {
    return !certificates.some(cert => !cert.title || !cert.title.trim());
  };

  const handleSave = () => {
    if (!validateCertificates()) {
      setShowWarning(true);
      return;
    }
    
    onUpdate?.(certificates);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsEditing(false);
    }, 2000);
  };

  const handleCancel = () => {
    setCertificates(initialCertificates || []);
    setIsEditing(false);
  };

  const closeWarningModal = () => {
    setShowWarning(false);
  };

  // Helper function to safely check if a string is empty
  const isEmpty = (str) => {
    return !str || str.trim() === '';
  };

  return (
    <div className="service-certificates-section">
      {showWarning && <WarningModal onClose={closeWarningModal} />}
      
      <div className="service-certificates-header">
        <h2>Sertifikalar</h2>
        <div className="service-certificates-actions">
          {!isEditing ? (
            <button className="service-certificates-edit-button" onClick={() => setIsEditing(true)}>
              <FaEdit />
              <span>Düzenle</span>
            </button>
          ) : (
            <>
              <button 
                className="service-certificates-add-button"
                onClick={handleAddCertificate}
                disabled={certificates.length >= MAX_CERTIFICATES}
              >
                <FaPlus />
                <span>Sertifika Ekle</span>
              </button>
              <button className="service-certificates-cancel-button" onClick={handleCancel}>
                <FaTimes />
                <span>İptal</span>
              </button>
              <button className="service-certificates-save-button" onClick={handleSave}>
                <FaSave />
                <span>Kaydet</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="service-certificates-grid">
        {certificates.map((certificate, index) => (
          <div key={index} className="certificate-item">
            {isEditing ? (
              <div className="certificate-edit-form">
                <div className="certificate-input-group">
                  <FaAward className="certificate-icon" />
                  <div className="certificate-inputs">
                    <input
                      type="text"
                      value={certificate.title || ''}
                      onChange={(e) => handleCertificateChange(index, 'title', e.target.value)}
                      placeholder="Sertifika İsmi"
                      className={`certificate-title-input ${isEmpty(certificate.title) ? 'certificate-title-error' : ''}`}
                      maxLength={80}
                    />
                    <input
                      type="text"
                      value={certificate.name || ''}
                      onChange={(e) => handleCertificateChange(index, 'name', e.target.value)}
                      placeholder="Sertifika Veren Kurum"
                      className="certificate-name-input"
                      maxLength={80}
                    />
                    <input
                      type="date"
                      value={certificate.date || new Date().toISOString().split('T')[0]}
                      onChange={(e) => handleCertificateChange(index, 'date', e.target.value)}
                      className="certificate-date-input"
                    />
                  </div>
                  <button
                    className="service-certificates-remove-button"
                    onClick={() => handleRemoveCertificate(index)}
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
            ) : (
              <div className="certificate-display">
                <FaAward className="certificate-icon" />
                <div className="certificate-info">
                  <h3 className="certificate-title">{certificate.title || "İsimsiz Sertifika"}</h3>
                  <p className="certificate-name">{certificate.name || "Kurum belirtilmemiş"}</p>
                  <span className="certificate-date">
                    {new Date(certificate.date || new Date()).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServiceCertificates; 