/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Filtre Servisi
 * Filtre tanımları + filtrelenmiş ilan listesi. Şu an mockFilterData ile simüle edilir.
 * Gerçek API'de fakeFetchFilterData / client-side leaf batch + window._listingsCache kaldırılacak.
 * Path alias yok: /api/filters veya /listings/search kullanılmaz
 *   → GET /api/v1/categories/{categoryId}/filters
 *   → GET /api/v1/listings?...
 */

/** Host normalize → {host}/api/v1 */
function resolveFiltersApiBase(): string {
  const raw = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ''
  ).replace(/\/$/, '');
  if (!raw) return '/api/v1';
  if (/\/api\/v1$/i.test(raw)) return raw;
  const host = raw
    .replace(/\/api\/v1\/?$/i, '')
    .replace(/\/api\/?$/i, '')
    .replace(/\/v1\/?$/i, '');
  return `${host}/api/v1`;
}

const API_BASE_URL = resolveFiltersApiBase();
import { USE_API } from '@/api/config';

declare global {
  interface Window {
    _listingsCache: Record<string, any>;
  }
}

import locationService from '../location/locationService';

// Dinamik import kullanarak döngüsel bağımlılığı kırıyoruz
const getMockFilterData = async () => {
  const mockModule = await import('./mockFilterData');
  return mockModule;
};

const fetchFilterDefinitionsFromApi = async (categoryId: any) => {
  // categoryId undefined/null/boş ise BE'ye ".../categories/undefined/filters" gibi
  // geçersiz bir istek atılmasın — çağıran taraf categoryId'yi henüz belirlememiş demektir.
  if (categoryId === undefined || categoryId === null || categoryId === '' || Number.isNaN(Number(categoryId))) {
    console.warn(`[Filter API] Geçersiz categoryId (${categoryId}) — istek atlanıyor.`);
    return [];
  }

  if (USE_API) {
    console.log(`[Filter API] GET ${API_BASE_URL}/categories/${categoryId}/filters`);
    const response = await fetch(`${API_BASE_URL}/categories/${categoryId}/filters`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Filters API ${response.status}`);
    const json = await response.json();
    const data = json?.data ?? json;
    return Array.isArray(data) ? data : data?.filters || data?.definitions || [];
  }
  const { fetchFilterDefinitionsFromApi: getFilterDefinitions } = await getMockFilterData();
  return getFilterDefinitions(categoryId);
};

const fakeFetchFilterData = async (filterType: string, params: any = {}, apiKey = 'default') => {
  if (USE_API && filterType === 'filteredListings') {
    const qs = new URLSearchParams();
    const filters = params.filters || {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v != null && v !== '') { const key = k === 'categoryId' ? 'category_id' : String(k); if (key === 'category_id' && (v === 0 || v === '0')) return; qs.set(key, String(v)); }
    });
    if (params.page != null) qs.set('page', String(params.page));
    if (params.pageSize != null) qs.set('page_size', String(params.pageSize));
    if (params.sort) qs.set('sort', String(params.sort));
    const url = `${API_BASE_URL}/listings?${qs}`;
    console.log(`[Filter API] GET ${url}`);
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Listings API ${response.status}`);
    const json = await response.json();
    const body = json?.data ?? json;
    const listings = body?.listings || body?.items || (Array.isArray(body) ? body : []);
    return {
      listings,
      total: body?.total ?? body?.pagination?.total ?? listings.length,
      page: body?.page ?? params.page ?? 1,
      pageSize: body?.page_size ?? params.pageSize ?? 20,
    };
  }
  const { fakeFetchFilterData: fetchFilterData } = await getMockFilterData();
  return fetchFilterData(filterType, params, apiKey);
};

/**
 * Filtreleri insan tarafından okunabilir etiketlere dönüştürür
 * @param {Object} filters - Uygulanan filtreler
 * @param {number} categoryId - Kategori ID'si 
 * @returns {Array} - Görüntülenecek filtre etiketleri
 */
