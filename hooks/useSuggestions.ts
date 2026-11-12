'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getSuggestions,
  searchProducts,
  fetchCategories,
  searchCategories,
} from '@/services/search/SearchcategoryService';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { sanitizeSearchQuery } from '@/utils/sanitizeInput';
import urlService from '@/services/utils/urlService';

interface RecentSearchItem {
  text: string;
  timestamp: string;
}

interface Suggestion {
  name?: string;
  id?: string | number;
  type?: string;
  [key: string]: unknown;
}

interface CategorySuggestion {
  id: string;
  name: string;
  type: 'category';
  path: string[];
  pathString: string;
  score: number;
}

interface ListingSuggestion {
  id: string | number | undefined;
  ilan_id: string | number | undefined;
  name: string;
  type: 'listing';
  title: string;
  location: string;
  price: string;
  imageUrl: string;
  category_id: string | number | undefined;
  kategori: string;
  alt_kategori: string;
  alt_alt_kategori: string;
  kategoriYolu: unknown;
  baslik: string;
}

interface CacheEntry {
  data: Suggestion[];
  timestamp: number;
}

/** Canlı BE'den dönen ilan (listing) alanları — GET /api/v1/listings?q= */
interface ListingApiItem {
  id?: string | number;
  ilan_id?: string | number;
  title?: string;
  baslik?: string;
  price?: string | number;
  currency?: string;
  locationCity?: string;
  locationDistrict?: string;
  city?: string;
  district?: string;
  imageUrls?: string[];
  image?: string;
  categoryId?: string | number;
  category_id?: string | number;
  categoryName?: string;
  subCategoryName?: string;
  [key: string]: unknown;
}

/**
 * Arama önerilerini yönetecek hook
 *
 * @param initialQuery - Başlangıç arama sorgusu
 * @param debounceDelay - Yeni aramalar için bekleme süresi (ms)
 * @returns Öneri durumu ve kontrol fonksiyonları
 */
