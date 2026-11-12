import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaEdit, FaSave, FaTimes, FaPlus, FaQuestion, FaExclamationTriangle } from 'react-icons/fa';
import './ServiceFAQ.css';

const WarningModal = ({ onClose }) => {
  return createPortal(
    <div className="faq-warning-modal-overlay">
      <div className="faq-warning-modal">
        <div className="faq-warning-modal-header">
          <h3>Dikkat</h3>
        </div>
        <div className="faq-warning-modal-body">
          <p>Başlığı olmayan soruları kaydedemezsiniz. Lütfen tüm sorulara başlık ekleyin.</p>
        </div>
        <div className="faq-warning-modal-footer">
          <button className="faq-warning-ok-button" onClick={onClose}>
            Tamam
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const ServiceFAQ = ({ faq: initialFAQ, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [faq, setFAQ] = useState(initialFAQ || []);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const MAX_FAQ = 10;

  useEffect(() => {
    if (!isEditing) setFAQ(initialFAQ || []);
  }, [initialFAQ, isEditing]);

  const handleAddFAQ = () => {
    if (faq.length >= MAX_FAQ) return;
    setFAQ([
      ...faq,
      {
        question: '',
        answer: ''
      }
    ]);
  };

  const handleRemoveFAQ = (index) => {
    setFAQ(faq.filter((_, i) => i !== index));
  };

  const handleFAQChange = (index, field, value) => {
    const updatedFAQ = [...faq];
    const max = field === 'question' ? 80 : 500;
    updatedFAQ[index] = {
      ...updatedFAQ[index],
      [field]: String(value).slice(0, max)
    };
    setFAQ(updatedFAQ);
  };

  const validateFAQs = () => {
    return !faq.some(item => !item.question.trim());
  };

  const handleSave = () => {
    if (!validateFAQs()) {
      setShowWarning(true);
      return;
    }
    
    onUpdate?.(faq);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsEditing(false);
    }, 2000);
  };

  const handleCancel = () => {
    setFAQ(initialFAQ || []);
    setIsEditing(false);
  };

  const closeWarningModal = () => {
    setShowWarning(false);
  };

  return (
    <div className="service-faq-section">
      {showWarning && <WarningModal onClose={closeWarningModal} />}
      
      <div className="service-faq-header">
        <h2>Sıkça Sorulan Sorular</h2>
        <div className="service-faq-actions">
          {!isEditing ? (
            <button className="service-faq-edit-button" onClick={() => setIsEditing(true)}>
              <FaEdit />
              <span>Düzenle</span>
            </button>
          ) : (
            <>
              <button 
                className="service-faq-add-button" 
                onClick={handleAddFAQ}
                disabled={faq.length >= MAX_FAQ}
              >
                <FaPlus />
                <span>Soru Ekle ({faq.length}/{MAX_FAQ})</span>
              </button>
              <button className="service-faq-cancel-button" onClick={handleCancel}>
                <FaTimes />
                <span>İptal</span>
              </button>
              <button className="service-faq-save-button" onClick={handleSave}>
                <FaSave />
                <span>Kaydet</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="service-faq-grid">
        {faq.map((item, index) => (
          <div key={index} className="faq-item">
            {isEditing ? (
              <div className="faq-edit-form">
                <div className="faq-input-group">
                  <FaQuestion className="faq-icon" />
                  <div className="faq-inputs">
                    <input
                      type="text"
                      value={item.question}
                      onChange={(e) => handleFAQChange(index, 'question', e.target.value)}
                      placeholder="Soru yazın (En fazla 80 karakter)"
                      className={`faq-question-input ${!item.question.trim() ? 'faq-question-error' : ''}`}
                      maxLength={80}
                    />
                    <textarea
                      value={item.answer}
                      onChange={(e) => handleFAQChange(index, 'answer', e.target.value)}
                      placeholder="Cevap yazın (En fazla 500 karakter)"
                      className="faq-answer-input"
                      maxLength={500}
                      rows={3}
                    />
                  </div>
                  <button
                    className="service-faq-remove-button"
                    onClick={() => handleRemoveFAQ(index)}
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
            ) : (
              <div className="faq-display">
                <FaQuestion className="faq-icon" />
                <div className="faq-info">
                  <h3 className="faq-question">{item.question || "Soru belirtilmemiş"}</h3>
                  <p className="faq-answer">{item.answer || "Cevap belirtilmemiş"}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServiceFAQ;