export const getFilterTags = async (filters: Record<string, any>, categoryId: any) => {
  try {
    if (!filters || Object.keys(filters).length === 0) {
      return [];
    }

    // API'den filtre seçeneklerini al
    const filterOptions = await getFilterOptions(categoryId);
    const filterTags = [];

    // API'den filtre tanımlarını al
    const filterDefinitions = await fetchFilterDefinitionsFromApi(categoryId);
    
    console.log(`Filtre etiketleri oluşturuluyor. ${Object.keys(filters).length} filtre, ${filterDefinitions.length} tanım`);
    
    // İlan tarihi için özel format
    if (filters.ilan_tarihi) {
      const days = Number(filters.ilan_tarihi);
      if (!isNaN(days)) {
        filterTags.push({
          id: 'ilan_tarihi',
          label: 'İlan Tarihi',
          value: `Son ${days} gün`,
          original: filters.ilan_tarihi
        });
      }
    }
    
    // Para birimi için sembol belirle (diğer filtreler için kullanılacak)
    let paraBirimiSembolu = "₺"; // Varsayılan TL sembolü
    if (filters.para_birimi) {
      switch(filters.para_birimi.toLowerCase()) {
        case 'usd':
        case 'dolar':
          paraBirimiSembolu = "$";
          break;
        case 'eur':
        case 'euro':
          paraBirimiSembolu = "€";
          break;
        case 'gbp':
        case 'sterlin':
          paraBirimiSembolu = "£";
          break;
        case 'tl':
        case 'try':
          paraBirimiSembolu = "₺"; // Açıkça TL seçilmişse de sembolü ayarla
          break;
        default:
          paraBirimiSembolu = "₺"; // Varsayılan TL
      }
    }
    
    // Fiyat filtreleri için özel format - her iki formatı da kontrol et (snake_case ve camelCase)
    if (filters.fiyat_min || filters.fiyatMin) {
      const fiyatMin = filters.fiyat_min || filters.fiyatMin;
      filterTags.push({
        id: 'fiyat_min',
        label: 'Fiyat Min',
        value: `${Number(fiyatMin).toLocaleString('tr-TR')} ${paraBirimiSembolu}`,
        original: fiyatMin,
        paraBirimi: filters.para_birimi || 'TL'
      });
    }
    
    if (filters.fiyat_max || filters.fiyatMax) {
      const fiyatMax = filters.fiyat_max || filters.fiyatMax;
      filterTags.push({
        id: 'fiyat_max',
        label: 'Fiyat Max',
        value: `${Number(fiyatMax).toLocaleString('tr-TR')} ${paraBirimiSembolu}`,
        original: fiyatMax,
        paraBirimi: filters.para_birimi || 'TL'
      });
    }
    
    // Net m² filtreleri için özel format
    if (filters.net_m2_min) {
      filterTags.push({
        id: 'net_m2_min',
        label: 'En Az Net m²',
        value: `${Number(filters.net_m2_min).toLocaleString('tr-TR')} m²`,
        original: filters.net_m2_min
      });
    }
    
    if (filters.net_m2_max) {
      filterTags.push({
        id: 'net_m2_max',
        label: 'En Çok Net m²',
        value: `${Number(filters.net_m2_max).toLocaleString('tr-TR')} m²`,
        original: filters.net_m2_max
      });
    }
    
    // Brüt m² filtreleri için özel format
    if (filters.brut_m2_min) {
      filterTags.push({
        id: 'brut_m2_min',
        label: 'En Az Brüt m²',
        value: `${Number(filters.brut_m2_min).toLocaleString('tr-TR')} m²`,
        original: filters.brut_m2_min
      });
    }
    
    if (filters.brut_m2_max) {
      filterTags.push({
        id: 'brut_m2_max',
        label: 'En Çok Brüt m²',
        value: `${Number(filters.brut_m2_max).toLocaleString('tr-TR')} m²`,
        original: filters.brut_m2_max
      });
    }
    
    // Özel durumlar (özel işleme tabi tutulanlar) hariç
    const specialKeys = [
      'categoryId', 'ilan_tarihi', 'para_birimi', 
      'fiyat_min', 'fiyat_max', 'fiyatMin', 'fiyatMax',
      'net_m2_min', 'net_m2_max', 
      'brut_m2_min', 'brut_m2_max'
    ];
    
    // Tüm filtreleri döngüyle kontrol et
    Object.keys(filters).forEach(key => {
      // Özel işleme tabi tutulan filtreler için işlem yapma
      if (specialKeys.includes(key) || filters[key] === undefined || filters[key] === null || filters[key] === '') {
        return;
      }
      
      // Filtreyi tanımlayan veriyi bul
      const filterDef = filterDefinitions.find((def: any) => def.id === key);
      
      // Min/Max filtreleri için özel işlem
      const isRangeMinFilter = key.endsWith('_min');
      const isRangeMaxFilter = key.endsWith('_max');
      const baseKey = isRangeMinFilter ? key.replace('_min', '') : 
                    isRangeMaxFilter ? key.replace('_max', '') : key;
                    
      // Filtre için insan tarafından okunabilir isim bulma
      let filterLabel = key;
      
      // Filtre tanımından label bul
      if (filterDef && filterDef.label) {
        filterLabel = filterDef.label;
      } 
      // Kategori filtrelerinden label bul
      else if (filterOptions.categoryFilters) {
        const categoryFilter = filterOptions.categoryFilters.find(
          filter => filter.id === key || filter.id === baseKey || 
                   filter.db_field === key || filter.db_field === baseKey
        );
        
        if (categoryFilter && categoryFilter.label) {
          filterLabel = isRangeMinFilter ? `En Az ${categoryFilter.label}` :
                       isRangeMaxFilter ? `En Çok ${categoryFilter.label}` :
                       categoryFilter.label;
        } else {
          // Hiçbir yerden bulunamadıysa, key'i formatlayarak kullan
          filterLabel = key.replace(/([A-Z])/g, ' $1')
                           .replace(/_/g, ' ')
                           .toLowerCase()
                           .split(' ')
                           .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                           .join(' ');
          
          if (isRangeMinFilter) filterLabel = `En Az ${filterLabel.replace(' Min', '')}`;
          if (isRangeMaxFilter) filterLabel = `En Çok ${filterLabel.replace(' Max', '')}`;
        }
      }
                    
      // Çoklu seçim (dizi değer) kontrolü
      if (Array.isArray(filters[key]) && filters[key].length > 0) {
        // Her bir değer için ayrı etiket oluştur
        filters[key].forEach((value, index) => {
          let displayValue = value;
          
          // Değer için insan tarafından okunabilir gösterim bul
          
          // 1. Önce filtre tanımlarında ara
          if (filterDef && filterDef.options) {
            const option = filterDef.options.find((opt: any) => 
              (typeof opt === 'object' && (opt.value === value || opt.id === value)) || 
              opt === value
            );
            
            if (option && typeof option === 'object' && option.label) {
              displayValue = option.label;
            } else if (option && typeof option !== 'object') {
              displayValue = option;
            }
          }
          
          // 2. Kategori filtrelerinde ara
          if (displayValue === value && filterOptions.categoryFilters) {
            const categoryFilter = (filterOptions as any).categoryFilters.find(
              filter => filter.id === key || filter.db_field === key
            );
            
            if (categoryFilter && categoryFilter.options) {
                const option = categoryFilter.options.find((opt: any) => 
                (typeof opt === 'object' && (opt.value === value || opt.id === value)) || 
                opt === value
                );
              
                if (option && typeof option === 'object' && option.label) {
                  displayValue = option.label;
              } else if (option && typeof option !== 'object') {
                  displayValue = option;
              }
            }
          }
          
          // Özel ID oluştur - çoklu seçim için indeks de içerecek şekilde
          const tagId = `${key}_${index}`;
          
          // Yeni etiket ekle
          filterTags.push({
            id: tagId, 
            originalId: key,
            label: filterLabel,
            value: displayValue,
            original: value,
            isMultiValue: true,
            valueIndex: index
          });
        });
      } 
      // Tek değerli filtreler
      else {
        let value = filters[key];
        let displayValue = value;
        
        // 1. Filtre tanımlarında değer için label ara
        if (filterDef) {
          // Değer formatlama - para birimi, birim vs.
        if (filterDef.formatting) {
          switch (filterDef.formatting) {
            case 'currency':
                // Para birimi formatlaması - direkt tutar ve birim birlikte
                displayValue = `${Number(value).toLocaleString('tr-TR')} ${filterDef.unit || 'TL'}`;
              break;
            case 'unit':
                displayValue = `${value} ${filterDef.unit || ''}`;
              break;
            case 'option':
              // Seçenek değerini label ile değiştir
              if (filterDef.options) {
                  const option = filterDef.options.find((opt: any) => 
                    (typeof opt === 'object' && (opt.value === value || opt.id === value)) || 
                    opt === value
                  );
                  
                  if (option && typeof option === 'object' && option.label) {
                    displayValue = option.label;
                  } else if (option && typeof option !== 'object') {
                    displayValue = option;
                  }
              }
              break;
            case 'boolean':
              // Boolean değeri
                displayValue = value === true || value === 'true' ? 'Evet' : 'Hayır';
              break;
            default:
              // Format tanımlanmamışsa değeri olduğu gibi kullan
            }
          }
        }
        
        // 2. Kategori filtrelerinde değer için label ara
        if (displayValue === value && filterOptions.categoryFilters) {
          const categoryFilter = filterOptions.categoryFilters.find(
            filter => filter.id === key || filter.id === baseKey || 
                     filter.db_field === key || filter.db_field === baseKey
          );
          
        if (categoryFilter) {
            // Birim varsa ekle
            if (categoryFilter.unit) {
              displayValue = `${value} ${categoryFilter.unit}`;
            }
            
            // Seçenekler varsa label bul
            if (categoryFilter.options) {
            const option = categoryFilter.options.find((opt: any) => 
                (typeof opt === 'object' && (opt.value === value || opt.id === value)) || 
                opt === value
            );
            
            if (option && typeof option === 'object' && option.label) {
                displayValue = option.label;
              } else if (option && typeof option !== 'object') {
                displayValue = option;
              }
            }
          }
        }
        
        
        // 4. Fiyatlar için özel formatlama - her zaman tutar ve birim birlikte
        if (key === 'fiyat' || key === 'fiyat_min' || key === 'fiyat_max') {
          const numValue = Number(String(value).replace(/[^0-9.-]+/g, ''));
          if (!isNaN(numValue)) {
            displayValue = `${numValue.toLocaleString('tr-TR')} ${paraBirimiSembolu}`;
          }
        }
          
          // Etiket ekle
          filterTags.push({
            id: key,
          label: filterLabel,
          value: displayValue,
            original: filters[key]
          });
      }
    });
    
    return filterTags;
  } catch (error) {
    console.error('Filtre etiketleri oluşturulurken hata:', error);
    return [];
  }
};

