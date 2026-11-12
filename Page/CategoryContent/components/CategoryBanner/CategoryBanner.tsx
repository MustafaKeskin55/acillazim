"use client";

import React, { useState, useEffect } from 'react';
import './CategoryBanner.css';
import { FaSearch, FaHome, FaBuilding, FaTree, FaCity, FaHotel, FaUmbrellaBeach, FaTruckPickup } from 'react-icons/fa';
import { MdDirectionsCar, MdAirportShuttle, MdLocalShipping, MdTwoWheeler, MdDirectionsBoat } from 'react-icons/md';
import { getBannerFiltersForCategory, hasBanner as checkHasBanner } from '@/services/banner/bannerService';
import categoryService from '@/services/category/categoryService';
import locationService from '@/services/location/locationService';

interface CategoryItem {
  category_id?: number | string;
  id?: number | string;
  label?: string;
  name?: string;
  icon?: string;
  order?: number | string;
  [key: string]: unknown;
}

interface FilterOption {
  id: string;
  type: 'multi-select' | 'range' | 'checkbox';
  label?: string;
  db_field?: string;
  unit?: string;
  options?: string[];
  [key: string]: unknown;
}

interface FilterMap {
  [key: string]: FilterOption;
}

interface RangeValue {
  min?: string;
  max?: string;
}

interface SelectedFilters {
  [key: string]: string | boolean | RangeValue;
}

interface CategoryBannerProps {
  categoryId?: number | string;
  onFilterSubmit?: (filters: Record<string, unknown>) => void;
}

const IconMap: Record<string, React.ElementType> = {
  FaHome, FaBuilding, FaTree, FaCity, FaHotel, FaUmbrellaBeach,
  FaTruckPickup, MdDirectionsCar, MdAirportShuttle, MdLocalShipping,
  MdTwoWheeler, MdDirectionsBoat,
};

const getIconComponent = (iconName?: string) => {
  if (!iconName) return null;
  const Icon = IconMap[iconName];
  return Icon ? <Icon className="catbanner-subcategory-icon" /> : null;
};

const getBannerImage = (category?: CategoryItem): string | null => {
  if (!category) return null;
  const categoryName = category.label || category.name || '';
  if (!categoryName) return null;

  const normalizeName = (name: string) =>
    name.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase().trim()
      .replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();

  const removeSpaces = (name: string) => name.replace(/\s+/g, '').trim();

  const normalizeWithoutTurkish = (name: string) =>
    name.toLowerCase().trim()
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/\s+/g, ' ').trim();

  const categoryToImageMap: Record<string, string> = {
    'konut': '/images/banners/konut.jpg',
    'iş yeri': '/images/banners/isyeri.jpg',
    'işyeri': '/images/banners/isyeri.jpg',
    'isyeri': '/images/banners/isyeri.jpg',
    'arsa': '/images/banners/arsa.jpg',
    'bina': '/images/banners/bina.jpg',
    'devre mülk': '/images/banners/devremulk.jpg',
    'devremülk': '/images/banners/devremulk.jpg',
    'devremulk': '/images/banners/devremulk.jpg',
    'turizm': '/images/banners/turizm.jpg',
    'turistik tesis': '/images/banners/turizm.jpg',
    'deniz araçları': '/images/banners/deniz-araclari.jpg',
    'deniz araclari': '/images/banners/deniz-araclari.jpg',
    'otomobil': '/images/banners/otomobil.jpg',
    'suv & pickup': '/images/banners/suv-pickup.jpg',
    'suv pickup': '/images/banners/suv-pickup.jpg',
    'minivan & panelvan': '/images/banners/minivan-panelvan.jpg',
    'minivan panelvan': '/images/banners/minivan-panelvan.jpg',
    'motorsiklet': '/images/banners/motorsiklet.jpg',
    'motosiklet': '/images/banners/motorsiklet.jpg',
    'ticari araç': '/images/banners/ticari-arac.jpg',
    'ticari arac': '/images/banners/ticari-arac.jpg',
  };

  const normalized = normalizeName(categoryName);
  let src = categoryToImageMap[normalized];
  if (!src) src = categoryToImageMap[removeSpaces(normalized)];
  if (!src) {
    const noTurkish = normalizeWithoutTurkish(categoryName);
    src = categoryToImageMap[noTurkish] || categoryToImageMap[removeSpaces(noTurkish)];
  }
  return src || null;
};

