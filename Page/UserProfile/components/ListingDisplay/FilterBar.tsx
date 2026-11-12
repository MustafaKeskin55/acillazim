"use client";

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLayerGroup, faList, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import './FilterBar.css';

/**
 * İlanları filtreleme ve görünüm türünü belirleme bileşeni
 * @param {Object} filters - Mevcut filtreler
 * @param {Function} onFilterChange - Filtre değiştiğinde çağrılacak fonksiyon
 * @param {string} viewMode - Görünüm modu (grid/list)
 * @param {Function} onViewModeChange - Görünüm modu değiştiğinde çağrılacak fonksiyon
 * @param {Array} categories - Kategori listesi (API'den gelecek)
 */
const FilterBar = ({ 
  filters, 
  onFilterChange, 
  viewMode, 
  onViewModeChange,
  categories = [] // Varsayılan değer boş dizi
}) => {
  // Seçili filtreyi kaldır
  const removeFilter = (filterType) => {
    const newFilters = { ...filters };
    delete newFilters[filterType];
    onFilterChange(newFilters);
  };
  const [isSortOpen, setIsSortOpen] = useState(false);
  
  // Sıralama seçenekleri - adrese göre sıralama seçenekleri kaldırıldı
  const sortOptions = [
    { id: 'date_desc', name: 'Tarihe göre (Önce en yeni ilan)' },
    { id: 'price_desc', name: 'Fiyata göre (Önce en yüksek)' },
    { id: 'price_asc', name: 'Fiyata göre (Önce en düşük)' },
    { id: 'date_asc', name: 'Tarihe göre (Önce en eski ilan)' }
  ];
  
  // Filtreleme için varsayılan "Tüm Kategoriler" seçeneği
  const allCategoriesOption = { id: 'all', name: 'Tüm Kategoriler' };
  
  // Tüm kategorileri içeren dizi (Tüm Kategoriler + API'den gelen kategoriler)
  const displayCategories = [allCategoriesOption, ...categories];
  
  // Sıralama değişikliği
  const handleSortChange = (sortOption) => {
    onFilterChange({ ...filters, sort: sortOption });
    setIsSortOpen(false);
  };
  
  // Kategori değişikliği
  const handleCategoryChange = (category) => {
    if (category.id === 'all') {
      removeFilter('category');
    } else {
      onFilterChange({ ...filters, category: category });
    }
  };
  
  // Sıralama menüsünü aç/kapat - Toggle fonksiyonu
  const toggleSortMenu = () => {
    setIsSortOpen(!isSortOpen);
    console.log('Dropdown açılıyor/kapanıyor:', !isSortOpen);
  };
  
  // Aktif sıralama seçeneğinin adını bul
  const getActiveSortName = () => {
    const activeSort = sortOptions.find(option => option.id === (filters?.sort || 'date_desc'));
    return activeSort ? activeSort.name : 'Tarihe göre (Önce en yeni ilan)';
  };
  
  return (
    <div className="filter-bar__container">
      {/* Ana sıralama ve görünüm seçenekleri */}
      <div className="filter-bar__main">
        {/* Boş alan (sol taraf) */}
        <div className="filter-bar__spacer"></div>
        
        {/* Sağ taraftaki kontroller */}
        <div className="filter-bar__controls">
          {/* Görünüm modu seçici */}
          <div className="filter-bar__view-mode-container">
            <div className="filter-bar__view-mode-selector">
              <button 
                className={`filter-bar__view-mode-button ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => onViewModeChange('grid')}
                title="Grid Görünüm"
              >
                <FontAwesomeIcon icon={faLayerGroup} />
              </button>
              <button 
                className={`filter-bar__view-mode-button ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => onViewModeChange('list')}
                title="Liste Görünüm"
              >
                <FontAwesomeIcon icon={faList} />
              </button>
            </div>
          </div>
          
          {/* Sıralama dropdown */}
          <div className="filter-bar__sort-dropdown">
            <button 
              className="filter-bar__sort-button" 
              onClick={toggleSortMenu} 
              type="button"
            >
              {getActiveSortName()}
              <FontAwesomeIcon icon={faChevronDown} className={`filter-bar__dropdown-icon ${isSortOpen ? 'open' : ''}`} />
            </button>
            
            {isSortOpen && (
              <div className="filter-bar__dropdown-menu">
                {sortOptions.map(option => (
                  <div 
                    key={option.id} 
                    className={`filter-bar__dropdown-item ${filters.sort === option.id ? 'active' : ''}`}
                    onClick={() => handleSortChange(option.id)}
                  >
                    {option.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Kategori Filtreleme */}
      <div className="filter-bar__category-filter">
        <div className="filter-bar__category-options">
          {displayCategories.map(category => (
            <div 
              key={category.id} 
              className={`filter-bar__category-option ${filters.category === category.id ? 'active' : ''}`}
              onClick={() => handleCategoryChange(category.id)}
            >
              {category.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FilterBar;