/**
 * Filtre tanımlamalarını getir (API'den gelecek)
 * @param {number} categoryId - Kategori ID
 * @returns {Promise<Array>} - Filtre tanımlamaları
 */
const getFilterDefinitions = async (categoryId: any) => {
  try {
    // API'den filtre tanımlarını doğrudan al
    return await fetchFilterDefinitionsFromApi(categoryId);
  } catch (error) {
    console.error('Filtre tanımları alınırken hata:', error);
    return [];
  }
};

/**
 * Belirli bir kategori ID'sine göre filtre seçeneklerini getirir
 * @param {string|number} categoryId - Kategori ID'si
 * @returns {Promise<Object>} - Filtre seçenekleri
 */
export const getFilterOptions = async (categoryId: any) => {
  try {
    console.log(`[getFilterOptions] Kategori ID ${categoryId} için filtre seçenekleri getiriliyor...`);
    console.log(`[Filters API] Hedef path: ${API_BASE_URL}/categories/${categoryId}/filters`);
    
    if (!categoryId) {
      console.error('getFilterOptions: categoryId parametresi gereklidir');
      return { 
        categoryFilters: [],
        filters: [],
        dynamicFiltersCount: 0
      };
    }
    
    // API'den temel filtre tanımlarını al
    const filterDefinitions = await fetchFilterDefinitionsFromApi(categoryId);
    console.log(`Kategori ${categoryId} için ${filterDefinitions.length} filtre tanımı alındı`);
    
    // Kategori filtreleri formatında düzenle
    const formattedFilters = filterDefinitions.map((filter: any) => {
      const normalizedOptions = (filter.options || []).map((opt: any) =>
        typeof opt === 'object' && opt !== null ? (opt.label ?? opt.value) : opt
      );
      return {
        id: filter.id,
        db_field: filter.db_field || filter.dbField || filter.id,
        label: filter.label,
        type: filter.type,
        display_location: filter.display_location || filter.displayLocation || 'default',
        priority: filter.priority !== undefined ? filter.priority : false,
        options: normalizedOptions,
        unit: filter.unit || '',
        formatting: filter.formatting || 'text',
        isRequired: filter.isRequired || false,
        allowMultiple: filter.allowMultiple || false,
        dependsOn: filter.dependsOn || null
      };
    });
    
    // API'den sadece ilgili kategoriye ait ilanları al
    const listingsData = await fakeFetchFilterData('filteredListings', { 
      filters: { categoryId: categoryId },
      page: 1,
      pageSize: 100 // Örnekleme amaçlı 100 ilan yeterli
    });
    
    const categoryListings = listingsData.listings || [];
    console.log(`[getFilterOptions] Kategori ID ${categoryId} için ${categoryListings.length} ilan bulundu.`);
    
    // İlanlardan dinamik filtreler oluşturmuyoruz, sadece API'den gelen tanımlı filtreleri kullanıyoruz
    
    return {
      filters: formattedFilters,
      categoryFilters: formattedFilters, 
      dynamicFiltersCount: 0,
      timestamp: new Date().toISOString(),
      category_id: Number(categoryId)
    };
  } catch (error) {
    console.error('Filtre seçenekleri alınırken hata oluştu:', error);
    return { 
      categoryFilters: [],
      filters: [],
      dynamicFiltersCount: 0
    };
  }
};