const CategoryBanner: React.FC<CategoryBannerProps> = ({ categoryId, onFilterSubmit }) => {
  const [loading, setLoading] = useState(false);
  const [hasBanner, setHasBanner] = useState<boolean | null>(null);

  const [firstLevelCategories, setFirstLevelCategories] = useState<CategoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);
  const [statusOptions, setStatusOptions] = useState<CategoryItem[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<CategoryItem | null>(null);
  const [typeOptions, setTypeOptions] = useState<CategoryItem[]>([]);
  const [selectedType, setSelectedType] = useState<CategoryItem | null>(null);

  const [filterOptions, setFilterOptions] = useState<FilterMap>({});
  const [selectedFilters, setSelectedFilters] = useState<SelectedFilters>({});

  const [cities, setCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [districts, setDistricts] = useState<string[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');

  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [currency, setCurrency] = useState('₺');
  const currencyOptions = ['₺', '$', '£'];

  const [labels] = useState({
    statusPlaceholder: '', typePlaceholder: '', cityPlaceholder: '',
    districtPlaceholder: '', minPricePlaceholder: '', maxPricePlaceholder: '',
    searchButton: '', loading: '',
  });

  const getFirstLevelCategories = async (parentCategoryId: number | string): Promise<CategoryItem[]> => {
    try {
      if (typeof window !== 'undefined') {
        const cachedKey = `category_${parentCategoryId}_children`;
        const cached = localStorage.getItem(cachedKey);
        if (cached) return (JSON.parse(cached) as CategoryItem[]).slice(0, 6);
      }
      const cats = await (categoryService as { getSubCategories: (id: number | string) => Promise<CategoryItem[]> }).getSubCategories(parentCategoryId);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`category_${parentCategoryId}_children`, JSON.stringify(cats));
      }
      return cats.slice(0, 6);
    } catch { return []; }
  };

  useEffect(() => {
    if (!categoryId) return;
    const loadAllData = async () => {
      try {
        setLoading(true);
        const categories = await getFirstLevelCategories(categoryId);
        setFirstLevelCategories(categories);

        let bannerCategoryId: number | string = categoryId;
        if (categories.length > 0) {
          const orderOne = categories.find((c) => c.order === 1 || c.order === '1');
          const firstCat = orderOne || categories[0];
          setSelectedCategory(firstCat);
          bannerCategoryId = firstCat.category_id || firstCat.id || categoryId;
        }

        const bannerData = await (getBannerFiltersForCategory as (id: number | string) => Promise<{ hasBanner?: boolean; filters?: FilterOption[] } | null>)(bannerCategoryId);
        if (bannerData?.hasBanner && bannerData.filters && bannerData.filters.length > 0) {
          setHasBanner(true);
          const formatted: FilterMap = {};
          bannerData.filters.forEach((f) => { formatted[f.id] = f; });
          setFilterOptions(formatted);
        } else {
          setHasBanner(null);
          setLoading(false);
          return;
        }

        const citiesData = await (locationService as { getAllCities: () => Promise<string[]> }).getAllCities();
        setCities(citiesData || []);
        setLoading(false);
      } catch {
        setHasBanner(null);
        setLoading(false);
      }
    };
    loadAllData();
  }, [categoryId]);

  useEffect(() => {
    if (!selectedCategory) return;
    const load = async () => {
      try {
        const cId = selectedCategory.category_id || selectedCategory.id;
        if (!cId) return;
        const bannerData = await (getBannerFiltersForCategory as (id: number | string) => Promise<{ hasBanner?: boolean; filters?: FilterOption[] } | null>)(cId);
        if (bannerData?.hasBanner && bannerData.filters?.length) {
          setHasBanner(true);
          const formatted: FilterMap = {};
          bannerData.filters.forEach((f) => { formatted[f.id] = f; });
          setFilterOptions(formatted);
          setSelectedFilters({});
        } else {
          setHasBanner(null);
          setFilterOptions({});
          setSelectedFilters({});
        }
      } catch {
        setHasBanner(null);
        setFilterOptions({});
      }
    };
    load();
  }, [selectedCategory]);

  useEffect(() => {
    if (!selectedCategory) return;
    const load = async () => {
      try {
        const cId = selectedCategory.category_id || selectedCategory.id;
        if (!cId) return;
        const statuses = await (categoryService as { getSubCategories: (id: number | string) => Promise<CategoryItem[]> }).getSubCategories(cId);
        setStatusOptions(statuses);
        setSelectedStatus(null);
        setSelectedType(null);
        setTypeOptions([]);
      } catch { /**/ }
    };
    load();
  }, [selectedCategory]);

  useEffect(() => {
    if (!selectedStatus) { setTypeOptions([]); return; }
    const load = async () => {
      try {
        const cId = selectedStatus.category_id || selectedStatus.id;
        if (!cId) return;
        const types = await (categoryService as { getSubCategories: (id: number | string) => Promise<CategoryItem[]> }).getSubCategories(cId);
        setTypeOptions(types);
        setSelectedType(null);
      } catch { /**/ }
    };
    load();
  }, [selectedStatus]);

  useEffect(() => {
    if (!selectedCity) { setDistricts([]); return; }
    const load = async () => {
      try {
        const list = await (locationService as { getDistrictsByCity: (city: string) => Promise<string[]> }).getDistrictsByCity(selectedCity);
        setDistricts(list || []);
      } catch { /**/ }
    };
    load();
  }, [selectedCity]);

  const handleCategoryClick = (cat: CategoryItem) => setSelectedCategory(cat);
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = statusOptions.find((s) => String(s.category_id || s.id) === e.target.value);
    setSelectedStatus(status || null);
  };
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = typeOptions.find((t) => String(t.category_id || t.id) === e.target.value);
    setSelectedType(type || null);
  };
  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => { setSelectedCity(e.target.value); setSelectedDistrict(''); };
  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => setSelectedDistrict(e.target.value);
  const handleFilterChange = (filterId: string, value: string | boolean | RangeValue) => {
    setSelectedFilters((prev) => ({ ...prev, [filterId]: value }));
  };

  const formatNumber = (value: string) => {
    const numeric = value.replace(/[^0-9]/g, '');
    if (!numeric) return '';
    return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };
  const unformatNumber = (value: string) => value.replace(/[^0-9]/g, '');
  const handleNumericInput = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) => {
    setter(formatNumber(e.target.value));
  };

  const handleSearch = () => {
    const cleanMinPrice = minPrice ? parseInt(unformatNumber(minPrice), 10) : null;
    const cleanMaxPrice = maxPrice ? parseInt(unformatNumber(maxPrice), 10) : null;
    const cleanedFilters: Record<string, unknown> = {};
    Object.keys(selectedFilters).forEach((filterId) => {
      const filter = selectedFilters[filterId];
      if (filter && typeof filter === 'object' && !Array.isArray(filter)) {
        const rv = filter as RangeValue;
        cleanedFilters[filterId] = {
          ...rv,
          min: rv.min ? parseInt(unformatNumber(rv.min), 10) : null,
          max: rv.max ? parseInt(unformatNumber(rv.max), 10) : null,
        };
      } else {
        cleanedFilters[filterId] = filter;
      }
    });
    const filters = {
      category: selectedType || selectedStatus || selectedCategory,
      city: selectedCity,
      district: selectedDistrict,
      minPrice: cleanMinPrice,
      maxPrice: cleanMaxPrice,
      currency,
      ...cleanedFilters,
    };
    if (onFilterSubmit) onFilterSubmit(filters);
  };

  if (hasBanner === null || hasBanner === false) {
    return (
      <div className="catbanner-wrapper">
        <div className="advertisement-banner">
          <div className="advertisement-content"></div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="catbanner-wrapper">
        <div className="catbanner-loading">
          <p>{labels.loading || ''}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="catbanner-wrapper">
      <div className="catbanner-container">
        {getBannerImage(selectedCategory || undefined) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getBannerImage(selectedCategory || undefined) as string}
            alt=""
            className="catbanner-image"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}

        <div className="catbanner-content">
          <div className="catbanner-subcategories">
            {firstLevelCategories.map((cat) => {
              const catId = cat.category_id || cat.id;
              const selectedId = selectedCategory?.category_id || selectedCategory?.id;
              const isActive = selectedId === catId;
              return (
                <button
                  key={String(catId)}
                  className={`catbanner-subcategory-item${isActive ? ' active' : ''}`}
                  onClick={() => handleCategoryClick(cat)}
                  type="button"
                >
                  <div className="catbanner-subcategory-icon-wrapper">
                    {getIconComponent(cat.icon as string)}
                  </div>
                  <span className="catbanner-subcategory-name">{cat.label || cat.name}</span>
                </button>
              );
            })}
          </div>

          <div className="catbanner-filters">
            <div className="catbanner-filters-grid">
              <div className="catbanner-filters-row catbanner-filters-row-top">
                {selectedCategory && statusOptions.length > 0 && (
                  <div className="catbanner-filter-item">
                    <select className="catbanner-select" value={String(selectedStatus?.category_id || selectedStatus?.id || '')} onChange={handleStatusChange}>
                      <option value="">{labels.statusPlaceholder || 'Durum'}</option>
                      {statusOptions.map((s) => (
                        <option key={String(s.category_id || s.id)} value={String(s.category_id || s.id)}>
                          {s.label || s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {selectedCategory && (
                  <div className="catbanner-filter-item">
                    <select className="catbanner-select" value={String(selectedType?.category_id || selectedType?.id || '')} onChange={handleTypeChange} disabled={!selectedStatus || typeOptions.length === 0}>
                      <option value="">{labels.typePlaceholder || 'Tip'}</option>
                      {typeOptions.map((t) => (
                        <option key={String(t.category_id || t.id)} value={String(t.category_id || t.id)}>
                          {t.label || t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="catbanner-filter-item">
                  <select className="catbanner-select" value={selectedCity} onChange={handleCityChange}>
                    <option value="">{labels.cityPlaceholder || 'İl'}</option>
                    {cities.map((city, i) => <option key={i} value={city}>{city}</option>)}
                  </select>
                </div>
                <div className="catbanner-filter-item">
                  <select className="catbanner-select" value={selectedDistrict} onChange={handleDistrictChange} disabled={!selectedCity}>
                    <option value="">{labels.districtPlaceholder || 'İlçe'}</option>
                    {districts.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                {Object.keys(filterOptions)
                  .filter((id) => {
                    const f = filterOptions[id];
                    return f.type === 'multi-select' && (f.label?.toLowerCase().includes('oda') || f.db_field === 'number_of_rooms');
                  })
                  .map((id) => {
                    const f = filterOptions[id];
                    return (
                      <div key={id} className="catbanner-filter-item">
                        <select className="catbanner-select" value={String(selectedFilters[id] || '')} onChange={(e) => handleFilterChange(id, e.target.value)}>
                          <option value="">{f.label || ''}</option>
                          {f.options?.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                    );
                  })}
              </div>

              <div className="catbanner-filters-row catbanner-filters-row-bottom">
                {Object.keys(filterOptions)
                  .filter((id) => {
                    const f = filterOptions[id];
                    return f.type === 'multi-select' && !f.label?.toLowerCase().includes('oda') && f.db_field !== 'number_of_rooms';
                  })
                  .map((id) => {
                    const f = filterOptions[id];
                    return (
                      <div key={id} className="catbanner-filter-item">
                        <select className="catbanner-select" value={String(selectedFilters[id] || '')} onChange={(e) => handleFilterChange(id, e.target.value)}>
                          <option value="">{f.label || ''}</option>
                          {f.options?.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                    );
                  })}

                <div className="catbanner-filter-item catbanner-all-ranges">
                  <div className="catbanner-price-range">
                    <input type="text" className="catbanner-input" placeholder={labels.minPricePlaceholder ? `Min ${labels.minPricePlaceholder}` : 'Min Fiyat'} value={minPrice} onChange={(e) => handleNumericInput(e, setMinPrice)} />
                    <input type="text" className="catbanner-input" placeholder={labels.maxPricePlaceholder ? `Max ${labels.maxPricePlaceholder}` : 'Max Fiyat'} value={maxPrice} onChange={(e) => handleNumericInput(e, setMaxPrice)} />
                    <select className="catbanner-select catbanner-currency-select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                      {currencyOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  {Object.keys(filterOptions)
                    .filter((id) => filterOptions[id].type === 'range')
                    .map((id) => {
                      const f = filterOptions[id];
                      const label = f.label || '';
                      const unit = f.unit || '';
                      const fullLabel = unit && !label.toLowerCase().includes(unit.toLowerCase()) ? `${label} ${unit}`.trim() : label;
                      const rv = (selectedFilters[id] as RangeValue) || {};
                      return (
                        <div key={id} className="catbanner-range-filter">
                          <div className="catbanner-range-inputs">
                            <input type="text" className="catbanner-input" placeholder={fullLabel ? `Min ${fullLabel}` : 'Min'} value={rv.min || ''}
                              onChange={(e) => { const formatted = formatNumber(e.target.value); handleFilterChange(id, { ...rv, min: formatted }); }} />
                            <input type="text" className="catbanner-input" placeholder={fullLabel ? `Max ${fullLabel}` : 'Max'} value={rv.max || ''}
                              onChange={(e) => { const formatted = formatNumber(e.target.value); handleFilterChange(id, { ...rv, max: formatted }); }} />
                          </div>
                        </div>
                      );
                    })}
                </div>

                {Object.keys(filterOptions)
                  .filter((id) => filterOptions[id].type === 'checkbox')
                  .map((id) => {
                    const f = filterOptions[id];
                    return (
                      <div key={id} className="catbanner-filter-item">
                        <div className="catbanner-checkbox">
                          <input type="checkbox" checked={Boolean(selectedFilters[id])} onChange={(e) => handleFilterChange(id, e.target.checked)} />
                          <label>{f.label || ''}</label>
                        </div>
                      </div>
                    );
                  })}

                <div className="catbanner-filter-buttons">
                  <button className="catbanner-search-button" onClick={handleSearch} type="button">
                    <FaSearch className="catbanner-button-icon" /> {labels.searchButton || 'Ara'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryBanner;