const useSuggestions = (initialQuery = '', debounceDelay = 300) => {
  // Temizlenmiş başlangıç sorgusu
  const cleanInitialQuery = sanitizeSearchQuery(initialQuery);

  // Son aramaları localStorage'dan getir
  const getRecentSearches = (): string[] => {
    try {
      const recentSearches = localStorage.getItem('recentSearches');
      if (!recentSearches) return [];

      const parsedSearches: RecentSearchItem[] = JSON.parse(recentSearches);

      // Şimdi 5 günden eski aramaları temizle
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      // Güncel aramaları filtrele
      const validSearches = parsedSearches.filter((item) => {
        const searchDate = new Date(item.timestamp);
        return searchDate > fiveDaysAgo;
      });

      // Filtrelenmiş aramaları tekrar kaydet (temizlik)
      if (validSearches.length !== parsedSearches.length) {
        localStorage.setItem('recentSearches', JSON.stringify(validSearches));
      }

      // Sadece arama metinlerini dön
      return validSearches.map((item) => item.text);
    } catch (e) {
      console.error('Son aramalar yüklenirken hata oluştu:', e);
      return [];
    }
  };

  // Son aramayı kaydet
  const saveRecentSearch = (searchQuery: string): void => {
    try {
      if (!searchQuery || searchQuery.trim() === '') return;

      // Mevcut aramaları al
      const recentSearches = localStorage.getItem('recentSearches');
      let searches: RecentSearchItem[] = recentSearches ? JSON.parse(recentSearches) : [];

      // Aynı aramayı listeden çıkar
      searches = searches.filter(
        (item) => item.text.toLowerCase() !== searchQuery.toLowerCase()
      );

      // Yeni aramayı zaman damgası ile ekle
      searches.unshift({
        text: searchQuery,
        timestamp: new Date().toISOString()
      });

      // En fazla 15 aramayı sakla
      searches = searches.slice(0, 15);

      // Güncellenmiş listeyi kaydet
      localStorage.setItem('recentSearches', JSON.stringify(searches));
    } catch (e) {
      console.error('Son arama kaydedilirken hata oluştu:', e);
    }
  };

  // State'leri tanımla
  const [query, setQuery] = useState(cleanInitialQuery);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [relatedCategories, setRelatedCategories] = useState<CategorySuggestion[]>([]);
  const [popularListings, setPopularListings] = useState<ListingSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Önbellek mekanizması için
  const cacheRef = useRef<Record<string, CacheEntry>>({});

  // Sorgu limitleme mekanizması
  const requestTimeRef = useRef(0);
  const minRequestInterval = 200; // ms - biraz daha hızlandırıldı

  // Sorguyu debounce et - biraz daha hızlandırıldı
  const debouncedQuery = useDebouncedValue(query, debounceDelay);

  /**
   * Benzer kategorileri getir
   * @param searchQuery - Arama sorgusu
   * @returns Benzer kategoriler listesi
   */
  const fetchRelatedCategories = useCallback(async (searchQuery: string): Promise<CategorySuggestion[]> => {
    // Çok kısa sorgular için boş dizi döndür
    if (!searchQuery || searchQuery.trim().length < 2) {
      return [];
    }

    try {
      // Canlı BE'den kategori ağacını al (GET /api/v1/categories) ve
      // client-side fuzzy eşleştirme uygula (SearchcategoryService.searchCategories)
      const categoriesData = await fetchCategories();
      const matches = searchCategories(searchQuery, categoriesData);

      return matches.map((m) => ({
        // Gerçek (numeric) kategori ID'si korunmalı — navigasyon bu id ile
        // urlService.getCategoryPathByIdAsync/createFilterUrlFromPath'e gidiyor.
        // ID yoksa (beklenmeyen durum) rastgele bir anahtar üret ama bunu
        // asla gerçek bir kategori ID'si gibi kullanma.
        id: m.id != null ? String(m.id) : '',
        name: m.name,
        type: 'category' as const,
        path: m.path,
        pathString: m.pathString,
        score: m.score,
      }));
    } catch (error: unknown) {
      console.error('Benzer kategoriler getirilemedi:', error);
      return [];
    }
  }, []);

  /**
   * Popüler ilanları getir
   * @param searchQuery - Arama sorgusu
   * @returns Popüler ilanlar listesi
   */
  const fetchPopularListings = useCallback(async (searchQuery: string): Promise<ListingSuggestion[]> => {
    // Çok kısa sorgular için boş dizi döndür
    if (!searchQuery || searchQuery.trim().length < 2) {
      return [];
    }

    try {
      // Canlı BE'den ilan arama: GET /api/v1/listings?q=
      const results = (await searchProducts(searchQuery)) as ListingApiItem[];
      const filteredListings = results.slice(0, 5);

      // İlanları kullanılabilir formata dönüştür
      return Promise.all(
        filteredListings.map(async (ilan): Promise<ListingSuggestion> => {
          const ilanId = ilan.id ?? ilan.ilan_id;
          const title = ilan.title || ilan.baslik || 'İlan Başlığı';

          const city = ilan.locationCity || ilan.city || '';
          const district = ilan.locationDistrict || ilan.district || '';
          const location = city ? `${city}${district ? ', ' + district : ''}` : 'Konum belirtilmemiş';

          const numericPrice = ilan.price !== undefined && ilan.price !== null ? Number(ilan.price) : NaN;
          const price = !isNaN(numericPrice)
            ? `${numericPrice.toLocaleString('tr-TR')} ${ilan.currency || '₺'}`
            : 'Fiyat Sorunuz';

          const imageUrl =
            (Array.isArray(ilan.imageUrls) ? ilan.imageUrls[0] : undefined) ||
            ilan.image ||
            '/placeholder-image.jpg';

          const categoryId = ilan.categoryId ?? ilan.category_id;

          // İlan için kategori yolunu canlı BE'den al (GET /categories/{id}/path)
          let kategoriYolu: unknown = null;
          if (categoryId) {
            try {
              const categoryPath = await urlService.getCategoryPathByIdAsync(categoryId);
              if (categoryPath && categoryPath.length > 0) {
                kategoriYolu = categoryPath;
              }
            } catch (err) {
              console.error('Kategori yolu oluşturma hatası:', err);
            }
          }

          return {
            id: ilanId,
            ilan_id: ilanId, // SEO dostu URL için gerekli
            name: title,
            type: 'listing',
            title: title,
            location: location,
            price: price,
            imageUrl: imageUrl,
            // SEO dostu URL için gerekli kategori bilgileri
            category_id: categoryId,
            kategori: ilan.categoryName || '',
            alt_kategori: ilan.subCategoryName || '',
            alt_alt_kategori: '',
            kategoriYolu: kategoriYolu, // Kategori yolu dizisi
            baslik: title
          };
        })
      );
    } catch (error: unknown) {
      console.error('Popüler ilanlar getirilemedi:', error);
      return [];
    }
  }, []);

  // Arama fonksiyonu - frontend tarafında daha sağlam filtreleme ile
  const fetchSuggestions = useCallback(async (searchQuery: string): Promise<void> => {
    // Eğer sorgu boşsa veya çok kısaysa (minimum 2 karakter), önerileri temizle
    if (!searchQuery || searchQuery.trim() === '' || searchQuery.trim().length < 2) {
      setSuggestions([]);
      setRelatedCategories([]);
      setPopularListings([]);
      return;
    }

    // Arama sorgusu için son temizlik ve normalizasyon
    const cleanedQuery = searchQuery.trim().toLowerCase();

    // Arama güvenlik kontrolleri
    // - Tek harf aramalarını engelle (backend bazen tek harf sonuçları döndürüyor)
    if (cleanedQuery.length < 2) {
      setSuggestions([]);
      setRelatedCategories([]);
      setPopularListings([]);
      return;
    }

    // Hız limitini kontrol et
    const now = Date.now();
    if (now - requestTimeRef.current < minRequestInterval) {
      console.warn('Arama istekleri çok sık yapılıyor. Biraz bekletiliyor.');
      return;
    }

    // Önbellekten öneri kontrolü
    const cacheKey = searchQuery.toLowerCase().trim();
    if (cacheRef.current[cacheKey]) {
      const { data, timestamp } = cacheRef.current[cacheKey];
      // Önbellek 10 dakikadan yeni mi? (performans iyileştirmesi)
      if (now - timestamp < 10 * 60 * 1000) {
        setSuggestions(data);
        return;
      }
    }

    // İstek zamanını güncelle
    requestTimeRef.current = now;

    try {
      setLoading(true);
      setError(null);

      // Servisten önerileri al
      const result = await getSuggestions(searchQuery);

      // Frontend tarafında gelen sonuçları daha sıkı filtrele
      const filteredSuggestions = (result.suggestions || []).filter((suggestion: Suggestion) => {
        const name = suggestion.name ? suggestion.name.toLowerCase() : '';

        // İlgisiz sonuçları filtrele:
        // 1. Aramada tam kelime veya kelime başlangıcı eşleşmesi olmalı

        // Arama sorgusu
        const query = searchQuery.trim().toLowerCase();

        // Arama ikiden az karakterse, sadece tam eşleşmeleri kabul et
        if (query.length === 2) {
          // 2 karakterli aramalarda sadece tam kelime eşleşmesi olmalı
          const words = name.split(/\s+/);
          return words.some((word) => word === query);
        }

        // Üç veya daha fazla karakter için daha esnek eşleşme
        if (query.length >= 3) {
          // Tam içerme kontrolü
          if (name.includes(query)) return true;

          // Kelime başlangıcı kontrolü
          const words = name.split(/\s+/);
          return words.some((word) => word.startsWith(query));
        }

        // Varsayılan olarak sonucu gösterme (çok kısa sorgular için)
        return false;
      });

      console.log(
        `Toplam ${result.suggestions?.length || 0} sonuçtan ${filteredSuggestions.length} tanesi filtrelendi`
      );

      // Sonuçları state'e kaydet
      setSuggestions(filteredSuggestions);

      // Önbelleğe kaydet
      cacheRef.current[cacheKey] = {
        data: filteredSuggestions,
        timestamp: now
      };

      // Eğer öneri yok ama sorgu yeterince uzunsa, benzer kategorileri ve popüler ilanları getir
      if (result.suggestions.length === 0 && searchQuery.length >= 2) {
        let relatedCats = await fetchRelatedCategories(searchQuery);
        let popularItems = await fetchPopularListings(searchQuery);

        // Frontend'de kategorileri ve popüler ilanları daha sıkı filtrele
        relatedCats = filterRelatedResults(relatedCats, searchQuery);
        popularItems = filterRelatedResults(popularItems, searchQuery) as ListingSuggestion[];

        console.log(`Kategoriler: ${relatedCats.length} adet filtrelendi`);
        console.log(`Popüler ilanlar: ${popularItems.length} adet filtrelendi`);

        // Eğer sonuçlar bulunduysa (ilanlar veya kategoriler), aramaları kaydet
        if ((relatedCats && relatedCats.length > 0) || (popularItems && popularItems.length > 0)) {
          saveRecentSearch(searchQuery);
        }

        setRelatedCategories(relatedCats);
        setPopularListings(popularItems);
      } else {
        // Öneri varsa, yine de benzer kategorileri ve popüler ilanları getir
        // Ama önce önerileri göster
        let relatedCats = await fetchRelatedCategories(searchQuery);
        let popularItems = await fetchPopularListings(searchQuery);

        // Frontend'de kategorileri ve popüler ilanları daha sıkı filtrele
        relatedCats = filterRelatedResults(relatedCats, searchQuery);
        popularItems = filterRelatedResults(popularItems, searchQuery) as ListingSuggestion[];

        console.log(`Öneri olduğu durumda - Kategoriler: ${relatedCats.length} adet filtrelendi`);
        console.log(`Öneri olduğu durumda - Popüler ilanlar: ${popularItems.length} adet filtrelendi`);

        setRelatedCategories(relatedCats);
        setPopularListings(popularItems);

        // Aramayı kaydet
        if (
          (result.suggestions && result.suggestions.length > 0) ||
          relatedCats.length > 0 ||
          popularItems.length > 0
        ) {
          saveRecentSearch(searchQuery);
        }
      }
    } catch (err) {
      console.error('Öneriler alınırken hata oluştu:', err);
      setError('Önerileri getirirken bir hata oluştu.');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [fetchRelatedCategories, fetchPopularListings]);

  // Debounce edilmiş sorgu değiştiğinde önerileri yenile
  useEffect(() => {
    if (debouncedQuery) {
      fetchSuggestions(debouncedQuery);
    } else {
      setSuggestions([]);
    }
  }, [debouncedQuery, fetchSuggestions]);

  // Önbelleği temizleme fonksiyonu
  const clearCache = useCallback((): void => {
    cacheRef.current = {};
  }, []);

  // Arama sorgusunu güncelleme fonksiyonu
  const updateQuery = useCallback((newQuery: string): void => {
    // XSS korumasi için temizle
    const cleanQuery = sanitizeSearchQuery(newQuery);
    // Sorguyu güncelle - boşluklar korunacak
    setQuery(cleanQuery);
  }, []);

  // Frontend tarafında ilgisiz sonuçları filtrele
  const filterRelatedResults = useCallback(
    <T extends { name?: string; title?: string; baslik?: string }>(results: T[], searchQuery: string): T[] => {
      if (!results || !Array.isArray(results)) return [];

      const query = searchQuery.trim().toLowerCase();

      // Minimum karakter kontrolü
      if (query.length < 2) return [];

      return results.filter((item) => {
        // İtem adını al (farklı property'lerde olabilir)
        const name = (item.name || item.title || item.baslik || '').toLowerCase();

        // Burada tam metin/kısa metin kontrolü yap:
        // - 2 karakter için: sadece tam kelime eşleşmesi
        // - 3+ karakter için: kelime içinde geçme veya kelime başlangıcı

        // 2 karakterli aramalar için çok daha sıkı filtreleme
        if (query.length === 2) {
          const words = name.split(/\s+/);
          return words.some((word) => word === query);
        }

        // 3+ karakterli aramalar için biraz daha esnek filtreleme
        if (query.length >= 3) {
          // Doğrudan içerme kontrolü
          if (name.includes(query)) return true;

          // Kelime bazlı başlangıç kontrolü
          const words = name.split(/\s+/);
          return words.some((word) => word.startsWith(query));
        }

        // Eşleşme bulunamadı
        return false;
      });
    },
    []
  );

  // Uygulama başlatıldığında son aramaları yükle
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Seçim sonrası işlem
  const handleSelection = useCallback((selectedItem: { name?: string }): void => {
    if (selectedItem && selectedItem.name) {
      // Seçilen öneriyi sorgu olarak ayarla
      setQuery(selectedItem.name);
      // Son aramalara ekle
      saveRecentSearch(selectedItem.name);
      // Önerileri temizle
      setSuggestions([]);
    }
  }, []);

  return {
    query,
    suggestions,
    relatedCategories,
    popularListings,
    recentSearches,
    loading,
    error,
    updateQuery,
    handleSelection,
    clearCache,
    setQuery,
    saveRecentSearch
  };
};

export default useSuggestions;
