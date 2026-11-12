import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiSearch } from 'react-icons/fi';
import { getAllFeatures } from './ServiceFeaturesList';
import '@/Page/ServiceDetail/ServiceDetailPage.css';
import './FeaturesSuggestionModal.css';

const FeaturesSuggestionModal = ({ isOpen, onClose, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredFeatures, setFilteredFeatures] = useState([]);
  const allFeatures = getAllFeatures();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSearchTerm('');
      setFilteredFeatures(allFeatures);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const filtered = allFeatures.filter(
      feature => feature.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredFeatures(filtered);
  }, [searchTerm]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="features-suggestion-modal-overlay">
      <div className="features-suggestion-modal">
        <div className="features-suggestion-modal-header">
          <h2>Önerilen Özellikler</h2>
          <button className="close-modal" onClick={onClose}>
            <FiX />
          </button>
        </div>
        <div className="features-suggestion-search">
          <div className="search-input-wrapper">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Özellik ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              autoFocus
            />
          </div>
        </div>
        <div className="features-suggestion-modal-content">
          {filteredFeatures.length > 0 ? (
            filteredFeatures.map((feature, index) => {
              const Icon = () => feature.icon;
              return (
                <div
                  key={index}
                  className="feature-suggestion-item"
                  onClick={() => {
                    onSelect(feature);
                    onClose();
                  }}
                >
                  <div className="service-detail__feature-icon">
                    <Icon />
                  </div>
                  <div className="feature-suggestion-info">
                    <h3>{feature.title}</h3>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="no-results">
              <p>Sonuç bulunamadı</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default FeaturesSuggestionModal; 