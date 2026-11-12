import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './ServiceAreasModal.css';

const ServiceAreasModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('service-areas-modal-open');
    } else {
      document.body.classList.remove('service-areas-modal-open');
    }

    return () => {
      document.body.classList.remove('service-areas-modal-open');
    };
  }, [isOpen]);

  if (!isOpen) return null;
  
  const modalContent = (
    <div className="service-areas-modal-overlay">
      <div className="service-areas-modal-container">
        <div className="service-areas-modal-header">
          <h3>{title}</h3>
        </div>
        <p>{message}</p>
        <div className="service-areas-modal-actions">
          <button className="service-areas-modal-button service-areas-modal-cancel" onClick={onClose}>
            İptal
          </button>
          <button className="service-areas-modal-button service-areas-modal-confirm" onClick={onConfirm}>
            Tamam
          </button>
        </div>
      </div>
    </div>
  );

  // Modal'ı body'nin en altına render et
  return createPortal(modalContent, document.body);
};

export default ServiceAreasModal; 