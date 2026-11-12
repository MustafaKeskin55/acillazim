"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import './FilterSidebar.css';
import { getFilterOptions } from "@/services/filters/filterService";
import MoreFiltersModal from "./MoreFiltersModal";
import ReactDOM from 'react-dom';
import CategoryTreeView from './Categorytree/CategoryTreeView';
import {
  isNumericRangeFilterType,
  type AdaptedDynamicFilter,
  type CategoryFilterValuesMap,
} from '@/types/realtyFilter';

// Konum servisini kullan
import locationService from '@/services/location/locationService';
// Kategori ağacı - gerçek BE'ye bağlı (categoryService üzerinden)
import { findCategoryPath, getSubCategories as fetchSubCategories } from '@/services/filters/categoryTreeService';

// İkon importları - bu projenizde kullanılabilir ya da kaldırılabilir
// import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
// import { MdLocationOn } from 'react-icons/md';
// import { RiExchangeLine, RiMoneyDollarCircleLine } from 'react-icons/ri';
// import { BsCalendarDate, BsCamera } from 'react-icons/bs';

// Yardımcı fonksiyon - Url parametresi için güvenli string oluştur
const makeUrlSafe = (str) => {
  if (!str) return '';
  return str.toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

// İlçeler için özel dropdown komponenti
const CheckboxDropdown = ({ label, options, selectedValues, onChange, disabled, showType = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const prevSelectedValues = useRef(selectedValues);

  // Dropdown dışına tıklandığında kapanması için
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Seçili değerleri takip et ve değişimini dışarıdan algıla
  useEffect(() => {
    // Eğer seçili değerler dışarıdan değiştiyse (FilterHeader'dan kaldırma gibi)
    if (JSON.stringify(prevSelectedValues.current) !== JSON.stringify(selectedValues)) {
      prevSelectedValues.current = selectedValues;
    }
  }, [selectedValues]);

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchTerm(''); // Dropdown açıldığında arama terimini sıfırla
      }
    }
  };

  const handleCheckboxChange = (value) => {
    const newSelectedValues = [...selectedValues];
    
    if (newSelectedValues.includes(value)) {
      // Eğer zaten seçiliyse, seçimi kaldır
      const index = newSelectedValues.indexOf(value);
      newSelectedValues.splice(index, 1);
    } else {
      // Değilse, seçime ekle
      newSelectedValues.push(value);
    }
    
    onChange(newSelectedValues);
  };

  // Arama terimine göre seçenekleri filtrele
  const filteredOptions = options.filter(option => 
    option.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fs-filter-item">
      <label>{label}</label>
      <div className="fs-dropdown-container" ref={dropdownRef}>
        <div 
          className={`fs-dropdown-header ${disabled ? 'disabled' : ''}`} 
          onClick={toggleDropdown}
        >
          <div className="fs-dropdown-selected">
            {selectedValues.length === 0 
              ? `${label} Seçiniz` 
              : `${selectedValues.length} ${label} seçildi`}
          </div>
          <div className="fs-dropdown-arrow">▼</div>
        </div>
        
        {isOpen && !disabled && (
          <div className="fs-dropdown-menu">
            {/* Arama kutusu */}
            <div className="fs-dropdown-search">
              <input
                type="text"
                placeholder={`${label} Ara...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()} // Tıklandığında dropdown kapanmasın
              />
            </div>
            
            {options.length === 0 ? (
              <div className="fs-dropdown-empty">Önce il ve ilçe seçimi yapınız</div>
            ) : filteredOptions.length === 0 ? (
              <div className="fs-dropdown-empty">Arama sonucu bulunamadı</div>
            ) : (
              filteredOptions.map((option) => (
                <div key={option.id} className="fs-dropdown-item">
                  <label className="fs-checkbox-label">
                    <input
                      type="checkbox"
                      className="fs-sidebar-checkbox"
                      checked={selectedValues.some(val => val.toString() === option.id.toString())}
                      onChange={() => handleCheckboxChange(option.id.toString())}
                    />
                    <span>
                      {option.name} {showType && option.typeLabel && `(${option.typeLabel})`}
                    </span>
                  </label>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const FilterSidebar = ({ onFilterChange, initialFilters, isLoading, categoryId, onResetFilters, onMobilePanelClose, isServiceCategoryProp }) => {
  // const { selectedCategory } = useCategory();
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [quarters, setQuarters] = useState([]); // Mahalleler için yeni state
  
  // İl için tek seçim (province değiştiğinde ilçe ve mahalleler de değişeceği için)
  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  
  // İlçe ve mahalleler için çoklu seçim
  const [selectedDistrictIds, setSelectedDistrictIds] = useState([]);
  const [selectedQuarterIds, setSelectedQuarterIds] = useState([]);
  
  // Seçilen değerlerin görüntüleme isimlerini tutmak için
  const [selectedProvinceName, setSelectedProvinceName] = useState('');
  const [selectedDistrictNames, setSelectedDistrictNames] = useState([]);
  const [selectedQuarterNames, setSelectedQuarterNames] = useState([]);

  const [currency, setCurrency] = useState('TL');
  const [minPrice, setMinPrice] = useState(initialFilters?.fiyatMin || '');
  const [maxPrice, setMaxPrice] = useState(initialFilters?.fiyatMax || '');
  const [minPriceFormatted, setMinPriceFormatted] = useState('');
  const [maxPriceFormatted, setMaxPriceFormatted] = useState('');
  const [tradeable, setTradeable] = useState(initialFilters?.takas || '');
  const [hasPhoto, setHasPhoto] = useState(initialFilters?.fotograf || '');
  const [listingDate, setListingDate] = useState(initialFilters?.ilan_tarihi || '');
  const [rating, setRating] = useState(initialFilters?.rating || '');
  
  // Kategori filtrelerini tutacak state (realty_filter.json / API → adaptFilterFromJson)
  const [categoryFilters, setCategoryFilters] = useState<AdaptedDynamicFilter[]>([]);
  const [categoryFilterValues, setCategoryFilterValues] = useState<CategoryFilterValuesMap>({});
  // Varsayılan filtreler ve daha fazla seçenek filtreleri için ayrı stateler
  const [defaultFilters, setDefaultFilters] = useState([]);
  const [moreOptionsFilters, setMoreOptionsFilters] = useState([]);
  
  // Hangi bölümlerin açık olacağını belirleyen state
  const [expandedSections, setExpandedSections] = useState({
    category: true, // Varsayılan olarak açık
    location: true,
    price: true,
    trade: false,
    date: false,
    photo: false,
    // Kategori filtreleri başlangıçta kapalı olsun
    categoryFilters: false
  });
  
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false);
  const [isPriceFilterOpen, setPriceFilterOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  
  // State tanımlamalarına ekle:
  const [currentCategory, setCurrentCategory] = useState(null);
  const [categoryPath, setCategoryPath] = useState([]);
  const isServiceCategory = isServiceCategoryProp !== undefined ? isServiceCategoryProp : (categoryPath.some(cat => (cat.id && Number(cat.id) === 12540) || cat.name === 'Hizmetler') || Number(categoryId) === 12540);
  
  // Kategori ile ilgili durumları tanımla
  const [currentCategoryId, setCurrentCategoryId] = useState(categoryId);
  
  useEffect(() => {
    // categoryId değiştiğinde güncelle
    if (categoryId) {
      setCurrentCategoryId(categoryId);
    }
  }, [categoryId]);
  
  // initialFilters değişikliklerini takip et ve sidebar'daki seçimleri güncelle
  useEffect(() => {
    if (initialFilters) {
      // İl seçimini güncelle
      setSelectedProvinceId(initialFilters.il && initialFilters.il.id ? initialFilters.il.id.toString() : '');
      setSelectedProvinceName(initialFilters.il?.name || '');
      
      // İlçe ve mahalle seçimlerini güncelle (çoklu seçim için)
      if (initialFilters.ilceler && Array.isArray(initialFilters.ilceler)) {
        const districtIds = initialFilters.ilceler.map(d => d.id ? d.id.toString() : '').filter(id => id !== '');
        const districtNames = initialFilters.ilceler.map(d => d.name || '').filter(name => name !== '');
        
        setSelectedDistrictIds(districtIds);
        setSelectedDistrictNames(districtNames);
      } else if (initialFilters.ilce) {
        // Geriye dönük uyumluluk için eski formattan okuma
        const ilceId = initialFilters.ilce.id ? initialFilters.ilce.id.toString() : '';
        const ilceName = initialFilters.ilce.name || '';
        
        if (ilceId) setSelectedDistrictIds([ilceId]);
        if (ilceName) setSelectedDistrictNames([ilceName]);
      } else {
        setSelectedDistrictIds([]);
        setSelectedDistrictNames([]);
      }
      
      // Mahalle seçimlerini güncelle
      if (initialFilters.mahalleler && Array.isArray(initialFilters.mahalleler)) {
        const quarterIds = initialFilters.mahalleler.map(m => m.id ? m.id.toString() : '').filter(id => id !== '');
        const quarterNames = initialFilters.mahalleler.map(m => m.name || '').filter(name => name !== '');
        
        setSelectedQuarterIds(quarterIds);
        setSelectedQuarterNames(quarterNames);
      } else if (initialFilters.mahalle) {
        // Geriye dönük uyumluluk için eski formattan okuma
        const mahalleId = initialFilters.mahalle.id ? initialFilters.mahalle.id.toString() : '';
        const mahalleName = initialFilters.mahalle.name || '';
        
        if (mahalleId && mahalleName) {
          setSelectedQuarterIds([mahalleId]);
          setSelectedQuarterNames([mahalleName]);
        } else if (typeof initialFilters.mahalle === 'string') {
          // Eski format: sadece string olarak mahalle adı
          // Bu durumda id bilinmiyor, sadece isim var
          const matchingQuarter = quarters.find(q => 
            q.name.toLocaleUpperCase('tr-TR') === initialFilters.mahalle.toLocaleUpperCase('tr-TR')
          );
          
          if (matchingQuarter) {
            setSelectedQuarterIds([matchingQuarter.id.toString()]);
            setSelectedQuarterNames([matchingQuarter.name]);
          }
        }
      } else {
        setSelectedQuarterIds([]);
        setSelectedQuarterNames([]);
      }
      
      // Fiyat filtrelerini güncelle
      setMinPrice(initialFilters.fiyatMin || '');
      setMaxPrice(initialFilters.fiyatMax || '');
      
      // Fiyat formatlarını güncelle
      const formattedMin = initialFilters.fiyatMin ? formatCurrency(initialFilters.fiyatMin.toString()) : '';
      const formattedMax = initialFilters.fiyatMax ? formatCurrency(initialFilters.fiyatMax.toString()) : '';
      setMinPriceFormatted(formattedMin);
      setMaxPriceFormatted(formattedMax);
      
      // Diğer temel filtreleri güncelle
      setTradeable(initialFilters.takas || '');
      setListingDate(initialFilters.ilan_tarihi || '');
      setHasPhoto(initialFilters.fotograf || '');
      setRating(initialFilters.rating || '');
      
      // Kategori filtreleri henüz yüklenmemişse güncelleme yapma
      if (categoryFilters && categoryFilters.length > 0) {
        // Kategori filtrelerini güncelle
        const updatedCategoryValues = { ...categoryFilterValues };
        
        categoryFilters.forEach(filter => {
          if (filter.db_field) {
            // Min/max aralığı (range veya emlak.json'daki price = m² aralığı)
            if (isNumericRangeFilterType(filter.type)) {
              const minKey = `${filter.db_field}_min`;
              const maxKey = `${filter.db_field}_max`;
              
              updatedCategoryValues[`${filter.id}_min`] = initialFilters[minKey] || '';
              updatedCategoryValues[`${filter.id}_max`] = initialFilters[maxKey] || '';
            } 
            // Multi-select için
            else if (filter.type === 'multi-select' && Array.isArray(categoryFilterValues[filter.id])) {
              updatedCategoryValues[filter.id] = initialFilters[filter.db_field] || [];
            }
            // Diğer filtre tipleri
            else {
              updatedCategoryValues[filter.id] = initialFilters[filter.db_field] || '';
            }
          }
        });
        
        setCategoryFilterValues(updatedCategoryValues);
      }
      
      console.log('FilterSidebar: Form elemanları initialFilters değişimiyle güncellendi');
    }
  }, [initialFilters, categoryFilters]);
  
  // Filtrelerin dışarıdan değişmesi (Header'dan kaldırma vb) durumunda formu güncelle
  useEffect(() => {
    // Eğer props olarak gelen filtreler ile bileşen state'i uyumsuz ise, state'i güncelle
    // Örneğin kullanıcı filtre etiketindeki X'e tıkladığında FilterHeader'dan filtre kaldırılır

    // Kontrol 1: Fiyat filtreleri
    const hasFiyatMinFilter = initialFilters.fiyat_min || initialFilters.fiyatMin;
    const hasFiyatMaxFilter = initialFilters.fiyat_max || initialFilters.fiyatMax;
    
    // Eğer filtre yoksa ve bizde değer varsa, sıfırlayalım
    if (!hasFiyatMinFilter && minPrice) {
      setMinPrice('');
      setMinPriceFormatted('');
    }
    
    if (!hasFiyatMaxFilter && maxPrice) {
      setMaxPrice('');
      setMaxPriceFormatted('');
    }
    
    // Para birimi kontrolü
    if (initialFilters.para_birimi && currency !== initialFilters.para_birimi) {
      setCurrency(initialFilters.para_birimi);
    } else if (!initialFilters.para_birimi && currency !== 'TL' && !hasFiyatMinFilter && !hasFiyatMaxFilter) {
      // Eğer para birimi filtresi artık yoksa ve fiyat filtreleri de yoksa, TL'ye dön
      setCurrency('TL');
    }

    // Kontrol 2: Diğer filtreler (takas, ilan tarihi, fotoğraf vb)
    if (initialFilters.takas !== undefined) {
      if (tradeable !== initialFilters.takas) {
        setTradeable(initialFilters.takas);
      }
    } else if (tradeable) {
      // Filtre yoksa ve bizde değer varsa, sıfırla
      setTradeable('');
    }
    
    if (initialFilters.ilan_tarihi !== undefined) {
      if (listingDate !== initialFilters.ilan_tarihi) {
        setListingDate(initialFilters.ilan_tarihi);
      }
    } else if (listingDate) {
      // Filtre yoksa ve bizde değer varsa, sıfırla
      setListingDate('');
    }
    
    if (initialFilters.fotograf !== undefined) {
      if (hasPhoto !== initialFilters.fotograf) {
        setHasPhoto(initialFilters.fotograf);
      }
    } else if (hasPhoto) {
      // Filtre yoksa ve bizde değer varsa, sıfırla
      setHasPhoto('');
    }

    if (initialFilters.rating !== undefined) {
      if (rating !== initialFilters.rating) {
        setRating(initialFilters.rating);
      }
    } else if (rating) {
      setRating('');
    }

    // İl kontrolü
    if (initialFilters.il !== undefined) {
      const ilId = initialFilters.il && initialFilters.il.id;
      const ilIdString = ilId ? ilId.toString() : '';
      if (selectedProvinceId !== ilIdString) {
        setSelectedProvinceId(ilIdString);
        setSelectedProvinceName(initialFilters.il && initialFilters.il.name ? initialFilters.il.name : '');
      }
    } else if (selectedProvinceId) {
      // Filtre yoksa ve bizde değer varsa, sıfırla
      setSelectedProvinceId('');
      setSelectedProvinceName('');
    }
    
    // İlçe kontrolü (çoklu seçim)
    if (initialFilters.ilceler === undefined && initialFilters.ilce === undefined && selectedDistrictIds.length > 0) {
      // Filtre yoksa ve bizde değer varsa, sıfırla
      setSelectedDistrictIds([]);
      setSelectedDistrictNames([]);
    }
    
    // Mahalle kontrolü (çoklu seçim)
    if (initialFilters.mahalleler === undefined && initialFilters.mahalle === undefined && selectedQuarterIds.length > 0) {
      // Filtre yoksa ve bizde değer varsa, sıfırla
      setSelectedQuarterIds([]);
      setSelectedQuarterNames([]);
    }
    
  }, [initialFilters]);
  
  // İlçe filtrelerini senkronize et
  useEffect(() => {
    // Eğer initialFilters yoksa işlem yapma
    if (!initialFilters) return;
    
    // İlçe filtresi tamamen kaldırıldıysa
    if (initialFilters.ilce === undefined) {
      // İlçe seçimlerini sıfırla
      setSelectedDistrictIds([]);
      setSelectedDistrictNames([]);
      return;
    }
    
    // İlçe filtresi dizi ise (FilterHeader'dan gelen formatta)
    if (Array.isArray(initialFilters.ilce)) {
      // Districts listesi yüklendiyse
      if (districts.length > 0) {
        // İlçe isimlerinden ID'leri bul
        const matchedDistrictIds = initialFilters.ilce.map(ilceName => {
          const district = districts.find(d => d.name === ilceName);
          return district ? district.id.toString() : null;
        }).filter(Boolean);
        
        // State'leri güncelle
        setSelectedDistrictIds(matchedDistrictIds);
        setSelectedDistrictNames(initialFilters.ilce);
      }
    } 
    // İlçe filtresi tek bir string ise 
    else if (typeof initialFilters.ilce === 'string' && initialFilters.ilce) {
      if (districts.length > 0) {
        const district = districts.find(d => d.name === initialFilters.ilce);
        if (district) {
          setSelectedDistrictIds([district.id.toString()]);
          setSelectedDistrictNames([initialFilters.ilce]);
        }
      }
    }
  }, [initialFilters.ilce, districts]);
  
  // Mahalle filtrelerini senkronize et
  useEffect(() => {
    // Eğer initialFilters yoksa işlem yapma
    if (!initialFilters) return;
    
    // Mahalle filtresi tamamen kaldırıldıysa
    if (initialFilters.mahalle === undefined) {
      // Mahalle seçimlerini sıfırla
      setSelectedQuarterIds([]);
      setSelectedQuarterNames([]);
      return;
    }
    
    // Mahalle filtresi veya string bir dizi ise (FilterHeader'dan gelen formatta)
    if (Array.isArray(initialFilters.mahalle)) {
      // Quarters listesi yüklendiyse
      if (quarters.length > 0) {
        // Mahalle isimlerinden ID'leri bul
        const matchedQuarterIds = initialFilters.mahalle.map(mahalleName => {
          const quarter = quarters.find(q => q.name === mahalleName);
          return quarter ? quarter.id.toString() : null;
        }).filter(Boolean);
        
        // State'leri güncelle
        setSelectedQuarterIds(matchedQuarterIds);
        setSelectedQuarterNames(initialFilters.mahalle);
      }
    } 
    // Mahalle filtresi tek bir string ise 
    else if (typeof initialFilters.mahalle === 'string' && initialFilters.mahalle) {
      if (quarters.length > 0) {
        const quarter = quarters.find(q => q.name === initialFilters.mahalle);
        if (quarter) {
          setSelectedQuarterIds([quarter.id.toString()]);
          setSelectedQuarterNames([initialFilters.mahalle]);
        }
      }
    }
  }, [initialFilters.mahalle, quarters]);
  
  // Bölümü aç kapa fonksiyonu
  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // İlk yüklemede il listesini al
  useEffect(() => {
    const loadProvinces = async () => {
      try {
        // ID+name içeren il listesini getir
        const provinceList = await locationService.getProvinces();
        setProvinces(provinceList);

        // initialFilters içinde il varsa, eşleşen ID'yi bul
        if (initialFilters && initialFilters.il) {
          const province = provinceList.find(p => 
            p.name.toLocaleUpperCase('tr-TR') === initialFilters.il.toLocaleUpperCase('tr-TR')
          );
          
          if (province) {
            console.log("İnitial province ID bulundu:", province.id, province.name);
            setSelectedProvinceId(province.id.toString());
            setSelectedProvinceName(province.name);
          }
        }
      } catch (error) {
        console.error("İller yüklenirken hata oluştu:", error);
      }
    };

    loadProvinces();
  }, [initialFilters]);
  
  // İl seçildiğinde ilçe listesini getir
  useEffect(() => {
    const loadDistricts = async () => {
      if (!selectedProvinceId) {
        setDistricts([]);
        setSelectedDistrictIds([]);
        setSelectedDistrictNames([]);
        return;
      }

      try {
        // ID+name içeren ilçe listesini getir
        const districtsList = await locationService.getDistricts(selectedProvinceId);
        setDistricts(districtsList);

        // Seçili ilçeleri kontrol et, eğer başka ile ait ilçeler varsa temizle
        if (selectedDistrictIds.length > 0) {
          const validDistrictIds = selectedDistrictIds.filter(id => {
            const exists = districtsList.some(d => d.id.toString() === id.toString());
            return exists;
          });
          
          if (validDistrictIds.length !== selectedDistrictIds.length) {
            setSelectedDistrictIds(validDistrictIds);
            
            // İsim listesini de güncelle
            const validDistrictNames = validDistrictIds.map(id => {
              const district = districtsList.find(d => d.id.toString() === id.toString());
              return district ? district.name : '';
            }).filter(name => name !== '');
            
            setSelectedDistrictNames(validDistrictNames);
            
            // İl değişince ve tüm ilçeler geçersiz olunca, mahalle seçimlerini sıfırla
            if (validDistrictIds.length === 0) {
              setSelectedQuarterIds([]);
              setSelectedQuarterNames([]);
            }
            
            // Filtreleme callback'i çağır
            if (onFilterChange) {
              const filters = {
                il: selectedProvinceName
              };
              
              // İlçeleri ekle
              if (validDistrictNames.length > 0) {
                filters.ilce = validDistrictNames;
              } else {
                filters.ilce = '';
              }
              
              // Mahalle bilgisi - eğer ilçe kalmadıysa mahalleler de kaldırılmalı
              if (validDistrictIds.length === 0) {
                filters.mahalle = '';
              } else if (selectedQuarterNames.length > 0) {
                // İlçeler değişti ama hala ilçe var, mahalle seçimlerini koru
                filters.mahalle = selectedQuarterNames;
              }
              
              onFilterChange(filters);
            }
          }
        }
      } catch (error) {
        console.error("İlçeler yüklenirken hata oluştu:", error);
      }
    };

    loadDistricts();
  }, [selectedProvinceId]);
  
  // İlçe seçildiğinde mahalle listesini getir (Tüm seçili ilçeler için)
  useEffect(() => {
    const loadQuarters = async () => {
      if (selectedDistrictIds.length === 0) {
        setQuarters([]);
        // İlçe kalmadıysa mahalleleri temizle
        setSelectedQuarterIds([]);
        setSelectedQuarterNames([]);
        return;
      }

      try {
        console.log("Mahalle listesi getiriliyor, seçili ilçe ID'leri:", selectedDistrictIds);
        
        // Yeni fonksiyonu kullanarak tek seferde tüm seçili ilçelerin mahallelerini getir
        const allQuarters = await locationService.getQuartersByMultipleDistrictIds(selectedDistrictIds);
        
        if (allQuarters.length > 0) {
          console.log("Toplam mahalle/köy sayısı:", allQuarters.length);
        } else {
          console.warn("Mahalle/köy listesi boş geldi!");
        }
        
        setQuarters(allQuarters);
        
        // Seçili mahalleleri kontrol et, eğer mevcut mahalle listesinde yoksa kaldır
        // Geçerli olanları koru
        if (selectedQuarterIds.length > 0) {
          const validQuarterIds = selectedQuarterIds.filter(id => {
            return allQuarters.some(q => q.id.toString() === id.toString());
          });
          
          if (validQuarterIds.length !== selectedQuarterIds.length) {
            setSelectedQuarterIds(validQuarterIds);
            
            // İsim listesini de güncelle
            const validQuarterNames = validQuarterIds.map(id => {
              const quarter = allQuarters.find(q => q.id.toString() === id.toString());
              return quarter ? quarter.name : '';
            }).filter(name => name !== '');
            
            setSelectedQuarterNames(validQuarterNames);
            
            // Filtreleme callback'i çağır (geçersiz mahalleler kaldırıldı)
            if (onFilterChange) {
              const filters = {
                il: selectedProvinceName
              };

              // İlçeleri ekle
              if (selectedDistrictNames.length > 0) {
                filters.ilce = selectedDistrictNames;
              }

              // Mahalleleri ekle
              if (validQuarterNames.length > 0) {
                filters.mahalle = validQuarterNames;
              } else if (selectedQuarterNames.length > 0 && validQuarterNames.length === 0) {
                // Eğer seçili mahalle vardı ama hepsi geçersiz hale geldiyse boşalt
                filters.mahalle = '';
              }
              
              onFilterChange(filters);
            }
          }
        }
      } catch (error) {
        console.error("Mahalle listesi alınamadı:", error);
        setQuarters([]);
      }
    };
    
    loadQuarters();
  }, [selectedDistrictIds]);
  
  // Mahalle seçimi değiştiğinde
  const handleQuarterChange = (e) => {
    const newQuarterId = e.target.value;
    
    // Seçilen id'ye göre mahalle/köy nesnesini bul
    const selectedQuarterObj = quarters.find(q => q.id === newQuarterId) || null;
    
    // İlgili değerleri state'e kaydet
    setSelectedQuarterIds([newQuarterId]);
    setSelectedQuarterNames([selectedQuarterObj ? selectedQuarterObj.name : '']);
    
    // Filtreleme callback'i çağır
    if (onFilterChange) {
      const filters = {
        il: selectedProvinceName
      };

      // İlçeleri ekle
      if (selectedDistrictNames.length > 0) {
        filters.ilce = selectedDistrictNames;
      }

      // Mahalleyi ekle
      if (selectedQuarterObj) {
        filters.mahalle = [selectedQuarterObj.name];
      } else {
        filters.mahalle = '';
      }
      
      onFilterChange(filters);
    }
  };
  
  // Kategori değiştiğinde kategori filtrelerini getir
  useEffect(() => {
    const fetchCategoryFilters = async () => {
      if (categoryId) {
        try {
          // API'den kategori filtrelerini çek
          const response = await getFilterOptions(categoryId);
          if (response.filters && response.filters.length > 0) {
            setCategoryFilters(response.filters);
            console.log('Kategori filtreleri yüklendi:', response.filters);
            
            // Filtreleri display_location'a göre sınıflandır
            const defaultFiltersList = response.filters.filter((filter: { display_location?: string }) => 
              filter.display_location === "default" || !filter.display_location
            );
            
            const moreOptionsFiltersList = response.filters.filter((filter: { display_location?: string }) => 
              filter.display_location === "more_options"
            );
            
            setDefaultFilters(defaultFiltersList);
            setMoreOptionsFilters(moreOptionsFiltersList);
            
            // Filtre değerlerini başlangıç değerleriyle doldur
            const initialValues = {};
            response.filters.forEach(filter => {
              if (isNumericRangeFilterType(filter.type)) {
                initialValues[`${filter.id}_min`] = '';
                initialValues[`${filter.id}_max`] = '';
              }
              // Select tipinde bir filtre ise boş dizi ya da boş değer ata
              else if (filter.type === 'select' || filter.type === 'multi-select') {
                initialValues[filter.id] = filter.multi ? [] : '';
              }
            });
            setCategoryFilterValues(initialValues);
            
            // Her bir kategori filtresi için expanded state ekleyelim
            const updatedExpandedSections = { ...expandedSections };
            response.filters.forEach(filter => {
              updatedExpandedSections[`category_${filter.id}`] = false; // Varsayılan olarak kapalı
            });
            setExpandedSections(updatedExpandedSections);
            
          } else {
            setCategoryFilters([]);
            setDefaultFilters([]);
            setMoreOptionsFilters([]);
          }
        } catch (error) {
          console.error('Kategori filtreleri alınamadı:', error);
          setCategoryFilters([]);
          setDefaultFilters([]);
          setMoreOptionsFilters([]);
        }
      }
    };
    
    fetchCategoryFilters();
    
    // Kategori değiştiğinde değerleri sıfırla
    setCategoryFilterValues({});
    
  }, [categoryId]);
  
  // İl seçimi değiştiğinde
  const handleProvinceChange = (e) => {
    const newProvinceId = e.target.value;
    
    // Eğer boş değer (İl Seçiniz) seçilirse, il seçimini kaldır
    if (!newProvinceId) {
      // İl, ilçe ve mahalle seçimlerini sıfırla
      // Bu "İl Seçiniz" seçeneğine tıklandığında il seçimini kaldırmak için eklendi
      setSelectedProvinceId('');
      setSelectedProvinceName('');
      setSelectedDistrictIds([]);
      setSelectedDistrictNames([]);
      setSelectedQuarterIds([]);
      setSelectedQuarterNames([]);
      
      // Filtreleme callback'i çağır - tüm konum filtrelerini temizle
      if (onFilterChange) {
        const filters = {
          il: '',
          ilce: '',
          mahalle: ''
        };
        
        onFilterChange(filters);
      }
      return;
    }
    
    // Normal bir il seçimi yapıldığında buradan devam et
    // Seçilen id'ye göre il nesnesini bul
    const selectedProvinceObj = provinces.find(p => p.id.toString() === newProvinceId.toString()) || null;
    
    // İlgili değerleri state'e kaydet
    setSelectedProvinceId(newProvinceId);
    setSelectedProvinceName(selectedProvinceObj ? selectedProvinceObj.name : '');
    
    // İlçe ve mahalle seçimlerini sıfırla
    setSelectedDistrictIds([]);
    setSelectedDistrictNames([]);
    setSelectedQuarterIds([]);
    setSelectedQuarterNames([]);
    
    // Filtreleme callback'i çağır
    if (onFilterChange) {
      const filters = {};
      
      // İl bilgisini ekle
      if (selectedProvinceObj) {
        filters.il = selectedProvinceObj.name;
      }
      
      // İlçe ve mahalle sıfırlandı
      filters.ilce = '';
      filters.mahalle = '';
      
      onFilterChange(filters);
    }
  };
  
  // İlçe seçimi değiştiğinde (checkbox dropdown için)
  const handleDistrictCheckboxChange = (selectedIds) => {
    // Seçilen tüm ilçeler için objeleri bul
    const selectedDistrictObjects = selectedIds.map(districtId => {
      return districts.find(d => d.id.toString() === districtId.toString()) || null;
    }).filter(Boolean); // Null değerleri filtrele
    
    // Eski ilçe ID'lerini saklayalım
    const oldDistrictIds = [...selectedDistrictIds];
    
    // ID ve isimleri ayır
    const newDistrictIds = selectedDistrictObjects.map(d => d.id.toString());
    const newDistrictNames = selectedDistrictObjects.map(d => d.name);
    
    // İlgili değerleri state'e kaydet
    setSelectedDistrictIds(newDistrictIds);
    setSelectedDistrictNames(newDistrictNames);
    
    // Filtreleme callback'i çağır
    if (onFilterChange) {
      const filters = {
        il: selectedProvinceName
      };

      // İlçeleri ayrı ayrı ekle
      if (newDistrictNames.length > 0) {
        filters.ilce = newDistrictNames;
      } else {
        filters.ilce = '';
        // Tüm ilçeler kaldırıldıysa, mahalle seçimlerini de sıfırla
        setSelectedQuarterIds([]);
        setSelectedQuarterNames([]);
        filters.mahalle = '';
      }
      
      // Seçili mahalle bilgilerini ekle
      if (selectedQuarterNames.length > 0) {
        filters.mahalle = selectedQuarterNames;
      }
      
      onFilterChange(filters);
    }
  };
  
  // Mahalle seçimi değiştiğinde (checkbox dropdown için)
  const handleQuarterCheckboxChange = (selectedIds) => {
    // Seçilen tüm mahalleler için objeleri bul
    const selectedQuarterObjects = selectedIds.map(quarterId => {
      return quarters.find(q => q.id.toString() === quarterId.toString()) || null;
    }).filter(Boolean); // Null değerleri filtrele
    
    // ID ve isimleri ayır
    const newQuarterIds = selectedQuarterObjects.map(q => q.id.toString());
    const newQuarterNames = selectedQuarterObjects.map(q => q.name);
    
    // İlgili değerleri state'e kaydet
    setSelectedQuarterIds(newQuarterIds);
    setSelectedQuarterNames(newQuarterNames);
    
    // Filtreleme callback'i çağır
    if (onFilterChange) {
      const filters = {
        il: selectedProvinceName
      };

      // İlçeleri ekle
      if (selectedDistrictNames.length > 0) {
        filters.ilce = selectedDistrictNames;
      }

      // Mahalleleri ayrı ayrı ekle
      if (newQuarterNames.length > 0) {
        filters.mahalle = newQuarterNames;
      } else {
        filters.mahalle = '';
      }
      
      onFilterChange(filters);
    }
  };
  
  // Para birimi değiştiğinde
  const handleCurrencyChange = (e) => {
    const newCurrency = e.target.value;
    setCurrency(newCurrency);
    
    // Para birimi değiştiğinde, değerler aynı kalsın ama filtrenin uygulanmış olduğundan emin olalım
    if (minPrice || maxPrice) {
      // Filtreleme için gerekli değerleri hazırla
      const priceFilters = {};
      
      // Sadece değeri olan filtreleri ekle
      if (minPrice) {
        priceFilters.fiyat_min = Number(minPrice);
        priceFilters.fiyatMin = Number(minPrice);
      }
      
      if (maxPrice) {
        priceFilters.fiyat_max = Number(maxPrice);
        priceFilters.fiyatMax = Number(maxPrice);
      }
      
      // Para birimini TL olsa bile ekleyelim - böylece UI'da gösterilen sembol doğru olur
      priceFilters.para_birimi = newCurrency;
      
      // Filtreleme callback'i çağır
      if (onFilterChange) {
        onFilterChange(priceFilters);
      }
    }
  };
  
  // Fiyat değerlerini formatlama
  const formatCurrency = (value) => {
    if (!value) return '';
    
    // Sadece rakam olsun
    let numericValue = value.toString().replace(/[^0-9]/g, '');
    
    // Bin ayracı ekle
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };
  
  // Formatlanmış değeri parse etme
  const parseFormattedValue = (formattedValue) => {
    if (!formattedValue) return '';
    // Noktaları kaldırarak sayısal değere çevir
    return formattedValue.replace(/\./g, '');
  };
  
  // Minimum fiyat değiştiğinde
  const handleMinPriceChange = (e) => {
    const formattedValue = formatCurrency(e.target.value);
    setMinPriceFormatted(formattedValue);
    setMinPrice(parseFormattedValue(formattedValue));
  };
  
  // Maksimum fiyat değiştiğinde
  const handleMaxPriceChange = (e) => {
    const formattedValue = formatCurrency(e.target.value);
    setMaxPriceFormatted(formattedValue);
    setMaxPrice(parseFormattedValue(formattedValue));
  };
  
  // Fiyat filtresi uygulama
  const handleApplyPriceFilter = () => {
    // Eğer değerler yoksa filtreleme yapma
    if (!minPrice && !maxPrice) {
      return;
    }
    
    // Filtreleme için gerekli değerleri hazırla
    const priceFilters = {};
    
    // Sadece değeri olan filtreleri ekle
    if (minPrice) {
      // Her iki formatı da ekleyerek uyumluluk sağlıyoruz
      priceFilters.fiyat_min = Number(minPrice);
      priceFilters.fiyatMin = Number(minPrice);
    }
    
    if (maxPrice) {
      // Her iki formatı da ekleyerek uyumluluk sağlıyoruz
      priceFilters.fiyat_max = Number(maxPrice);
      priceFilters.fiyatMax = Number(maxPrice);
    }
    
    // Para birimi TL'den farklıysa ekle
    if (currency) {
      priceFilters.para_birimi = currency;
    }
    
    // Filtreleme callback'i çağır
    if (onFilterChange && (minPrice || maxPrice)) {
      onFilterChange(priceFilters);
    }
    
    // Filtreleme panelini kapat (mobil için)
    setPriceFilterOpen(false);
  };
  
  // Takas seçeneği değiştiğinde
  const handleTradeableChange = (value) => {
    setTradeable(value);
    
    // Filtreleme callback'i çağır
    if (onFilterChange && value) { // Boş değer için filtreleme yapma
      onFilterChange({
        takas: value
      });
    } else if (onFilterChange) {
      // Boş değer seçildiğinde filtreleme değerini kaldır
      onFilterChange({
        takas: undefined
      });
    }
  };
  
  // İlan tarihi seçeneği değiştiğinde
  const handleListingDateChange = (value) => {
    setListingDate(value);
    
    // Filtreleme callback'i çağır
    if (onFilterChange && value) { // Boş değer için filtreleme yapma
      onFilterChange({
        ilan_tarihi: value
      });
    } else if (onFilterChange) {
      // Boş değer seçildiğinde filtreleme değerini kaldır
      onFilterChange({
        ilan_tarihi: undefined
      });
    }
  };
  
  // Fotoğraf seçeneği değiştiğinde
  const handleHasPhotoChange = (value) => {
    setHasPhoto(value);
    
    // Filtreleme callback'i çağır
    if (onFilterChange && value) { // Boş değer için filtreleme yapma
      onFilterChange({
        fotograf: value
      });
    } else if (onFilterChange) {
      // Boş değer seçildiğinde filtreleme değerini kaldır
      onFilterChange({
        fotograf: undefined
      });
    }
  };
  
  // Kategori filtreleri değiştiğinde çağrılacak handler
  const handleCategoryFilterChange = (filterId, value, isRangeFilter, rangeType) => {
    // Range filtresi için ayrı işlem yap
    if (isRangeFilter) {
      setCategoryFilterValues(prev => ({
        ...prev,
        [`${filterId}_${rangeType}`]: value
      }));
    } 
    // Multi-select için ayrı işlem yap
    else if (Array.isArray(value)) {
      setCategoryFilterValues(prev => ({
        ...prev,
        [filterId]: value
      }));
    }
    // Diğer filtre tipleri için normal atama yap
    else {
      setCategoryFilterValues(prev => ({
        ...prev,
        [filterId]: value
      }));
    }
  };
  
  // Tüm filtreleri temizle
  const clearFilters = () => {
    setSelectedProvinceId('');
    setSelectedProvinceName('');
    setSelectedDistrictIds([]);
    setSelectedDistrictNames([]);
    setSelectedQuarterIds([]);
    setSelectedQuarterNames([]);
    setMinPrice('');
    setMaxPrice('');
    setMinPriceFormatted('');
    setMaxPriceFormatted('');
    setCurrency('TL');
    setTradeable('');
    setListingDate('');
    setHasPhoto('');
    setCategoryFilterValues({});
    
    // Filtreleme callback'i çağır
    if (onResetFilters) {
      onResetFilters();
    }
  };
  
  // Tüm filtreleri uygula
  const applyFilters = () => {
    // Tüm filtre değerlerini topla
    const allFilters = {};
    
    // Sadece değer olan filtreleri ekle
    if (selectedProvinceId) {
      allFilters.il = selectedProvinceName;
    }
    
    if (selectedDistrictIds.length > 0) {
      allFilters.ilce = selectedDistrictNames.join(', ');
    }
    
    if (selectedQuarterIds.length > 0) {
      allFilters.mahalle = selectedQuarterNames.join(', ');
    }
    
    if (minPrice) allFilters.fiyatMin = Number(minPrice);
    if (maxPrice) allFilters.fiyatMax = Number(maxPrice);
    if (currency && currency !== 'TL') allFilters.para_birimi = currency;
    if (tradeable) allFilters.takas = tradeable;
    if (listingDate) allFilters.ilan_tarihi = listingDate;
    if (hasPhoto) allFilters.fotograf = hasPhoto;
    
    // Kategori filtrelerini ekle
    Object.keys(categoryFilterValues).forEach(filterId => {
      const value = categoryFilterValues[filterId];
      
      // Range tip filtreler için
      if (filterId.includes('_min') || filterId.includes('_max')) {
        // Min ve max değerleri ayrı ayrı işle
        const baseName = filterId.replace('_min', '').replace('_max', '');
        const suffix = filterId.includes('_min') ? '_min' : '_max';
        
        // Filtre objesini bul
        const filter = categoryFilters.find(f => f.id === parseInt(baseName));
        
        if (filter && filter.db_field && value) {
          // DB alanını belirle
          const fieldName = `${filter.db_field}${suffix}`;
          allFilters[fieldName] = value;
        }
      } 
      // Çoklu seçim veya normal seçim filtreler için
      else if (value && (Array.isArray(value) ? value.length > 0 : true)) {
        const filter = categoryFilters.find(f => f.id === parseInt(filterId));
        
        if (filter && filter.db_field) {
          allFilters[filter.db_field] = value;
        }
      }
    });
    
    // Filtreleme callback'i çağır
    if (onFilterChange) {
      onFilterChange(allFilters);
    }
    if (onMobilePanelClose) {
      onMobilePanelClose();
    }
  };
  
  // Kategori Spesifik Filtreleri Render Etme Fonksiyonu - Sadece varsayılan filtreleri gösterir
  const renderCategoryFilters = () => {
    if (!defaultFilters || defaultFilters.length === 0) {
      return null;
    }
    
    return (
      <>
        {defaultFilters.map((filter) => (
          <div key={filter.id} className="fs-section">
            <div 
              className="fs-filter-section-title" 
              onClick={() => toggleSection(`category_${filter.id}`)}
              aria-expanded={expandedSections[`category_${filter.id}`]}
            >
              <h4>{filter.label}</h4>
              <span className={`fs-toggle-icon ${expandedSections[`category_${filter.id}`] ? 'open' : ''}`}>&#10095;</span>
            </div>
            
            {expandedSections[`category_${filter.id}`] && (
              <div className="fs-section-content">
                {/* Dropdown (açılır menü) tipindeki filtreler için */}
                {filter.type === 'dropdown' && (
                  <div className="fs-select-wrapper filter-sidebar__select-container">
                    <select 
                      value={categoryFilterValues[filter.id] || ''}
                      onChange={(e) => handleCategoryFilterChange(filter.id, e.target.value)}
                    >
                      <option value="">Seçiniz</option>
                      {filter.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Select tipindeki filtreler için - eski tip desteği devam etsin */}
                {filter.type === 'select' && (
                  <div className="fs-select-wrapper filter-sidebar__select-container">
                    <select 
                      value={categoryFilterValues[filter.id] || ''}
                      onChange={(e) => handleCategoryFilterChange(filter.id, e.target.value)}
                    >
                      <option value="">Seçiniz</option>
                      {filter.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Radio buton tipindeki filtreler için */}
                {filter.type === 'radio' && (
                  <div className="radio-group">
                    {filter.options.map((option) => (
                      <label key={option} className="fs-radio-label">
                        <input 
                          type="radio" 
                          className="fs-sidebar-radio"
                          name={`radio_${filter.id}`}
                          value={option}
                          checked={categoryFilterValues[filter.id] === option}
                          onChange={(e) => handleCategoryFilterChange(filter.id, e.target.value)}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                )}
                
                {/* Checkbox tipindeki filtreler için (tekli seçim şeklinde) */}
                {filter.type === 'checkbox' && (
                  <div className="checkbox-group">
                    {filter.options.map((option) => {
                      const isChecked = categoryFilterValues[filter.id] === option;
                      
                      return (
                        <label key={option} className="fs-checkbox-label">
                          <input 
                            type="checkbox" 
                            className="fs-sidebar-checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              // Eğer zaten seçiliyse ve tekrar tıklanırsa - deselect
                              if (isChecked) {
                                handleCategoryFilterChange(filter.id, '');
                              } else {
                                // Yeni seçim - tekli seçim olduğu için direkt atama yapıyoruz
                                handleCategoryFilterChange(filter.id, option);
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
                {filter.type === 'multi-select' && (
                  <div className="checkbox-group">
                    {filter.options.map((option) => {
                      const isChecked = categoryFilterValues[filter.id]?.includes(option) || false;
                      
                      return (
                        <label key={option} className="fs-checkbox-label">
                          <input 
                            type="checkbox" 
                            className="fs-sidebar-checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const currentValues = categoryFilterValues[filter.id] || [];
                              let newValues;
                              
                              if (e.target.checked) {
                                newValues = [...currentValues, option];
                              } else {
                                newValues = currentValues.filter(value => value !== option);
                              }
                              
                              handleCategoryFilterChange(filter.id, newValues);
                            }}
                          />
                          <span>{option}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                
                {/* Sayısal min–max (range veya emlak.json price tipi) */}
                {isNumericRangeFilterType(filter.type) && (
                  <div className="fs-range-wrapper">
                    <div className="fs-range-inputs">
                      <div className="fs-input-unit-wrapper">
                        <input 
                          type="text" 
                          placeholder="Min" 
                          value={categoryFilterValues[`${filter.id}_min`] || ''}
                          onChange={(e) => handleCategoryFilterChange(filter.id, e.target.value, true, 'min')}
                        />
                        <span className="fs-input-unit">{filter.unit || (filter.label.includes('m²') ? 'm²' : '')}</span>
                      </div>
                      <span>-</span>
                      <div className="fs-input-unit-wrapper">
                        <input 
                          type="text" 
                          placeholder="Max" 
                          value={categoryFilterValues[`${filter.id}_max`] || ''}
                          onChange={(e) => handleCategoryFilterChange(filter.id, e.target.value, true, 'max')}
                        />
                        <span className="fs-input-unit">{filter.unit || (filter.label.includes('m²') ? 'm²' : '')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </>
    );
  };
  
  // Kategori seçim fonksiyonu
  const handleCategorySelect = (selectedCategoryId, categoryName) => {
    if (selectedCategoryId && selectedCategoryId !== currentCategoryId) {
      // Kategori değiştiği için tüm ayarları sıfırla
      console.log(`Kategori değişti: ${currentCategoryId} -> ${selectedCategoryId}, ${categoryName}`);
      
      // Önce kategori bilgilerini yükle, sonra onFilterChange çağır
      setCurrentCategoryId(selectedCategoryId);
      
      // Parent componente bildir ve sayfayı değiştir
      onFilterChange({ categoryId: selectedCategoryId });
    }
  };
  
  // useEffect ile mevcut kategoriyi ve kategori yolunu yükle (gerçek BE - categoryTreeService)
  useEffect(() => {
    const loadCurrentCategoryAndPath = async () => {
      if (categoryId) {
        try {
          // Gerçek kategori yolunu BE'den getir (categoryService.getCategoryPath üzerinden)
          const path = await findCategoryPath(Number(categoryId));

          if (path && path.length > 0) {
            const normalizedPath = path.map((cat) => ({ id: cat.id, name: cat.name }));
            const category = normalizedPath[normalizedPath.length - 1];

            setCurrentCategory(category);
            setCurrentCategoryId(Number(categoryId));
            setCategoryPath(normalizedPath);
            console.log('Kategori yolu:', normalizedPath);
          } else {
            console.warn(`Kategori ID ${categoryId} için bilgi bulunamadı`);
          }
        } catch (error) {
          console.error('Kategori bilgisi alınamadı:', error);
        }
      }
    };
    
    loadCurrentCategoryAndPath();
  }, [categoryId]);
  
  // Seçili filtre sayısını hesapla
  const activeFilterCount = [
    selectedProvinceId,
    selectedDistrictIds.length > 0,
    selectedQuarterIds.length > 0,
    minPrice || maxPrice,
    tradeable,
    listingDate,
    hasPhoto,
  ].filter(Boolean).length;

  // Dışarı tıklama ile dropdown kapat
  useEffect(() => {
    if (!openDropdown) return;
    const handleClickOutside = (e) => {
      if (!e.target.closest('.fs-hbar-group')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  return (
    <div className="fs-sidebar">
      <div className="fs-horizontal-bar">
        {/* Kategori Ağacı */}
        <CategoryTreeView
          categoryId={categoryId}
          onSelectCategory={(selectedCatId) => {
            if (onFilterChange) {
              onFilterChange({ categoryId: selectedCatId });
            }
          }}
        />

        <div className="fs-hbar-divider" />
        {/* Konum Dropdown */}
        <div className={`fs-hbar-group ${openDropdown === 'location' ? 'open' : ''}`}>
          <button
            className={`fs-hbar-trigger ${selectedProvinceId ? 'active' : ''}`}
            onClick={() => setOpenDropdown(openDropdown === 'location' ? null : 'location')}
          >
            <span className="fs-hbar-trigger-icon">&#128205;</span>
            <span className={`fs-hbar-trigger-label ${!selectedProvinceId ? 'fs-hbar-trigger-placeholder' : ''}`}>
              {selectedProvinceName || 'Konum'}
            </span>
            {(selectedDistrictIds.length > 0 || selectedQuarterIds.length > 0) && (
              <span className="fs-hbar-badge">
                {(selectedDistrictIds.length > 0 ? 1 : 0) + (selectedQuarterIds.length > 0 ? 1 : 0)}
              </span>
            )}
            <span className="fs-hbar-trigger-arrow">&#9662;</span>
          </button>
          {openDropdown === 'location' && (
            <div className="fs-hbar-dropdown">
              <div className="fs-hbar-dropdown-header">
                <span className="fs-hbar-dropdown-title">Konum Seçin</span>
                <button className="fs-hbar-dropdown-close" onClick={() => setOpenDropdown(null)}>&times;</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px 0' }}>
                <select
                  className="fs-hbar-select"
                  value={selectedProvinceId}
                  onChange={(e) => { handleProvinceChange(e); }}
                  disabled={isLoading}
                >
                  <option value="">Il Seçiniz</option>
                  {provinces.map(province => (
                    <option key={province.id} value={province.id}>{province.name}</option>
                  ))}
                </select>
                <CheckboxDropdown
                  label="İlçe"
                  options={districts}
                  selectedValues={selectedDistrictIds}
                  onChange={handleDistrictCheckboxChange}
                  disabled={!selectedProvinceId || isLoading}
                />
                <CheckboxDropdown
                  label="Mahalle"
                  options={quarters}
                  selectedValues={selectedQuarterIds}
                  onChange={handleQuarterCheckboxChange}
                  disabled={selectedDistrictIds.length === 0 || isLoading}
                />
              </div>
            </div>
          )}
        </div>

        {!isServiceCategory && (
          <>
            <div className="fs-hbar-divider" />

            {/* Fiyat Dropdown */}
            <div className={`fs-hbar-group ${openDropdown === 'price' ? 'open' : ''}`}>
              <button
                className={`fs-hbar-trigger ${minPrice || maxPrice ? 'active' : ''}`}
                onClick={() => setOpenDropdown(openDropdown === 'price' ? null : 'price')}
              >
                <span className="fs-hbar-trigger-icon">&#8378;</span>
                <span className={`fs-hbar-trigger-label ${!minPrice && !maxPrice ? 'fs-hbar-trigger-placeholder' : ''}`}>
                  {minPrice || maxPrice
                    ? `${minPrice ? formatCurrency(minPrice.toString()) : '?'} - ${maxPrice ? formatCurrency(maxPrice.toString()) : '?'} ${currency}`
                    : 'Fiyat'}
                </span>
                <span className="fs-hbar-trigger-arrow">&#9662;</span>
              </button>
              {openDropdown === 'price' && (
                <div className="fs-hbar-dropdown">
                  <div className="fs-hbar-dropdown-header">
                    <span className="fs-hbar-dropdown-title">Fiyat Aralığı</span>
                    <button className="fs-hbar-dropdown-close" onClick={() => setOpenDropdown(null)}>&times;</button>
                  </div>
                  <div style={{ padding: '8px 4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="fs-hbar-price-container">
                      <div className="fs-hbar-price-inputs-row">
                        <input
                          className="fs-hbar-price-input"
                          type="text"
                          placeholder="Min Fiyat"
                          value={minPriceFormatted}
                          onChange={handleMinPriceChange}
                        />
                        <span className="fs-hbar-price-sep">-</span>
                        <input
                          className="fs-hbar-price-input"
                          type="text"
                          placeholder="Max Fiyat"
                          value={maxPriceFormatted}
                          onChange={handleMaxPriceChange}
                        />
                      </div>
                      <div className="fs-hbar-price-actions-row">
                        <div className="fs-hbar-currency">
                          <select onChange={handleCurrencyChange} value={currency} aria-label="Para birimi">
                            <option value="TL">TL</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                          </select>
                        </div>
                        <button
                          className="fs-hbar-btn fs-hbar-btn-apply"
                          onClick={() => { handleApplyPriceFilter(); setOpenDropdown(null); }}
                          disabled={!minPrice && !maxPrice}
                        >
                          Uygula
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {isServiceCategory && (
          <>
            <div className="fs-hbar-divider" />
            <div className={`fs-hbar-group ${openDropdown === 'rating' ? 'open' : ''}`}>
              <button
                className={`fs-hbar-trigger ${rating ? 'active' : ''}`}
                onClick={() => setOpenDropdown(openDropdown === 'rating' ? null : 'rating')}
              >
                <span className="fs-hbar-trigger-icon">&#11088;</span>
                <span className={`fs-hbar-trigger-label ${!rating ? 'fs-hbar-trigger-placeholder' : ''}`}>
                  {rating || 'Yorum Derecesi'}
                </span>
                <span className="fs-hbar-trigger-arrow">&#9662;</span>
              </button>
              {openDropdown === 'rating' && (
                <div className="fs-hbar-dropdown" style={{ minWidth: '180px' }}>
                  <div className="fs-hbar-dropdown-header">
                    <span className="fs-hbar-dropdown-title">Yorum Derecesi</span>
                    <button className="fs-hbar-dropdown-close" onClick={() => setOpenDropdown(null)}>&times;</button>
                  </div>
                  <div style={{ padding: '4px 0' }}>
                    {['5 Yıldız', '4 Yıldız ve Üzeri', '3 Yıldız ve Üzeri', 'Yorumsuz', 'Tümü'].map((ratingOption) => (
                      <label key={ratingOption} className="fs-hbar-checkbox-item">
                        <input
                          type="checkbox"
                          checked={rating === ratingOption}
                          onChange={() => {
                            const newRating = rating === ratingOption ? '' : ratingOption;
                            setRating(newRating);
                            setOpenDropdown(null);
                            if (onFilterChange) {
                              onFilterChange({ rating: newRating });
                            }
                          }}
                        />
                        <span>{ratingOption}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {!isServiceCategory && (

          <>
            <div className="fs-hbar-divider" />

            {/* Takas Dropdown */}
            <div className={`fs-hbar-group ${openDropdown === 'trade' ? 'open' : ''}`}>
              <button
                className={`fs-hbar-trigger ${tradeable ? 'active' : ''}`}
                onClick={() => setOpenDropdown(openDropdown === 'trade' ? null : 'trade')}
              >
                <span className="fs-hbar-trigger-icon">&#128259;</span>
                <span className={`fs-hbar-trigger-label ${!tradeable ? 'fs-hbar-trigger-placeholder' : ''}`}>
                  {tradeable || 'Takas'}
                </span>
                <span className="fs-hbar-trigger-arrow">&#9662;</span>
              </button>
              {openDropdown === 'trade' && (
                <div className="fs-hbar-dropdown" style={{ minWidth: '160px' }}>
                  <div className="fs-hbar-dropdown-header">
                    <span className="fs-hbar-dropdown-title">Takas</span>
                    <button className="fs-hbar-dropdown-close" onClick={() => setOpenDropdown(null)}>&times;</button>
                  </div>
                  <div style={{ padding: '4px 0' }}>
                    <label className="fs-hbar-checkbox-item">
                      <input
                        type="checkbox"
                        checked={tradeable === 'Evet'}
                        onChange={() => { handleTradeableChange(tradeable === 'Evet' ? '' : 'Evet'); setOpenDropdown(null); }}
                      />
                      <span>Evet</span>
                    </label>
                    <label className="fs-hbar-checkbox-item">
                      <input
                        type="checkbox"
                        checked={tradeable === 'Hayır'}
                        onChange={() => { handleTradeableChange(tradeable === 'Hayır' ? '' : 'Hayır'); setOpenDropdown(null); }}
                      />
                      <span>Hayır</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="fs-hbar-divider" />

            {/* İlan Tarihi Dropdown */}
            <div className={`fs-hbar-group ${openDropdown === 'date' ? 'open' : ''}`}>
              <button
                className={`fs-hbar-trigger ${listingDate ? 'active' : ''}`}
                onClick={() => setOpenDropdown(openDropdown === 'date' ? null : 'date')}
              >
                <span className="fs-hbar-trigger-icon">&#128197;</span>
                <span className={`fs-hbar-trigger-label ${!listingDate ? 'fs-hbar-trigger-placeholder' : ''}`}>
                  {listingDate || 'Tarih'}
                </span>
                <span className="fs-hbar-trigger-arrow">&#9662;</span>
              </button>
              {openDropdown === 'date' && (
                <div className="fs-hbar-dropdown" style={{ minWidth: '180px' }}>
                  <div className="fs-hbar-dropdown-header">
                    <span className="fs-hbar-dropdown-title">İlan Tarihi</span>
                    <button className="fs-hbar-dropdown-close" onClick={() => setOpenDropdown(null)}>&times;</button>
                  </div>
                  <div style={{ padding: '4px 0' }}>
                    {['Son 24 Saat', 'Son 3 Gün', 'Son 7 Gün', 'Son 15 Gün', 'Son 30 Gün'].map((dateOption) => (
                      <label key={dateOption} className="fs-hbar-checkbox-item">
                        <input
                          type="checkbox"
                          checked={listingDate === dateOption}
                          onChange={() => { handleListingDateChange(listingDate === dateOption ? '' : dateOption); setOpenDropdown(null); }}
                        />
                        <span>{dateOption}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="fs-hbar-divider" />

            {/* Fotoğraf Dropdown */}
            <div className={`fs-hbar-group ${openDropdown === 'photo' ? 'open' : ''}`}>
              <button
                className={`fs-hbar-trigger ${hasPhoto ? 'active' : ''}`}
                onClick={() => setOpenDropdown(openDropdown === 'photo' ? null : 'photo')}
              >
                <span className="fs-hbar-trigger-icon">&#128247;</span>
                <span className={`fs-hbar-trigger-label ${!hasPhoto ? 'fs-hbar-trigger-placeholder' : ''}`}>
                  {hasPhoto || 'Fotoğraf'}
                </span>
                <span className="fs-hbar-trigger-arrow">&#9662;</span>
              </button>
              {openDropdown === 'photo' && (
                <div className="fs-hbar-dropdown" style={{ minWidth: '160px' }}>
                  <div className="fs-hbar-dropdown-header">
                    <span className="fs-hbar-dropdown-title">Fotoğraf</span>
                    <button className="fs-hbar-dropdown-close" onClick={() => setOpenDropdown(null)}>&times;</button>
                  </div>
                  <div style={{ padding: '4px 0' }}>
                    <label className="fs-hbar-checkbox-item">
                      <input
                        type="checkbox"
                        checked={hasPhoto === 'Evet'}
                        onChange={() => { handleHasPhotoChange(hasPhoto === 'Evet' ? '' : 'Evet'); setOpenDropdown(null); }}
                      />
                      <span>Fotoğraflı</span>
                    </label>
                    <label className="fs-hbar-checkbox-item">
                      <input
                        type="checkbox"
                        checked={hasPhoto === 'Hayır'}
                        onChange={() => { handleHasPhotoChange(hasPhoto === 'Hayır' ? '' : 'Hayır'); setOpenDropdown(null); }}
                      />
                      <span>Fotoğrafsız</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Kategori Spesifik Filtreler (eğer varsa) */}
        {defaultFilters && defaultFilters.length > 0 && defaultFilters.map((filter) => (
          <div key={filter.id} className={`fs-hbar-group ${openDropdown === `cat_${filter.id}` ? 'open' : ''}`}>
            <button
              className={`fs-hbar-trigger ${categoryFilterValues[filter.id] ? 'active' : ''}`}
              onClick={() => setOpenDropdown(openDropdown === `cat_${filter.id}` ? null : `cat_${filter.id}`)}
            >
              <span className="fs-hbar-trigger-label">{filter.label}</span>
              <span className="fs-hbar-trigger-arrow">&#9662;</span>
            </button>
            {openDropdown === `cat_${filter.id}` && (
              <div className="fs-hbar-dropdown" style={{ minWidth: '200px' }}>
                <div className="fs-hbar-dropdown-header">
                  <span className="fs-hbar-dropdown-title">{filter.label}</span>
                  <button className="fs-hbar-dropdown-close" onClick={() => setOpenDropdown(null)}>&times;</button>
                </div>
                <div style={{ padding: '4px 0' }}>
                  {(filter.options || []).map((option) => (
                    <label key={option} className="fs-hbar-checkbox-item">
                      <input
                        type="checkbox"
                        checked={categoryFilterValues[filter.id] === option}
                        onChange={() => { handleCategoryFilterChange(filter.id, categoryFilterValues[filter.id] === option ? '' : option); setOpenDropdown(null); }}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="fs-hbar-divider" />

        {/* Aksiyon Butonları */}
        <div className="fs-hbar-actions">
          <button
            className="fs-hbar-btn fs-hbar-btn-clear"
            onClick={() => { clearFilters(); setOpenDropdown(null); }}
            disabled={isLoading}
          >
            Temizle
          </button>
          <button
            className="fs-hbar-btn fs-hbar-btn-apply"
            onClick={() => { applyFilters(); setOpenDropdown(null); }}
            disabled={isLoading}
          >
            Filtrele
          </button>
          <button
            className="fs-hbar-btn fs-hbar-btn-more"
            onClick={() => { setIsMoreFiltersOpen(true); setOpenDropdown(null); }}
          >
            + Daha Fazla
          </button>
        </div>
      </div>

      {/* Daha fazla filtreler modalı - Portal içinde render ediyoruz */}
      {isMoreFiltersOpen &&
        ReactDOM.createPortal(
          <MoreFiltersModal
            isOpen={isMoreFiltersOpen}
            onClose={() => setIsMoreFiltersOpen(false)}
            provinces={provinces}
            districts={districts}
            quarters={quarters}
            selectedProvince={selectedProvinceName}
            selectedDistrictIds={selectedDistrictIds}
            selectedDistrictNames={selectedDistrictNames}
            selectedQuarterIds={selectedQuarterIds}
            selectedQuarterNames={selectedQuarterNames}
            onProvinceChange={handleProvinceChange}
            onDistrictChange={handleDistrictCheckboxChange}
            onQuarterChange={handleQuarterCheckboxChange}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onMinPriceChange={handleMinPriceChange}
            onMaxPriceChange={handleMaxPriceChange}
            tradeEnabled={tradeable}
            onTradeChange={handleTradeableChange}
            minDays={minPrice}
            maxDays={maxPrice}
            onDaysChange={handleListingDateChange}
            photoEnabled={hasPhoto}
            onPhotoChange={handleHasPhotoChange}
            categoryFilters={categoryFilters}
            moreOptionsFilters={moreOptionsFilters}
            defaultFilters={defaultFilters}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
            categoryFilterValues={categoryFilterValues}
            handleCategoryFilterChange={handleCategoryFilterChange}
            onApply={applyFilters}
            onClearFilters={clearFilters}
            isServiceCategory={isServiceCategory}
          />,
          document.body
        )
      }
    </div>
  );
};

// Yardımcı fonksiyon - Alt kategorileri gösterir
const SubcategoriesList = ({ categoryId, onSelectCategory }) => {
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadSubcategories = async () => {
      try {
        setLoading(true);

        // Gerçek BE'den alt kategorileri getir (categoryService üzerinden)
        const result = await fetchSubCategories(Number(categoryId));
        const subs = (result?.data?.subCategories || result?.data?.subcategories || []).map((sub) => ({
          id: sub.id,
          name: sub.name
        }));

        setSubcategories(subs);
        setLoading(false);
      } catch (error) {
        console.error('Alt kategoriler yüklenirken hata:', error);
        setLoading(false);
      }
    };
    
    loadSubcategories();
  }, [categoryId]);
  
  if (loading) {
    return <div className="fs-loading">Alt kategoriler yükleniyor...</div>;
  }
  
  if (subcategories.length === 0) {
    return <div className="fs-no-subcategories">Alt kategori bulunmamaktadır.</div>;
  }
  
  return (
    <div className="fs-category-list-group">
      <div className="fs-category-list-header">Alt Kategoriler:</div>
      <div className="fs-category-items">
        {subcategories.map(category => (
          <div 
            key={category.id}
            className="fs-category-item"
            onClick={() => onSelectCategory(category.id, category.name)}
          >
            {category.name}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FilterSidebar; 