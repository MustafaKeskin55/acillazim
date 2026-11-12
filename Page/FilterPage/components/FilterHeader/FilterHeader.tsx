"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  IoList,
  IoGridOutline,
  IoMap,
  IoFunnelOutline,
} from 'react-icons/io5';
import { MdOutlineSort } from 'react-icons/md';
import './FilterHeader.css';
import categoryService from '@/services/category/categoryService';
import { getFilterTags } from '@/services/filters/filterService';

/**
 * Filtreleme Sayfası'nın üst kısmındaki başlık ve sıralama bileşeni
 */
const FilterHeader = ({
  totalListings, sort, onSortChange, viewMode, onViewModeChange, filters, categoryId, onFilterChange, onResetFilters,
  onOpenMobileFilter, activeFilterCount = 0,
}) => {
  const [categoryTitle, setCategoryTitle] = useState('İlanlar');
  const [filterTags, setFilterTags] = useState([]);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [mountSortPortal, setMountSortPortal] = useState(false);

  // Filtre etiketlerini yükle
  useEffect(() => {
    const loadFilterTags = async () => {
      if (filters && Object.keys(filters).length > 0 && categoryId) {
        try {
          const tags = await getFilterTags(filters, categoryId);
          
          // İşlenmiş etiketler dizisini oluştur
          const processedTags = [...tags];
          
          // İlçe filtresi için özel işlem - tek filtre yerine her ilçeyi ayrı etiket yap
          const ilceTag = tags.find(tag => tag.id === 'ilce');
          
          if (ilceTag && filters.ilce && Array.isArray(filters.ilce)) {
            // Orijinal ilçe etiketini çıkar
            const tagIndex = processedTags.findIndex(tag => tag.id === 'ilce');
            if (tagIndex !== -1) {
              processedTags.splice(tagIndex, 1);
            }
            
            // Her ilçe için ayrı etiket ekle
            filters.ilce.forEach((ilceName, index) => {
              processedTags.push({
                id: `ilce_${index}`,
                label: ilceTag.label,
                value: ilceName,
                originalId: 'ilce'
              });
            });
          }
          
          // Mahalle filtresi için özel işlem - tek filtre yerine her mahalleyi ayrı etiket yap
          const mahalleTag = tags.find(tag => tag.id === 'mahalle');
          
          if (mahalleTag && filters.mahalle && Array.isArray(filters.mahalle)) {
            // Orijinal mahalle etiketini çıkar
            const tagIndex = processedTags.findIndex(tag => tag.id === 'mahalle');
            if (tagIndex !== -1) {
              processedTags.splice(tagIndex, 1);
            }
            
            // Her mahalle için ayrı etiket ekle
            filters.mahalle.forEach((mahalleName, index) => {
              processedTags.push({
                id: `mahalle_${index}`,
                label: mahalleTag.label,
                value: mahalleName,
                originalId: 'mahalle'
              });
            });
          }
          
          setFilterTags(processedTags);
        } catch (error) {
          console.error('Filtre etiketleri yüklenirken hata:', error);
        }
      } else {
        setFilterTags([]);
      }
    };

    loadFilterTags();
  }, [filters, categoryId]);

  // Kategori bilgisini API'den çekmek için useEffect kullanımı
  useEffect(() => {
    const fetchCategoryTitle = async () => {
      try {
        if (categoryId) {
          console.log('🔍 [FilterHeader] Kategori başlığı alınıyor, ID:', categoryId);
          const category = await categoryService.getCategoryById(categoryId);
          console.log('📦 [FilterHeader] Alınan kategori:', category);
          
          if (category) {
            // Veri normalize et (label -> name)
            const categoryName = category.label || category.name || 'İlanlar';
            console.log('✅ [FilterHeader] Kategori başlığı:', categoryName);
            setCategoryTitle(categoryName);
          }
        }
      } catch (error) {
        console.error('Kategori başlığı alınırken hata:', error);
      }
    };

    fetchCategoryTitle();
  }, [categoryId]);

  useEffect(() => {
    setMountSortPortal(true);
  }, []);

  useEffect(() => {
    if (!sortSheetOpen || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sortSheetOpen]);
  
  // Kategori ID'sine göre başlık belirleme
  const getCategoryTitle = () => {
    return categoryTitle;
  };
  
  // Filtre bilgilerini içeren altbaşlık oluşturma
  const getFilterSubtitle = () => {
    const parts = [];
    
    if (filters.il) {
      parts.push(filters.il);
      if (filters.ilce) {
        parts.push(filters.ilce);
      }
    }
    
    if (filters.durum) {
      parts.push(filters.durum);
    }
    
    if (filters.oda) {
      parts.push(filters.oda);
    }
    
    if (filters.marka) {
      parts.push(filters.marka);
    }
    
    return parts.length > 0 ? parts.join(' - ') : '';
  };
  
  // Sıralama seçenekleri - Yeniden düzenlenmiş
  const sortOptions = [
    { value: '', label: 'Sıralama' },
    { value: 'price_desc', label: 'Fiyata göre (Önce en yüksek)' },
    { value: 'price_asc', label: 'Fiyata göre (Önce en düşük)' },
    { value: 'date_desc', label: 'Tarihe göre (Önce en yeni ilan)' },
    { value: 'date_asc', label: 'Tarihe göre (Önce en eski ilan)' },
    { value: 'address_asc', label: 'Adrese göre (A-Z)' },
    { value: 'address_desc', label: 'Adrese göre (Z-A)' }
  ];
  
  // Sıralama değişikliği
  const handleSortChange = (e) => {
    onSortChange(e.target.value);
  };
  
  // Görünüm modu değişikliği
  const handleViewModeChange = (mode) => {
    onViewModeChange(mode);
  };

  const renderViewModeControls = (variant) => {
    const viewTrio = (
      <>
        <button
          type="button"
          className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => handleViewModeChange('list')}
          aria-label="Liste Görünümü"
          aria-pressed={viewMode === 'list'}
        >
          <IoList className="filter-view-ico" aria-hidden size={20} />
        </button>
        <button
          type="button"
          className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
          onClick={() => handleViewModeChange('grid')}
          aria-label="Izgara Görünümü"
          aria-pressed={viewMode === 'grid'}
        >
          <IoGridOutline className="filter-view-ico" aria-hidden size={20} />
        </button>
        <button
          type="button"
          className={`view-mode-btn view-mode-btn--map ${viewMode === 'map' ? 'active' : ''}`}
          onClick={() => handleViewModeChange('map')}
          aria-label="Harita Görünümü"
          aria-pressed={viewMode === 'map'}
        >
          <IoMap className="filter-view-ico" aria-hidden size={20} />
        </button>
      </>
    );

    if (variant === 'mobile' && onOpenMobileFilter) {
      return (
        <div
          className="view-mode-controls view-mode-controls--mobile"
          role="toolbar"
          aria-label="Liste araçları"
        >
          <button
            type="button"
            className="view-mode-btn view-mode-btn--tool"
            onClick={onOpenMobileFilter}
            aria-label={
              activeFilterCount > 0
                ? `Filtrele, ${activeFilterCount} aktif filtre`
                : 'Filtrele'
            }
          >
            <span className="filter-m-toolbar-ico-wrap">
              <IoFunnelOutline className="filter-view-ico" aria-hidden size={22} />
              {activeFilterCount > 0 ? (
                <span className="filter-m-toolbar-badge" aria-hidden>
                  {activeFilterCount > 99 ? '99+' : activeFilterCount}
                </span>
              ) : null}
            </span>
          </button>
          <button
            type="button"
            className="view-mode-btn view-mode-btn--tool"
            onClick={() => setSortSheetOpen(true)}
            aria-label="Sırala"
          >
            <MdOutlineSort className="filter-view-ico" aria-hidden size={22} />
          </button>
          {viewTrio}
        </div>
      );
    }

    return (
      <div
        className={`view-mode-controls view-mode-controls--${variant}`}
        role="group"
        aria-label="Görünüm"
      >
        {viewTrio}
      </div>
    );
  };

  // Filtre etiketine tıklandığında filtreyi kaldır
  const handleRemoveFilter = (filterId) => {
    if (onFilterChange) {
      console.log(`Filtre kaldırılıyor: ${filterId}`); // Debug log
      
      // Aşağıdaki filtreler için özel işlemler uygula
      if (filterId === 'price-range') {
        // Fiyat aralığı etiketini kaldırırken hem min hem max kaldırılacak
        onFilterChange({
          fiyat_min: undefined,
          fiyatMin: undefined,
          fiyat_max: undefined,
          fiyatMax: undefined,
          para_birimi: undefined
        });
        return;
      }
      else if (filterId === 'fiyat_min' || filterId === 'fiyatMin') {
        // Sadece minimum fiyat kaldırılacak
        onFilterChange({
          fiyat_min: undefined,
          fiyatMin: undefined
        });
        return;
      }
      else if (filterId === 'fiyat_max' || filterId === 'fiyatMax') {
        // Sadece maksimum fiyat kaldırılacak
        onFilterChange({
          fiyat_max: undefined,
          fiyatMax: undefined
        });
        return;
      }
      else if (filterId === 'net_m2_min') {
        // Sadece minimum m2 kaldırılacak
        onFilterChange({
          net_m2_min: undefined
        });
        return;
      }
      else if (filterId === 'net_m2_max') {
        // Sadece maksimum m2 kaldırılacak
        onFilterChange({
          net_m2_max: undefined
        });
        return;
      }
      else if (filterId === 'brut_m2_min') {
        // Sadece minimum brüt m2 kaldırılacak
        onFilterChange({
          brut_m2_min: undefined
        });
        return;
      }
      else if (filterId === 'brut_m2_max') {
        // Sadece maksimum brüt m2 kaldırılacak
        onFilterChange({
          brut_m2_max: undefined
        });
        return;
      }
      else if (filterId === 'il') {
        // İl kaldırılırken ilçe de kaldırılmalı
        onFilterChange({
          il: undefined,
          ilce: undefined
        });
        return;
      }
      else if (filterId === 'ilce' || filterId.startsWith('ilce_')) {
        // İlçe_X formatında etiket mi kontrol et
        const isIndexedDistrict = filterId.startsWith('ilce_') && !isNaN(filterId.split('_').pop());
        
        if (isIndexedDistrict) {
          // ilce_X formatındaysa belirli bir ilçeyi kaldır
          const parts = filterId.split('_');
          const valueIndex = parseInt(parts.pop());
          
          if (filters.ilce && Array.isArray(filters.ilce)) {
            // Diziden belirli indeksteki elemanı çıkart
            const newDistricts = [...filters.ilce];
            const removedDistrict = filters.ilce[valueIndex]; // Kaldırılan ilçe
            newDistricts.splice(valueIndex, 1);
            
            // Kaldırılan ilçeye ait mahalleleri bul ve çıkar
            let updatedQuarters = [];
            if (filters.mahalle && Array.isArray(filters.mahalle)) {
              // Mevcut mahalleleri koru, kaldırılan ilçeye ait olanları temizle
              // Bu kısım frontend'de eksik bilgi olduğu için tam doğru çalışmayabilir,
              // backend tarafında ilçe-mahalle ilişkisi doğru kurulmalı
              // Burada basit bir filtreleme yapıyoruz, daha sonra API ile doğrulanmalı
              updatedQuarters = [...filters.mahalle];
            }
            
            // Eğer dizi boş kaldıysa ilçe filtresini tamamen kaldır
            if (newDistricts.length === 0) {
              onFilterChange({
                ilce: undefined,
                mahalle: undefined // Tüm ilçeler kaldırılınca mahalleler de kaldırılır
              });
            } else {
              // Değilse güncellenmiş diziyi gönder, mahalleleri koruyarak
              const updateFilter = {
                ilce: newDistricts
              };
              
              // Eğer hala mahalle kaldıysa ekle
              if (updatedQuarters.length > 0) {
                updateFilter.mahalle = updatedQuarters;
              }
              
              onFilterChange(updateFilter);
            }
          }
        } else {
          // İlçe kaldırılınca mahalle de kaldırılmalı çünkü mahalleler ilçeye bağımlıdır
          onFilterChange({
            ilce: undefined,
            mahalle: undefined
          });
        }
        return;
      }
      // Mahalle filtresi için özel işlem - tekil bir mahalle filtresini kaldırma
      else if (filterId === 'mahalle' || filterId.startsWith('mahalle_')) {
        // Filtrenin mahalle_X formatında olup olmadığını kontrol et (X bir index)
        const isIndexedQuarter = filterId.startsWith('mahalle_') && !isNaN(filterId.split('_').pop());
        
        if (isIndexedQuarter) {
          // mahalle_X formatındaysa belirli bir mahalleyi kaldır
          const parts = filterId.split('_');
          const valueIndex = parseInt(parts.pop());
          
          if (filters.mahalle && Array.isArray(filters.mahalle)) {
            // Diziden belirli indeksteki elemanı çıkart
            const newQuarters = [...filters.mahalle];
            newQuarters.splice(valueIndex, 1);
            
            // Eğer dizi boş kaldıysa mahalle filtresini tamamen kaldır
            if (newQuarters.length === 0) {
              onFilterChange({
                mahalle: undefined
              });
            } else {
              // Değilse güncellenmiş diziyi gönder
              onFilterChange({
                mahalle: newQuarters
              });
            }
          }
        } else {
          // Mahalle filtresi komple kaldırılıyor
        onFilterChange({
            mahalle: undefined
        });
        }
        return;
      }
      
      // Mevcut filtreleri tamamen yeni bir objeye kopyala
      // Referans değil, içerik kopyasını alıyoruz
      const updatedFilters = JSON.parse(JSON.stringify(filters));
      
      // Çoklu seçim kontrolü - eğer filterId içinde "_" varsa ve son karakter bir sayı ise
      // bu muhtemelen çoklu seçim (multi-select) etiketidir
      if (filterId.includes('_') && !isNaN(filterId.split('_').pop())) {
        const parts = filterId.split('_');
        const valueIndex = parseInt(parts.pop()); // Son elemanı indeks olarak al
        const originalId = parts.join('_'); // Geriye kalan kısmı orijinal ID olarak al
        
        // Orijinal dizi değeri var mı kontrol et
        if (updatedFilters[originalId] && Array.isArray(updatedFilters[originalId])) {
          console.log(`Çoklu seçim filtresi kaldırılıyor: ${originalId}, indeks: ${valueIndex}`);
          
          // İlgili elemanı diziden çıkar (removeAt yerine yeni dizi oluşturup atama yapalım)
          const newArray = updatedFilters[originalId].filter((_, index) => index !== valueIndex);
          
          // Eğer yeni dizi boş ise, filtreyi tamamen kaldır
          if (newArray.length === 0) {
            delete updatedFilters[originalId];
            console.log(`Çoklu seçim filtresi tamamen boşaldı, kaldırıldı: ${originalId}`);
          } else {
            // Boş değilse güncelle
            updatedFilters[originalId] = newArray;
            console.log(`Çoklu seçim filtresi güncellendi: ${originalId}, kalan eleman sayısı: ${newArray.length}`);
          }
        }
      } else {
        // Normal filtre kaldırma işlemi
        delete updatedFilters[filterId];

        // Fiyat filtreleri için özel işlem - hem snake_case hem camelCase formatlarını kontrol et
        if (filterId === 'fiyat_min' || filterId === 'fiyatMin') {
          delete updatedFilters['fiyat_min'];
          delete updatedFilters['fiyatMin'];
          
          // Eğer sadece min fiyat kaldırıldıysa ve max fiyat yoksa, para birimini de kaldır
          if (!updatedFilters['fiyat_max'] && !updatedFilters['fiyatMax']) {
            delete updatedFilters['para_birimi'];
          }
        }
        else if (filterId === 'fiyat_max' || filterId === 'fiyatMax') {
          delete updatedFilters['fiyat_max'];
          delete updatedFilters['fiyatMax'];
          
          // Eğer sadece max fiyat kaldırıldıysa ve min fiyat yoksa, para birimini de kaldır
          if (!updatedFilters['fiyat_min'] && !updatedFilters['fiyatMin']) {
            delete updatedFilters['para_birimi'];
          }
        }
        // İl filtresi kaldırılınca ilçe filtresini de kaldır
        else if (filterId === 'il') {
          delete updatedFilters['il'];
          // İl kaldırılınca ilçe de kaldırılmalı çünkü ilçeler ile bağımlıdır
          delete updatedFilters['ilce'];
          console.log('İl filtresi kaldırıldı, bağımlı olan ilçe filtresi de kaldırıldı');
        }
        // İlçe filtresi kaldırılınca sadece ilçeyi kaldır
        else if (filterId === 'ilce') {
          delete updatedFilters['ilce'];
          // Mahalle filtresini de kaldır çünkü ilçeye bağımlıdır
          delete updatedFilters['mahalle'];
          console.log('İlçe filtresi kaldırıldı, bağımlı olan mahalle filtresi de kaldırıldı');
        }

        // Eğer kaldırılan etiket fiyat ile ilgiliyse ve artık hiç fiyat filtresi kalmadıysa para birimini de kaldır
        const hasPriceFilter = 
          updatedFilters['fiyat_min'] || 
          updatedFilters['fiyatMin'] || 
          updatedFilters['fiyat_max'] || 
          updatedFilters['fiyatMax'];

        if (!hasPriceFilter && (filterId.includes('fiyat') || filterId.includes('Fiyat'))) {
          delete updatedFilters['para_birimi'];
        }

        // Fiyat filtreleri dışındaki diğer "_min" veya "_max" ile biten filtreler için ilgili diğer filtreyi de kaldır
        // Eğer fiyat filtreleri değilse, ilişkili diğer filtreyi de kaldır
        if (filterId.endsWith('_min') && !filterId.includes('fiyat') && !filterId.includes('Fiyat')) {
          const baseKey = filterId.replace('_min', '');
          const maxKey = `${baseKey}_max`;
          if (updatedFilters[maxKey]) {
            delete updatedFilters[maxKey];
            console.log(`İlişkili maximum filtre de kaldırıldı: ${maxKey}`);
          }
        } else if (filterId.endsWith('_max') && !filterId.includes('fiyat') && !filterId.includes('Fiyat')) {
          const baseKey = filterId.replace('_max', '');
          const minKey = `${baseKey}_min`;
          if (updatedFilters[minKey]) {
            delete updatedFilters[minKey];
            console.log(`İlişkili minimum filtre de kaldırıldı: ${minKey}`);
          }
        }
      }
      
      // Tüm filtreleri tek seferde güncelle
      // Kategori ID'sinin her zaman mevcut olmasını sağla
      const categoryIdValue = updatedFilters.categoryId || categoryId;

      // Eğer son filtreyi kaldırdıysak ve sadece categoryId kaldıysa, 
      // temizleme fonksiyonunu çağır (tümünü temizle ile aynı etkiyi yaratır)
      const filterKeys = Object.keys(updatedFilters).filter(k => k !== 'categoryId');

      if (filterKeys.length === 0) {
        console.log('Son filtre de kaldırıldı, resetFilters çağrılıyor...');
        
        if (onResetFilters) {
          onResetFilters(); // Tüm filtreleri temizle
          return; // İşlemi sonlandır
        } else {
          // Sadece categoryId içeren ve diğer tüm değerleri silinen yeni bir obje oluştur
          const resetFilters = { categoryId: categoryIdValue };
          console.log('ResetFilters mevcut değil, sadece categoryId ile filtrele:', resetFilters);
          
          // Filtreleri güncelle
          onFilterChange(resetFilters);
          return;
        }
      }

      // Kategori ID'sinin her zaman mevcut olmasını sağla
      updatedFilters.categoryId = categoryIdValue;

      console.log(`Filtreler güncelleniyor. Kaldırılan filtre: ${filterId}, Kalan filtre sayısı: ${filterKeys.length}`);

      onFilterChange(updatedFilters);
    }
  };

  // Tüm filtreleri temizle
  const handleClearAllFilters = () => {
    if (onResetFilters) {
      console.log('Header: Tüm filtreler temizleniyor...');
      onResetFilters();
    }
  };
  
  const sortSheet =
    mountSortPortal &&
    sortSheetOpen &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        className="filter-m-sort-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="Sıralama"
        onClick={() => setSortSheetOpen(false)}
      >
        <div className="filter-m-sort-panel" onClick={(e) => e.stopPropagation()}>
          <div className="filter-m-sort-panel-head">
            <span className="filter-m-sort-panel-title">Sırala</span>
            <button
              type="button"
              className="filter-m-sort-close"
              onClick={() => setSortSheetOpen(false)}
              aria-label="Kapat"
            >
              ×
            </button>
          </div>
          <ul className="filter-m-sort-list">
            {sortOptions.map((o) => (
              <li key={o.value || 'default'}>
                <button
                  type="button"
                  className={`filter-m-sort-list-btn ${(sort || '') === o.value ? 'is-active' : ''}`}
                  onClick={() => {
                    onSortChange(o.value);
                    setSortSheetOpen(false);
                  }}
                >
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>,
      document.body
    );

  return (
    <div className="filter-header-wrapper">
      {sortSheet}
      {/* Mobilde: tek kutuda filtre + sırala + liste/ızgara/harita ikonları */}
      {/* Başlık kısmı - tamamen bağımsız bir bölüm olarak */}
      <div className="filter-title-section">
        <div className="filter-title-container">
          <h1 className="filter-title">
            {getCategoryTitle()}
          </h1>
          <div className="filter-count">
            {totalListings > 0 ? (
              `${totalListings.toLocaleString('tr-TR')} ilan bulundu`
            ) : (
              'İlan bulunamadı'
            )}
          </div>

          {/* Aktif filtre etiketleri */}
          {filterTags.length > 0 && (
            <div className="active-filters">
              <div className="filter-tags">
                {filterTags.map(tag => {
                  // Fiyat filtresi mi kontrol et
                  const isPriceFilter = tag.id === 'fiyat' || 
                                        tag.id === 'fiyat_min' || 
                                        tag.id === 'fiyat_max' ||
                                        tag.originalId === 'fiyat' || 
                                        tag.originalId === 'fiyat_min' || 
                                        tag.originalId === 'fiyat_max' ||
                                        tag.id === 'fiyatMin' ||
                                        tag.id === 'fiyatMax';
                  
                  // Fiyat filtre türünü belirle
                  let priceFilterType = "standard";
                  if (isPriceFilter) {
                    if (tag.id === 'fiyat_min' || tag.originalId === 'fiyat_min' || tag.id === 'fiyatMin') {
                      priceFilterType = 'price-min';
                    } else if (tag.id === 'fiyat_max' || tag.originalId === 'fiyat_max' || tag.id === 'fiyatMax') {
                      priceFilterType = 'price-max';
                    } else {
                      priceFilterType = 'price';
                    }
                  }
                  
                  return (
                    <div 
                      key={tag.id} 
                      className="filter-tag"
                      data-filter-type={priceFilterType}
                      onClick={() => handleRemoveFilter(tag.id)}  // Etiket tüm alanlarına tıklama desteği ekle
                    >
                      <span className="filter-tag-label">{tag.label}</span>
                      <span className="filter-tag-value">{tag.value}</span>
                      <button 
                        type="button" 
                        className="filter-tag-remove" 
                        onClick={(e) => {
                          e.stopPropagation(); // Etiketin kendi tıklama olayını engelle
                          handleRemoveFilter(tag.id);
                        }}
                        aria-label={`${tag.label} filtresini kaldır`}
                      >
                        &times;
                      </button>
                    </div>
                  );
                })}
                {filterTags.length > 1 && (
                  <button 
                    type="button" 
                    className="clear-all-filters"
                    onClick={handleClearAllFilters}
                  >
                    Tümünü Temizle
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filtreler ve görünüm kontrolleri - ayrı bir bölüm olarak */}
      <div className="filter-header">
        <div className="filter-controls-wrapper">
          {/* Görünüm Modu ve Sıralama yan yana */}
          <div className="view-sort-controls">
            {/* Sıralama Dropdown - yeni konumu */}
            <div className="sort-container">
              <select 
                id="sort-select" 
                value={sort} 
                onChange={handleSortChange}
                className={`sort-select ${!sort || sort === '' ? 'default' : ''}`}
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            {renderViewModeControls('desktop')}
          </div>
        </div>
      </div>

      {onOpenMobileFilter && (
        <div className="filter-mobile-filters-bar">
          {renderViewModeControls('mobile')}
        </div>
      )}
    </div>
  );
};

export default FilterHeader; 