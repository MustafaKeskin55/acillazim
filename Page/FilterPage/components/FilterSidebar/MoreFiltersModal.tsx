"use client";

import React, { useState } from 'react';
import './MoreFiltersModal.css';
import { isNumericRangeFilterType } from '@/types/realtyFilter';

const MoreFiltersModal = ({ 
  isOpen, 
  onClose, 
  categoryFilters,
  provinces,
  districts,
  selectedProvince,
  selectedDistrict,
  onProvinceChange,
  onDistrictChange,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  tradeEnabled,
  onTradeChange,
  photoEnabled,
  onPhotoChange,
  minDays,
  maxDays,
  onDaysChange,
  expandedSections = {},
  toggleSection,
  categoryFilterValues,
  handleCategoryFilterChange,
  onApply,
  onClearFilters,
  isServiceCategory
}) => {
  // useState hook'u her zaman fonksiyon component'inin en üstünde olmalı
  const [selectedCategory, setSelectedCategory] = useState(isServiceCategory ? 'location' : 'price');

  // Erken return'u buraya taşıyoruz
  if (!isOpen) return null;

  // Filtre kategorilerini dinamik olarak oluşturalım
  const filterCategories = [];
  if (!isServiceCategory) {
    filterCategories.push({ id: 'price', label: 'Fiyat' });
  }
  filterCategories.push({ id: 'location', label: 'Konum' });

  // Kategori filtreleri varsa onları da ekleyelim
  if (categoryFilters && categoryFilters.length > 0) {
    categoryFilters.forEach(filter => {
      filterCategories.push({
        id: `category_${filter.id}`,
        label: filter.label
      });
    });
  }

  // Diğer standart filtreleri ekleyelim
  if (!isServiceCategory) {
    filterCategories.push(
      { id: 'floor', label: 'Bulunduğu Kat' },
      { id: 'trade', label: 'Takas' },
      { id: 'listing_date', label: 'İlan Tarihi' },
      { id: 'photo', label: 'Fotoğraf' }
    );
  }

  // Seçili kategoriye göre içerik gösterme
  const renderCategoryContent = () => {
    switch (selectedCategory) {
      case 'price':
        return (
          <div className="mfm-category-content">
            <h3>Fiyat</h3>
            <div className="mfm-price-inputs">
              <input 
                type="text" 
                placeholder="Min" 
                value={minPrice}
                onChange={onMinPriceChange}
              />
              <span>-</span>
              <input 
                type="text" 
                placeholder="Max" 
                value={maxPrice}
                onChange={onMaxPriceChange}
              />
              <select className="mfm-currency-select">
                <option>TL</option>
                <option>USD</option>
                <option>EUR</option>
              </select>
            </div>
          </div>
        );
      
      case 'location':
        return (
          <div className="mfm-category-content">
            <h3>Konum</h3>
            <div className="mfm-location-inputs">
              <div className="mfm-select-wrapper">
                <label>İl</label>
                <select value={selectedProvince} onChange={onProvinceChange}>
                  <option value="">İl Seçiniz</option>
                  {provinces.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mfm-select-wrapper">
                <label>İlçe</label>
                <select 
                  value={selectedDistrict} 
                  onChange={onDistrictChange}
                  disabled={!selectedProvince}
                >
                  <option value="">İlçe Seçiniz</option>
                  {districts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        );
      
      case 'floor':
        // Burada katları dinamik olarak oluşturuyoruz, statik veri kullanmıyoruz
        const floors = [
          { id: 'kot_1', label: 'Kot 1' },
          { id: 'bodrum', label: 'Bodrum' },
          { id: 'zemin', label: 'Zemin' },
          { id: 'giris', label: 'Giriş' },
          { id: 'yuksek_giris', label: 'Yüksek Giriş' }
        ];
        
        // Kat numaralarını dinamik olarak oluştur
        const floorNumbers = [];
        for (let i = 1; i <= 9; i++) {
          floorNumbers.push({ id: i.toString(), label: i.toString() });
        }
        
        // Diğer katları ekle
        floors.push(...floorNumbers);
        floors.push({ id: '10_ve_uzeri', label: '10 ve üzeri' });
        floors.push({ id: 'cati', label: 'Çatı' });
        
        // 3 sütunlu bir tablo için katları bölelim
        const chunkedFloors = [];
        for (let i = 0; i < floors.length; i += 3) {
          chunkedFloors.push(floors.slice(i, i + 3));
        }
        
        return (
          <div className="mfm-category-content">
            <h3>Bulunduğu Kat</h3>
            <table className="mfm-horizontal-alignment">
              <tbody>
                {chunkedFloors.map((row, rowIndex) => (
                  <tr key={`floor-row-${rowIndex}`}>
                    {row.map(floor => (
                      <React.Fragment key={floor.id}>
                        <td style={{ width: '30px', textAlign: 'center' }}>
                          <input type="checkbox" name="floor" value={floor.id} />
                        </td>
                        <td>{floor.label}</td>
                        {/* Her sütunun sonuna boşluk ekleyelim */}
                        {floor !== row[row.length - 1] && <td style={{ width: '10px' }}></td>}
                      </React.Fragment>
                    ))}
                    {/* Satırı tamamlamak için eksik sütun varsa boş hücreler ekleyelim */}
                    {row.length < 3 && Array(3 - row.length).fill().map((_, i) => (
                      <React.Fragment key={`empty-${rowIndex}-${i}`}>
                        <td style={{ width: '30px' }}></td>
                        <td></td>
                        {i < 2 - row.length && <td style={{ width: '10px' }}></td>}
                      </React.Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'trade':
        // Takas filtresi için dinamik veriler
        const tradeOptions = [
          { id: 'Evet', label: 'Evet' },
          { id: 'Hayır', label: 'Hayır' },
          { id: 'Farketmez', label: 'Farketmez' }
        ];

        return (
          <div className="mfm-category-content">
            <h3>Takas</h3>
            <table className="mfm-horizontal-alignment">
              <tbody>
                {tradeOptions.map(option => (
                  <tr key={option.id}>
                    <td>
                      <input 
                        type="checkbox" 
                        name="trade" 
                        value={option.id} 
                        checked={tradeEnabled === option.id} 
                        onChange={() => onTradeChange({ target: { value: option.id } })}
                      />
                    </td>
                    <td>{option.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'listing_date':
        // İlan tarihi için dinamik veriler (API'den gelecek şekilde simüle ediyoruz)
        const listingDates = [
          { id: 'Son 24 Saat', label: 'Son 24 Saat' },
          { id: 'Son 3 Gün', label: 'Son 3 Gün' },
          { id: 'Son 7 Gün', label: 'Son 7 Gün' },
          { id: 'Son 30 Gün', label: 'Son 30 Gün' },
          { id: 'Farketmez', label: 'Farketmez' }
        ];

        return (
          <div className="mfm-category-content">
            <h3>İlan Tarihi</h3>
            <table className="mfm-horizontal-alignment">
              <tbody>
                {listingDates.map(date => (
                  <tr key={date.id}>
                    <td>
                      <input 
                        type="checkbox" 
                        name="listingDate" 
                        value={date.id} 
                        checked={minDays === date.id} 
                        onChange={() => onDaysChange({ target: { value: date.id } })}
                      />
                    </td>
                    <td>{date.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'photo':
        // Fotoğraf filtresi için dinamik veriler
        const photoOptions = [
          { id: 'Evet', label: 'Fotoğraflı' },
          { id: 'Hayır', label: 'Fotoğrafsız' }
        ];

        return (
          <div className="mfm-category-content">
            <h3>Fotoğraf</h3>
            <table className="mfm-horizontal-alignment">
              <tbody>
                {photoOptions.map(option => (
                  <tr key={option.id}>
                    <td>
                      <input 
                        type="checkbox" 
                        name="hasPhoto" 
                        value={option.id} 
                        checked={photoEnabled === option.id} 
                        onChange={() => onPhotoChange({ target: { value: option.id } })}
                      />
                    </td>
                    <td>{option.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        // Kategori filtreleri için (category_1, category_2, ...)
        if (selectedCategory.startsWith('category_')) {
          const filterId = selectedCategory.replace('category_', '');
          const numericId = parseInt(filterId, 10);
          const currentFilter = categoryFilters.find(f => f.id === numericId);
          
          if (!currentFilter) {
            return (
              <div className="mfm-category-content">
                <h3>Filtre bulunamadı</h3>
              </div>
            );
          }
          
          return (
            <div className="mfm-category-content">
              <h3>{currentFilter.label}</h3>
              <div className="mfm-filter-options">
                {/* Dropdown (açılır menü) tipindeki filtreler için */}
                {currentFilter.type === 'dropdown' && (
                  <div className="mfm-select-wrapper">
                    <select 
                      value={categoryFilterValues[numericId] || ''}
                      onChange={(e) => handleCategoryFilterChange(numericId, e.target.value)}
                    >
                      <option value="">Seçiniz</option>
                      {currentFilter.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Select tipindeki filtreler için - eski tip desteği devam etsin */}
                {currentFilter.type === 'select' && (
                  <div className="mfm-select-wrapper">
                    <select 
                      value={categoryFilterValues[numericId] || ''}
                      onChange={(e) => handleCategoryFilterChange(numericId, e.target.value)}
                    >
                      <option value="">Seçiniz</option>
                      {currentFilter.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Radio buton tipindeki filtreler için */}
                {currentFilter.type === 'radio' && (
                  <div className="mfm-radio-group">
                    {currentFilter.options.map((option) => (
                      <label key={option} className="mfm-radio-label">
                        <input 
                          type="radio" 
                          name={`radio_${numericId}`}
                          value={option}
                          checked={categoryFilterValues[numericId] === option}
                          onChange={(e) => handleCategoryFilterChange(numericId, e.target.value)}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                )}
                
                {/* Checkbox tipindeki filtreler için (tekli seçim şeklinde) */}
                {currentFilter.type === 'checkbox' && (
                  <div className="mfm-checkbox-group">
                    {currentFilter.options.map((option) => {
                      const isChecked = categoryFilterValues[numericId] === option;
                      
                      return (
                        <label key={option} className="mfm-checkbox-label">
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={(e) => {
                              // Eğer zaten seçiliyse ve tekrar tıklanırsa - deselect
                              if (isChecked) {
                                handleCategoryFilterChange(numericId, '');
                              } else {
                                // Yeni seçim - tekli seçim olduğu için direkt atama yapıyoruz
                                handleCategoryFilterChange(numericId, option);
                              }
                            }}
                          />
                          <span>{option}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                
                {/* Multi-select tipindeki filtreler için - normal checkbox olarak göster */}
                {currentFilter.type === 'multi-select' && (
                  <div className="mfm-checkbox-group">
                    {currentFilter.options.map((option) => {
                      const isChecked = categoryFilterValues[numericId]?.includes(option) || false;
                      
                      return (
                        <label key={option} className="mfm-checkbox-label">
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={(e) => {
                              const currentValues = categoryFilterValues[numericId] || [];
                              let newValues;
                              
                              if (e.target.checked) {
                                newValues = [...currentValues, option];
                              } else {
                                newValues = currentValues.filter(value => value !== option);
                              }
                              
                              handleCategoryFilterChange(numericId, newValues);
                            }}
                          />
                          <span>{option}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                
                {isNumericRangeFilterType(currentFilter.type) && (
                  <div className="mfm-range-wrapper">
                    <div className="mfm-range-inputs">
                      <div className="mfm-input-unit-wrapper">
                        <input 
                          type="text" 
                          placeholder="Min" 
                          value={categoryFilterValues[`${numericId}_min`] || ''}
                          onChange={(e) => handleCategoryFilterChange(numericId, e.target.value, true, 'min')}
                        />
                        <span className="mfm-input-unit">{currentFilter.unit || (currentFilter.label.includes('m²') ? 'm²' : '')}</span>
                      </div>
                      <span>-</span>
                      <div className="mfm-input-unit-wrapper">
                        <input 
                          type="text" 
                          placeholder="Max" 
                          value={categoryFilterValues[`${numericId}_max`] || ''}
                          onChange={(e) => handleCategoryFilterChange(numericId, e.target.value, true, 'max')}
                        />
                        <span className="mfm-input-unit">{currentFilter.unit || (currentFilter.label.includes('m²') ? 'm²' : '')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        }
        
        return (
          <div className="mfm-category-content">
            <h3>{filterCategories.find(c => c.id === selectedCategory)?.label || 'Filtre Seçin'}</h3>
            <p>Bu filtre içeriği henüz yüklenmedi.</p>
          </div>
        );
    }
  };

  return (
    <div className="mfm-overlay">
      <div className="mfm-modal">
        <div className="mfm-header">
          <h3>Tüm Seçenekler</h3>
          <button className="mfm-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        
        <div className="mfm-content">
          <div className="mfm-sidebar">
            <ul className="mfm-category-list">
              {filterCategories.map(category => (
                <li 
                  key={category.id}
                  className={`mfm-category-item ${selectedCategory === category.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.label}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="mfm-main-content">
            {renderCategoryContent()}
          </div>
        </div>
        
        <div className="mfm-footer">
          <button className="mfm-cancel-btn" onClick={onClose}>Vazgeç</button>
          <button className="mfm-clear-btn" onClick={onClearFilters}>Temizle</button>
          <button className="mfm-apply-btn" onClick={() => {
            onApply();
            onClose();
          }}>Ara</button>
        </div>
      </div>
    </div>
  );
};

export default MoreFiltersModal; 