/**
 * GET /api/v1/listings, ilan konumunu `konum: { il, ilce, latitude, longitude }` şeklinde
 * iç içe döndürür (bkz. WebListingCardDTO). FilterResults / mapLocationService gibi bileşenler
 * harita için `listing.latitude` / `listing.longitude` alanlarını üst seviyede bekliyor;
 * burada ilanın kendi gerçek koordinatı varsa üst seviyeye taşınır (yoksa il/ilçe bazlı
 * geocoding fallback'i mapLocationService içinde zaten devrede kalır).
 */
function normalizeApiListing(raw: any) {
  if (!raw || typeof raw !== 'object') return raw;
  const lat = raw.konum?.latitude;
  const lng = raw.konum?.longitude;
  if (lat == null || lng == null) return raw;
  return { ...raw, latitude: lat, longitude: lng };
}

/**
 * Filtrelere göre ilanları getirir
 * @param {Object} filters - Uygulanan filtreler
 * @param {number} page - Sayfa numarası
 * @param {number} pageSize - Sayfa başına ilan sayısı
 * @param {string} sort - Sıralama kriteri (boş string veya undefined geldiğinde sıralama uygulanmaz)
 * @returns {Promise<Object>} - Filtrelenmiş ilanlar ve metadata
 */
export const getFilteredListings = async (filters: Record<string, any>, page: number | string = 1, pageSize: number | string = 20, sort?: string) => {
  try {
    console.log('[getFilteredListings] Filtreleme başlıyor. Filtreler:', filters);
    console.log(`[Filters API] Hedef path: ${API_BASE_URL}/listings`);

    if (USE_API) {
      const qs = new URLSearchParams();
      qs.set('page', String(page));
      qs.set('page_size', String(pageSize));
      if (sort) qs.set('sort', String(sort));
      Object.entries(filters || {}).forEach(([k, v]) => {
        if (v == null || v === '') return;
        const key = k === 'categoryId' ? 'category_id' : k; if (key === 'category_id' && (v === 0 || v === '0')) return;
        if (Array.isArray(v)) qs.set(key, v.join(','));
        else if (typeof v === 'object') qs.set(key, JSON.stringify(v));
        else qs.set(key, String(v));
      });
      const url = `${API_BASE_URL}/listings?${qs}`;
      console.log(`[Filter API] GET ${url}`);
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Listings API ${response.status}`);
      const json = await response.json();
      const body = json?.data ?? json;
      const rawListings = body?.listings || body?.items || (Array.isArray(body) ? body : []);
      const listings = rawListings.map(normalizeApiListing);
      const total = body?.total ?? body?.pagination?.total ?? listings.length;
      const pageNum = Number(page) || 1;
      const sizeNum = Number(pageSize) || 20;
      return {
        listings,
        totalPages: Math.ceil(Number(total) / sizeNum) || 1,
        totalListings: Number(total),
        currentPage: pageNum,
        pagination: body?.pagination || {
          page: pageNum,
          pageSize: sizeNum,
          total,
        },
      };
    }
  
    // Yapay gecikme kaldırıldı - performans optimizasyonu
  
    // Kategori ID tespiti - URL'den veya filtrelerde yoksa mevcut sayfadaki kategoriyi kullan
    let categoryId = null;
    
    // Filtrelerden kategori ID'yi al
    if (filters && filters.categoryId) {
      categoryId = Number(filters.categoryId);
    }
    
    // URL'den kategori ID'yi al (kat parametresi)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('kat') && !categoryId) {
      categoryId = Number(urlParams.get('kat'));
    }
    
    // URL'den category_id parametresi
    if (urlParams.has('category_id') && !categoryId) {
      categoryId = Number(urlParams.get('category_id'));
    }
    
    // URL'den ID olarak al (Kategori sayfalarında :id parametresi)
    if (window.location.pathname.includes('/kategori/') && !categoryId) {
      // /kategori/4 gibi bir URL'den kategori ID'sini çıkar
      const pathParts = window.location.pathname.split('/');
      const idParam = pathParts[pathParts.length - 1];
      if (/^\d+$/.test(idParam)) {
        categoryId = Number(idParam);
      }
    }
    
    // URL yolundan kategori ismini al 
    if (!categoryId) {
      const pathParts = window.location.pathname.split('/').filter(p => p);
      
      // Özel URL yol kontrollerini tamamen kaldır - varsayılan atama olmayacak
      if (pathParts.length >= 3) {
        console.log(`[getFilteredListings] URL yolundan kategori araması: ${pathParts.join('/')}`);
        // Kategorileri URL'den otomatik algılamaya çalışma
      }
    }
    
    // URL'den kategorileri algılama mekanizmasında değişiklik
    // /filtrele/ URL'sinde kategori ID algılanmalı ama varsayılan atanmamalı
    if (!categoryId && window.location.pathname.includes('/filtrele/')) {
      const pathParts = window.location.pathname.split('/');
      const categoryIndex = pathParts.indexOf('filtrele') + 1;
      if (categoryIndex < pathParts.length && /^\d+$/.test(pathParts[categoryIndex])) {
        categoryId = Number(pathParts[categoryIndex]);
        console.log(`[getFilteredListings] /filtrele/ URL'inden kategori ID bulundu: ${categoryId}`);
      }
    }
    
    // Özel durum: "tum-ilanlar" URL'si için kategori ID 0 olarak ayarlandı
    // Bu durumda tüm kategorilerde arama yapacağız
    const isTumIlanlar = window.location.pathname.includes('/filtrele/tum-ilanlar');
    
    // Kategori ID hala bulunamadıysa, ama tum-ilanlar ise devam et
    if (!categoryId && !isTumIlanlar) {
      console.log('[getFilteredListings] Kategori ID bulunamadı, ilan bulunamayacak');
      
      // Varsayılan kategori ataması yapmadan doğrudan boş sonuç döndür
      return {
        listings: [],
        totalPages: 0,
        totalListings: 0,
        currentPage: page,
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalListings: 0
        },
        error: 'Kategori bulunamadı'
      };
    } else {
      if (isTumIlanlar) {
        console.log('[getFilteredListings] Tüm ilanlar sayfası: Kategori kısıtlaması olmadan filtreleme yapılacak');
        categoryId = 0; // Tüm kategoriler için özel ID
      } else {
        console.log(`[getFilteredListings] Tespit edilen kategori ID: ${categoryId}`);
      }
    }
    
    // Kategori ID'yi filtrelere ekle
    const enhancedFilters = { 
      ...filters, 
      categoryId 
    };
    
    // Boş veya tanımsız filtreler için kontrol
    if (!enhancedFilters || Object.keys(enhancedFilters).length === 0) {
      console.warn('getFilteredListings: Filtreler boş, sadece kategori ID ile filtreleme yapılacak');
      enhancedFilters.categoryId = categoryId;
    }
    
    // Konum filtrelerini düzenleyen fonksiyon
    const normalizedFilters = normalizeLocationFilters(enhancedFilters);

    // İstanbul ilçe filtresi kontrolü - geliştirme amaçlı
    if (normalizedFilters.il && normalizedFilters.ilce && 
        (normalizedFilters.il.includes("İstanbul") || 
        normalizedFilters.il === "İstanbul")) {
      console.log(`İSTANBUL İLÇE FİLTRELEMESİ: ${normalizedFilters.ilce}`);
    }

    // URL'den gelen string sayfa parametrelerini düzelt
    let pageNum: number = typeof page === 'string' ? parseInt(page, 10) || 1 : page;
    let pageSizeNum: number = typeof pageSize === 'string' ? parseInt(pageSize, 10) || 20 : pageSize;
    
    console.log(`[getFilteredListings] Filtreleme parametreleri hazır:`, normalizedFilters);
    
    // Kategori ve tüm alt kategorilerin dip kategorilerini getir
    const { getLeafCategoryIds } = await import('./categoryTreeService');
    const leafCategoryIds = await getLeafCategoryIds(categoryId);
    console.log(`[getFilteredListings] Kategori ${categoryId} ve ${leafCategoryIds.length - 1} alt dip kategorileri ile filtreleme yapılıyor`);
    
    // Yapay gecikme kaldırıldı - performans optimizasyonu
    
    // Önbellek kontrolü - aynı kategoriler için tekrar tekrar sorgu yapmayı engelleyelim
    const listingsCacheKey = `listings_${JSON.stringify(normalizedFilters)}_${sort || 'default'}`;
    
    // Geçici bir önbellek olarak kullanılacak objemiz
    if (!window._listingsCache) {
      window._listingsCache = {};
    }
    
    // Önbellekte bu sorgu var mı kontrol edelim
    if (window._listingsCache[listingsCacheKey]) {
      console.log('[getFilteredListings] Önbellekten sonuçlar alınıyor');
      const cachedData = window._listingsCache[listingsCacheKey];
      
      // Sayfalama için tam veriyi keserek döndürelim
      const startIndex = (pageNum - 1) * pageSizeNum;
      const endIndex = startIndex + pageSizeNum;
      
      return {
        listings: cachedData.allListings.slice(startIndex, endIndex),
        totalPages: cachedData.totalPages,
        totalListings: cachedData.allListings.length,
        currentPage: pageNum,
        pagination: {
          currentPage: pageNum,
          totalPages: cachedData.totalPages,
          totalListings: cachedData.allListings.length
        }
      };
    }
    
    // OPTİMİZASYON: Tüm alt kategorileri paralel olarak işle
    // Paralel işleme kapasitesi artırıldı
    const BATCH_SIZE = 25; // Aynı anda 25 kategori işle
    let allListings = [];
    
    // Özel durum: tum-ilanlar için tüm kategorileri getir
    // Kategori ID 0 ise, tüm kategorileri getir
    let categoriesToProcess = leafCategoryIds;
    
    if (isTumIlanlar || categoryId === 0) {
      console.log('[getFilteredListings] Tüm kategorilerde arama yapılıyor');
      // Tüm kategorileri getirmek için özel bir istek kullanılacak
      // API servisimiz simüle edildiği için burada tüm kategorileri içeren bir istek yapalım
      
      // Vitrin durumu filtresi varsa, sadece vitrin ilanlarını getir
      const hasVitrinFilter = filters.vitrin_durumu === 'vitrin' || urlParams.get('vitrin_durumu') === 'vitrin';
      const hasOneCikanFilter = filters.vitrin_durumu === 'one_cikan' || urlParams.get('vitrin_durumu') === 'one_cikan';
      
      if (hasVitrinFilter) {
        console.log('[getFilteredListings] Vitrin ilanları filtresi aktif: Sadece vitrin ilanları getirilecek');
        
        // Vitrin servisi kullanarak tüm vitrin ilanlarını getir
        try {
          const { default: vitrinService } = await import('../listings/vitrin-listings');
          const vitrinListings = await vitrinService.getVitrinListings(500); // 500 adet vitrin ilanı getir
          
          if (vitrinListings && vitrinListings.length > 0) {
            console.log(`[getFilteredListings] Toplam ${vitrinListings.length} vitrin ilanı bulundu`);
            allListings = vitrinListings;
          } else {
            console.log('[getFilteredListings] Vitrin ilanı bulunamadı');
          }
          
          // Diğer kategorilerden ilan getirmeye gerek yok
          categoriesToProcess = [];
        } catch (error) {
          console.error('Vitrin ilanları alınamadı:', error);
          // Hata durumunda normal şekilde devam et
        }
      }
    }
    
    // TÜM kategorileri tek seferde paralel olarak işle
    console.log(`[getFilteredListings] ${categoriesToProcess.length} kategori paralel olarak işleniyor`);
    
    try {
      // Tüm kategorileri tek seferde paralel olarak işle
      const allCategoryPromises = categoriesToProcess.map((leafCategoryId: any) => {
        const categoryFilters = { 
          ...normalizedFilters,
          categoryId: leafCategoryId
        };
        
        const params = {
          filters: categoryFilters,
          page: 1,
          pageSize: 1500, // Her kategoriden maksimum ilan sayısı
          sort: sort || undefined
        };
        
        // Her kategori için ilanları getir
        return fakeFetchFilterData('filteredListings', params)
          .then(response => {
            if (response && response.listings && response.listings.length > 0) {
              console.log(`[getFilteredListings] Kategori ${leafCategoryId} için ${response.listings.length} ilan alındı`);
              return response.listings;
            }
            return [];
          })
          .catch(err => {
            console.error(`Kategori ${leafCategoryId} için ilan getirme hatası:`, err);
            return []; // Hata durumunda boş dizi döndür
          });
      });
      
      // Tüm kategori isteklerini paralel olarak bekle
      const categoryResults = await Promise.all(allCategoryPromises);
      
      // Tüm kategori sonuçlarını birleştir
      allListings = categoryResults.flat();
      console.log(`[getFilteredListings] Toplam ${allListings.length} ilan bulundu`);
    } catch (error) {
      console.error('[getFilteredListings] Kategori işleme hatası:', error);
    }
    
    // Tüm ilanları sırala (sort parametresine göre)
    if (sort) {
      // sort parametresini ayrıştır (örn: "fiyat_artan" veya "fiyat_azalan")
      const [field, direction] = sort.split('_');
      const isAscending = direction === 'artan';
      
      allListings.sort((a: any, b: any) => {
        // Sıralama alanına göre karşılaştır
        if (field === 'fiyat') {
          const priceA = parseFloat(a.fiyat) || 0;
          const priceB = parseFloat(b.fiyat) || 0;
          return isAscending ? priceA - priceB : priceB - priceA;
        } else if (field === 'tarih') {
          const dateA = new Date(a.ilan_tarihi || 0);
          const dateB = new Date(b.ilan_tarihi || 0);
          return isAscending ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
        }
        return 0;
      });
    }
    
    // Sonuçları önbelleğe al
    const totalListingsCount = allListings.length;
    const totalPagesCount = Math.ceil(totalListingsCount / pageSizeNum);
    
    // Tüm sonuçları önbelleğe kaydet (sayfalama için)
    window._listingsCache[listingsCacheKey] = {
      allListings: allListings,
      totalPages: totalPagesCount,
      timestamp: Date.now() // Önbellek zaman damgası - eski verileri temizlemek için kullanılabilir
    };
    
    // Önbellek boyutu kontrolü - çok büyümesini engelle
    const CACHE_MAX_ITEMS = 15; // Daha fazla önbellek tutuyoruz
    const cacheKeys = Object.keys(window._listingsCache);
    
    if (cacheKeys.length > CACHE_MAX_ITEMS) {
      console.log(`[getFilteredListings] Önbellek büyüklük kontrolü: ${cacheKeys.length} anahtar var, en eski ${cacheKeys.length - CACHE_MAX_ITEMS} anahtar temizleniyor`);
      
      // En eski olanları temizle
      const oldestKeys = cacheKeys
        .map(key => ({ key, timestamp: window._listingsCache[key].timestamp || 0 }))
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(0, cacheKeys.length - CACHE_MAX_ITEMS)
        .map(item => item.key);
      
      oldestKeys.forEach(key => {
        delete window._listingsCache[key];
      });
    }
    
    console.log(`[getFilteredListings] ${totalListingsCount} ilan bulundu, önbelleğe alındı`);
    
    // Sayfalama için sonuçları kes
    const startIndex = (pageNum - 1) * pageSizeNum;
    const endIndex = startIndex + pageSizeNum;
    const paginatedListings = allListings.slice(startIndex, endIndex);
    
    return {
      listings: paginatedListings,
      totalPages: totalPagesCount,
      totalListings: totalListingsCount,
      currentPage: pageNum,
      pagination: {
        currentPage: pageNum,
        totalPages: totalPagesCount,
        totalListings: totalListingsCount
      }
    };
  } catch (error) {
    console.error('getFilteredListings error:', error);
    // Hata durumunda boş sonuç döndür
    return {
      listings: [],
      totalPages: 0,
      totalListings: 0,
      currentPage: 1,
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalListings: 0
      },
      error: (error as any)?.message || 'Filtreleme işlemi sırasında bir hata oluştu'
    };
  }
};

