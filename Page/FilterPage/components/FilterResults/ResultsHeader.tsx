"use client";

import React from 'react';
import PropTypes from 'prop-types';
import './ResultsHeader.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSortUp, faSortDown } from '@fortawesome/free-solid-svg-icons';

/**
 * Filtreleme sonuç listesinin üst başlığı
 * İlan başlık, fiyat, konum ve tarih gibi sütun başlıklarını içerir
 * Tıklanabilir alanlar ile sıralama yapılabilir
 */
const ResultsHeader = ({ viewMode, sortState = {}, onSort = () => {} }) => {
  // Sıralama değiştiğinde ana bileşeni bilgilendir
  const handleSort = (field) => {
    if (!onSort) return;
    
    if (sortState.field === field) {
      // Aynı alana tıklanırsa yönü değiştir (asc -> desc -> null -> asc)
      const nextDirection = sortState.direction === 'asc' ? 'desc' : 
                           (sortState.direction === 'desc' ? null : 'asc');
      onSort(field, nextDirection);
    } else {
      // Farklı alana tıklanırsa varsayılan 'asc' ile başla
      onSort(field, 'asc');
    }
  };
  
  // Sıralama ikonunu render et - Sadece aktif sıralama varsa göster
  const renderSortIcon = (field) => {
    // Eğer bu alan için aktif bir sıralama yoksa ikon gösterme
    if (sortState.field !== field) {
      return null;
    }
    
    // Artan sıralama için yukarı ok
    if (sortState.direction === 'asc') {
      return <FontAwesomeIcon icon={faSortUp} className="sort-icon active" />;
    }
    
    // Azalan sıralama için aşağı ok
    if (sortState.direction === 'desc') {
      return <FontAwesomeIcon icon={faSortDown} className="sort-icon active" />;
    }
    
    // Sıralama kaldırıldıysa ikon gösterme
    return null;
  };

  if (viewMode === 'list') {
    return (
      <div className="results-header results-header-list">
        <div className="results-header-wrapper">
          <div className="results-header-image">
            <span className="results-header-label">Görsel</span>
          </div>
          
          <div className="results-header-title">
            <span className="results-header-label">İlan Başlığı</span>
          </div>
          
          <div className="results-header-price">
            <span 
              className="results-header-label sortable" 
              onClick={() => handleSort('price')}
            >
              Fiyat {renderSortIcon('price')}
            </span>
          </div>
          
          <div 
            className="results-header-location sortable"
            onClick={() => handleSort('location')}
          >
            <span className="results-header-label">
              İl/İlçe
              {renderSortIcon('location')}
            </span>
          </div>
          
          <div 
            className="results-header-date sortable"
            onClick={() => handleSort('date')}
          >
            <span className="results-header-label">
              Tarih
              {renderSortIcon('date')}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="results-header results-header-grid">
        <div className="results-header-wrapper">
          <div className="results-header-title">
            <span className="results-header-label">İlan Başlığı</span>
          </div>
          
          <div className="results-header-price">
            <span 
              className="results-header-label sortable" 
              onClick={() => handleSort('price')}
            >
              Fiyat {renderSortIcon('price')}
            </span>
          </div>
          
          <div 
            className="results-header-location sortable"
            onClick={() => handleSort('location')}
          >
            <span className="results-header-label">
              İl/İlçe
              {renderSortIcon('location')}
            </span>
          </div>
          
          <div 
            className="results-header-date sortable"
            onClick={() => handleSort('date')}
          >
            <span className="results-header-label">
              Tarih
              {renderSortIcon('date')}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

ResultsHeader.propTypes = {
  viewMode: PropTypes.oneOf(['list', 'grid']).isRequired,
  sortState: PropTypes.shape({
    field: PropTypes.string,
    direction: PropTypes.oneOf(['asc', 'desc'])
  }),
  onSort: PropTypes.func
};

ResultsHeader.defaultProps = {
  sortState: null,
  onSort: () => {}
};

export default ResultsHeader; 