/**
 * Filtreleri URL'e dönüştürür
 * @param {Object} filters - Aktif filtreler objesi
 * @param {number} categoryId - Kategori ID'si
 * @returns {string} - Oluşturulan URL query string
 */
export async function buildFilterUrl(filters: Record<string, any>, categoryId: any) {
  try {
    // API'den filtre tanımlarını al
    const filterDefinitions = await fetchFilterDefinitionsFromApi(categoryId);
    
    // Filtre tanımları ve değerleri kullanılarak URL parametreleri oluştur
    const urlParams = [];
    
    // Her filtre için API'den gelen urlParam değerini kullanarak URL parametresi oluştur
    for (const [key, value] of Object.entries(filters)) {
      // Değeri null, undefined veya boş ise URL'e ekleme
      if (value === null || value === undefined || value === '') continue;
      
      // categoryId özel işlem
      if (key === 'categoryId') {
        urlParams.push(`kat=${encodeURIComponent(String(value))}`);
        continue;
      }
      
      // Bu filtre için tanım bul
      const filterDef = filterDefinitions.find((filter: any) => filter.id === key);
      
      // Eğer filtre tanımı bulunamadıysa veya urlParam yoksa basit kural uygula
      if (!filterDef || !filterDef.urlParam) {
        // Özel filtre tanımı yoksa key'i direkt URL param olarak kullan
        urlParams.push(`${key}=${encodeURIComponent(String(value))}`);
      } else {
        // Filtre değerini URL parametresi olarak ekle
        urlParams.push(`${filterDef.urlParam}=${encodeURIComponent(String(value))}`);
      }
    }
    
    // URL parametrelerini birleştir ve döndür
    return urlParams.length > 0 ? `?${urlParams.join('&')}` : '';
  } catch (error) {
    console.error('URL oluşturulurken hata:', error);
    // Hata durumunda basit bir yöntemle URL oluştur
    const basicUrlParams = Object.entries(filters)
      .filter(([_, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`);
    
    return basicUrlParams.length > 0 ? `?${basicUrlParams.join('&')}` : '';
  }
}

/**
 * URL'den filtre değerlerini parse eder
 * @param {string} url - Parse edilecek URL
 * @param {number} categoryId - Kategori ID'si
 * @returns {Object} - Filtreleri içeren obje
 */
export async function parseFilterFromUrl(url: string, categoryId: any) {
  try {
    // API'den filtre tanımlarını al
    const filterDefinitions = await fetchFilterDefinitionsFromApi(categoryId);
    
    // Boş bir filtre objesi oluştur
    const filters: Record<string, any> = {};
    
    // URL'de herhangi bir parametre yoksa boş filtre objesi döndür
    if (!url.includes('?')) return filters;
    
    // URL'den parametreleri çıkar
    const queryString = url.split('?')[1];
    const queryParams = new URLSearchParams(queryString);
    
    // Kategori ID'si için özel kontrol
    if (queryParams.has('kat')) {
      filters.categoryId = queryParams.get('kat');
    }
    
    // Her bir URL parametresi için
    for (const [param, value] of queryParams.entries()) {
      // Kategori ID özel işlemi
      if (param === 'kat') continue;
      
      // API'den gelen filtre tanımlarını kullanarak URL param'ından filtre ID'sini bul
      const filterDef = filterDefinitions.find((filter: any) => filter.urlParam === param);
      
      // Eğer filtre tanımı bulunamadıysa param'ı direkt filtre key'i olarak kullan
      if (!filterDef) {
        filters[param] = value;
      } else {
        // URL parametresi için filtre tanımı bulundu
        // Değeri tiplerine göre dönüştür
        if (filterDef.type === 'number') {
          filters[filterDef.id] = Number(value);
        } else if (filterDef.type === 'boolean') {
          filters[filterDef.id] = value === 'true';
        } else {
          filters[filterDef.id] = value;
        }
      }
    }
    
    return filters;
  } catch (error) {
    console.error('URL parse edilirken hata:', error);
    
    // Hata durumunda basit bir yöntemle parse et
    const filters: Record<string, any> = {};
    
    if (!url.includes('?')) return filters;
    
    const queryString = url.split('?')[1];
    const queryParams = new URLSearchParams(queryString);
    
    for (const [param, value] of queryParams.entries()) {
      filters[param] = value;
    }
    
    return filters;
  }
}

/**
 * Filtre değerlerinden başlık formatları oluşturur
 * @param {Object} filters - Uygulanan filtreler
 * @returns {Array} - Başlık formatları listesi
 */
export const createFilterTags = (filters: Record<string, any>) => {
  const tags = [];
  
  // Filtrelerin bir kopyasını oluştur (orijinali değiştirmemek için)
  const filtersCopy = { ...filters };
  
  try {
    // Fiyat filtreleri
    const fiyatMin = filtersCopy.fiyat_min || filtersCopy.fiyatMin;
    const fiyatMax = filtersCopy.fiyat_max || filtersCopy.fiyatMax;
    const paraBirimi = filtersCopy.para_birimi || '₺';
    
    // Fiyat_min ve fiyatMin aynı anda varsa sadece birini kullan
    if (fiyatMin) {
      // Fiyat formatlaması
      const formattedMin = formatPrice(fiyatMin);
      
      if (fiyatMax) {
        // Hem min hem max varsa
        const formattedMax = formatPrice(fiyatMax);
        tags.push({
          id: 'price-range',
          label: `${formattedMin} - ${formattedMax} ${paraBirimi}`,
          filters: ['fiyat_min', 'fiyatMin', 'fiyat_max', 'fiyatMax']
        });
      } else {
        // Sadece min varsa
        tags.push({
          id: 'price-min',
          label: `Min: ${formattedMin} ${paraBirimi}`,
          filters: ['fiyat_min', 'fiyatMin']
        });
      }
      
      // İşlendiği için kaldır
      delete filtersCopy.fiyat_min;
      delete filtersCopy.fiyatMin;
      delete filtersCopy.fiyat_max;
      delete filtersCopy.fiyatMax;
    } else if (fiyatMax) {
      // Sadece max varsa
      const formattedMax = formatPrice(fiyatMax);
      tags.push({
        id: 'price-max',
        label: `Max: ${formattedMax} ${paraBirimi}`,
        filters: ['fiyat_max', 'fiyatMax']
      });
      
      // İşlendiği için kaldır
      delete filtersCopy.fiyat_max;
      delete filtersCopy.fiyatMax;
    }
    
    // Diğer filtreler için etiket oluştur
    Object.entries(filtersCopy).forEach(([key, value]) => {
      // Özel format gerektiren filtreler
      if (key === 'para_birimi') return; // Para birimi etikette gösterilmez
      
      // Genel filtre etiketleri
      if (value !== undefined && value !== null && value !== '') {
        tags.push({
          id: key,
          label: `${formatFilterLabel(key)}: ${formatFilterValue(key, value)}`,
          filters: [key]
        });
      }
    });
  } catch (error) {
    console.error('Etiket oluşturma hatası:', error);
  }
  
  return tags;
};

/**
 * Filtre anahtarlarını insan okunaklı başlıklara dönüştürür
 * @param {string} key - Filtre anahtarı
 * @returns {string} - Formatlanmış başlık
 */
export const formatFilterLabel = (key: string) => {
  // Genel format: snake_case veya camelCase -> İnsan Okunaklı
  const cleanKey = key.replace(/_min$|Min$|_max$|Max$/, '');
  
  // Özel durumlar
  const specialLabels = {
    'fiyat': 'Fiyat',
    'kategori_id': 'Kategori',
    'is_takasli': 'Takaslı',
    'has_foto': 'Fotoğraflı',
    'il_id': 'İl',
    'ilce_id': 'İlçe',
    'mahalle_id': 'Mahalle',
    'ilan_tarihi': 'İlan Tarihi',
    'net_m2': 'Net m²',
    'brut_m2': 'Brüt m²',
    'oda_sayisi': 'Oda Sayısı',
    'bina_yasi': 'Bina Yaşı',
    'kat': 'Kat',
    'para_birimi': 'Para Birimi'
  };
  
  if ((specialLabels as Record<string, string>)[cleanKey]) {
    return (specialLabels as Record<string, string>)[cleanKey];
  }
  
  // Genel format dönüşümü
  return cleanKey
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .split(' ')
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Filtre değerlerini insan okunaklı formata dönüştürür
 * @param {string} key - Filtre anahtarı
 * @param {any} value - Filtre değeri
 * @returns {string} - Formatlanmış değer
 */
export const formatFilterValue = (key: string, value: any): string => {
  // Boolean değerler
  if (typeof value === 'boolean') {
    return value ? 'Evet' : 'Hayır';
  }
  
  // Fiyat formatlaması
  if (key.startsWith('fiyat') || key === 'price') {
    return formatPrice(value);
  }
  
  // Diğer durumlar için direkt değeri dön
  return value.toString();
};

/**
 * Fiyat değerini formatlar
 * @param {number|string} price - Formatlanacak fiyat
 * @returns {string} - Formatlanmış fiyat
 */
export const formatPrice = (price: any): string => {
  if (!price) return '';
  
  // Sayıya dönüştür
  const numericPrice = Number(price);
  if (isNaN(numericPrice)) return price.toString();
  
  // Formatlama (1000 -> 1.000)
  return numericPrice.toLocaleString('tr-TR');
};

// Konum filtrelerini düzenleyen fonksiyon
const normalizeLocationFilters = (filters: Record<string, any>) => {
  if (!filters) return {};
  
  const normalizedFilters = { ...filters };
  
  // İl için tam eşleşme
  if (normalizedFilters.il && normalizedFilters.il !== '') {
    // İl değerini olduğu gibi kullan
    normalizedFilters.il = normalizedFilters.il.toString();
    console.log("Filtreleme için il:", normalizedFilters.il);
  }
  
  // İlçe için - tekil veya çoklu olabilir
  if (normalizedFilters.ilce && normalizedFilters.ilce !== '') {
    // İlçe dizi mi yoksa tekil değer mi kontrol et
    if (Array.isArray(normalizedFilters.ilce)) {
      // Dizi gelirse olduğu gibi koru (OR mantığıyla filtreleme için)
      console.log("Filtreleme için çoklu ilçe:", normalizedFilters.ilce);
    } else {
      // Tekil değerse string'e çevir
      normalizedFilters.ilce = normalizedFilters.ilce.toString();
      console.log("Filtreleme için tekil ilçe:", normalizedFilters.ilce);
    }
    
    // Filtreleme sırasında hata ayıklama için İstanbul kontrolü
    if (normalizedFilters.il && (
        normalizedFilters.il.includes("İstanbul") || 
        normalizedFilters.il === "İstanbul" ||
        normalizedFilters.il === "İstanbul Avrupa Yakası" ||
        normalizedFilters.il === "İstanbul Anadolu Yakası")) {
      console.log("İstanbul için ilçe filtresi uygulanıyor:", normalizedFilters.ilce);
    }
  }
  
  // Mahalle/köy için - tekil veya çoklu olabilir
  if (normalizedFilters.mahalle && normalizedFilters.mahalle !== '') {
    // Mahalle değeri dizi mi yoksa tekil değer mi kontrol et
    if (Array.isArray(normalizedFilters.mahalle)) {
      // Dizi gelirse olduğu gibi koru (OR mantığıyla filtreleme için)
      console.log("Filtreleme için çoklu mahalle:", normalizedFilters.mahalle);
    } else {
      // Tekil değerse string'e çevir
      normalizedFilters.mahalle = normalizedFilters.mahalle.toString();
      console.log("Filtreleme için tekil mahalle:", normalizedFilters.mahalle);
    }
  }
  
  return normalizedFilters;
};

/**
 * İl ve ilçe verilerini birlikte getirir
 * @returns {Object} - İl ve ilçe verileri
 */
const getIlIlceData = async () => {
  try {
    return await locationService.getIlIlceData();
  } catch (error) {
    console.error('İl-ilçe verileri alınırken hata oluştu:', error);
    return {
      provinces: [],
      districtsMap: {}
    };
  }
};

/**
 * İl, ilçe ve mahalle verilerini birlikte getirir
 * @returns {Object} - İl, ilçe ve mahalle verileri
 */
const getLocationData = async () => {
  try {
    // İl ve ilçe verilerini al
    const { provinces, districtsMap } = await getIlIlceData();
    
    // İlçe -> mahalle eşleşmelerini oluştur
    const neighborhoodsMap: Record<string, any> = {};
    
    // Her il için
    for (const province of provinces) {
      const districts = districtsMap[province] || [];
      
      // Her ilçe için
      for (const district of districts) {
        // İlçe anahtarını oluştur
        const districtKey = `${province}-${district}`;
        
        // İlçeye ait mahalleleri al
        neighborhoodsMap[districtKey] = await locationService.getQuartersByDistrict(province, district);
      }
    }
    
    return {
      provinces,
      districtsMap,
      neighborhoodsMap
    };
  } catch (error) {
    console.error('Konum verileri alınırken hata oluştu:', error);
    return {
      provinces: [],
      districtsMap: {},
      neighborhoodsMap: {}
    };
  }
};

/**
 * İl, ilçe ve mahalle verilerini kademeli olarak getiren fonksiyon
 * @param {Array} activeFilters - Aktif filtreler
 * @returns {Promise<Object>} - Konum filtreleri seçenekleri
 */
export const getLocationFilterOptions = async (activeFilters: Record<string, any>) => {
  try {
    // İl listesini al
    const provinces = await locationService.getAllCities();
    
    // İl seçilmişse ilçe listesini al - tam eşleşme
    let districts: any[] = [];
    if (activeFilters?.il) {
      // İl adını olduğu gibi kullan
      districts = await locationService.getDistrictsByCity(activeFilters.il);
    }
    
    // İlçe seçilmişse mahalle listesini al - tam eşleşme
    let neighborhoods: any[] = [];
    if (activeFilters?.il && activeFilters?.ilce) {
      // İl ve ilçe adlarını olduğu gibi kullan
      neighborhoods = await locationService.getQuartersByDistrict(activeFilters.il, activeFilters.ilce);
    }
    
    return {
      provinces,
      districts,
      neighborhoods
    };
  } catch (error) {
    console.error('Konum filtre seçenekleri alınırken hata oluştu:', error);
    return {
      provinces: [],
      districts: [],
      neighborhoods: []
    };
  }
};

// Lokasyon ile ilgili fonksiyonları dışa aktar
export {
  getIlIlceData,
  getLocationData
};