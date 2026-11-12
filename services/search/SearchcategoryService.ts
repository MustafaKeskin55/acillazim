/**
 * Kategori / arama servisleri (SearchcategoryService)
 * Mock: categories-data.json + client fuzzy; searchProducts şimdilik boş.
 *
 * Path alias yok: /api/search kullanılmaz
 *   → GET /api/v1/categories/search?q=
 *   → GET /api/v1/listings?q=
 *   → categoryService path'leri (by-slug, parent_id, path)
 */
import { sanitizeSearchQuery } from '@/utils/sanitizeInput';

/** Host normalize → {host}/api/v1 */
function resolveSearchApiBase(): string {
  const raw = (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    ''
  ).replace(/\/$/, '');
  if (!raw) return '/api/v1';
  const host = raw
    .replace(/\/api\/v1\/?$/, '')
    .replace(/\/api\/?$/, '')
    .replace(/\/v1\/?$/, '');
  return `${host}/api/v1`;
}

const API_BASE_URL = resolveSearchApiBase();
const USE_API_SEARCH = true; // Canlı BE — categories/search + listings?q=

// Kategori verilerini önbellekte tutmak için
let categoriesCache: Record<string, unknown> | null = null;
let lastFetchTime: number | null = null;
const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 dakika (milisaniye)

interface CategoryResult {
  id: number | string | null;
  name: string;
  type: 'category';
  path: string[];
  pathString: string;
  parent_id: number | string | null;
  score: number;
}

interface SuggestionsResponse {
  query?: string;
  suggestions: CategoryResult[];
  timestamp?: number;
  error?: string;
}

interface SubcategoryItem {
  id: string | number;
  name: string;
  slug: string;
  parent_id: string | number;
}

interface SubcategoriesResponse {
  data: SubcategoryItem[];
  status: number;
  error?: string;
}

interface ChainItem {
  id: string | number;
  name: string;
  slug: string;
}

interface ChainResponse {
  data: ChainItem[];
  status: number;
  error?: string;
}

interface SlugResponse {
  data: {
    id: string | number;
    name: string;
    slug: string;
    path: string[];
  };
  status: number;
}

interface CategoryObj {
  category_id?: string | number;
  parent_id?: string | number;
  [key: string]: unknown;
}

/**
 * Kategorileri getirir. Mock: JSON; API: GET /api/v1/categories
 *
 * @returns Kategori verilerini içeren promise
 */
const fetchCategories = async (): Promise<Record<string, unknown>> => {
  try {
    // Önbellek kontrolü - önbellekteki veri tazeyse onu kullan
    const now = Date.now();
    if (categoriesCache && lastFetchTime && now - lastFetchTime < CACHE_EXPIRY_TIME) {
      return categoriesCache;
    }

    // Hedef: GET /api/v1/categories (categoryService)
    if (USE_API_SEARCH) {
      console.log(`[Search API] GET ${API_BASE_URL}/categories`);
      const response = await fetch(`${API_BASE_URL}/categories`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`Kategoriler yüklenirken hata: ${response.status}`);
      const json = await response.json();
      const data =
        json && typeof json === 'object' && 'data' in json
          ? (json as { data: Record<string, unknown> }).data
          : json;
      categoriesCache = data as Record<string, unknown>;
      lastFetchTime = now;
      return categoriesCache;
    }

    // Mock: doğrudan import
    try {
      const categoriesData = await import('@/data/categories-data.json');
      categoriesCache = categoriesData as unknown as Record<string, unknown>;
      lastFetchTime = now;
      return categoriesData as unknown as Record<string, unknown>;
    } catch (importError) {
      console.warn('Import ile veri yüklenemedi, fetch deneniyor:', importError);

      const response = await fetch('/data/categories-data.json');
      if (!response.ok) {
        throw new Error(`Kategoriler yüklenirken hata: ${response.status}`);
      }

      const data = await response.json();
      categoriesCache = data;
      lastFetchTime = now;
      return data;
    }
  } catch (error) {
    console.error('Kategori verileri alınırken hata oluştu:', error);

    throw new Error('Kategori verileri şu anda kullanılamıyor. API entegrasyonu henüz tamamlanmadı.');
  }
};

/**
 * Bir sorguya göre kategori önerileri sunar
 *
 * @param query - Arama sorgusu
 * @returns Öneri sonuçlarını içeren promise
 */
const getSuggestions = async (query: string): Promise<SuggestionsResponse> => {
  try {
    // Güvenlik: Giriş temizleme
    const cleanQuery = sanitizeSearchQuery(query);

    // Girdi çok kısaysa öneri gösterme (en az 2 karakter olmalı)
    if (!cleanQuery || cleanQuery.length < 2) {
      return { suggestions: [] };
    }

    // Hedef: GET /api/v1/categories/search?q=
    console.log(
      `[Search API] Hedef path: GET ${API_BASE_URL}/categories/search?q=${encodeURIComponent(cleanQuery)}`
    );

    if (USE_API_SEARCH) {
      const url = `${API_BASE_URL}/categories/search?q=${encodeURIComponent(cleanQuery)}&limit=10`;
      const response = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
      if (!response.ok) throw new Error(`Öneri API hatası: ${response.status}`);
      const json = await response.json();
      const raw =
        json && typeof json === 'object' && 'data' in json
          ? (json as { data: unknown }).data
          : json;
      const list = Array.isArray(raw)
        ? raw
        : (raw as { suggestions?: CategoryResult[] })?.suggestions || [];
      const suggestions: CategoryResult[] = (list as Record<string, unknown>[]).map((item) => ({
        id: (item.category_id as number | string) ?? (item.id as number | string) ?? null,
        name: (item.label as string) || (item.name as string) || '',
        type: 'category',
        path: (item.path as string[]) || [],
        pathString:
          (item.pathString as string) ||
          ((item.path as string[]) || []).join(' > ') ||
          (item.label as string) ||
          '',
        parent_id: (item.parent_id as number | string | null) ?? null,
        score: (item.score as number) ?? 0,
      }));
      return { query: cleanQuery, suggestions, timestamp: Date.now() };
    }

    // Mock: client-side fuzzy
    const categoriesData = await fetchCategories();
    const matches = searchCategories(cleanQuery, categoriesData);

    return {
      query: cleanQuery,
      suggestions: matches,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Öneri alma hatası:', error);
    return {
      query: query,
      suggestions: [],
      error: 'Öneriler alınamadı',
    };
  }
};

/**
 * Kategori verilerinde arama yapar ve eşleşmeleri döndürür
 *
 * @param query - Arama sorgusu
 * @param categoriesData - Kategori verileri
 * @returns Eşleşen kategorilerin listesi
 */
const searchCategories = (query: string, categoriesData: Record<string, unknown>): CategoryResult[] => {
  const results: CategoryResult[] = [];
  const lowerQuery = query.toLowerCase();

  // Anlamlı eşleşme için geliştirilmiş fonksiyon
  const fuzzyMatch = (text: string, query: string): boolean => {
    text = text.toLowerCase();
    query = query.toLowerCase();

    // Minimum anlamlı karakter sayısı (tek harfli aramalar eşleşmesin)
    const MIN_MATCH_LENGTH = 2;

    // Query çok kısaysa (tek harf) ve doğrudan text ile eşleşmiyorsa, eşleşme yok say
    if (query.length < MIN_MATCH_LENGTH && text !== query) {
      return false;
    }

    // 1. Tam eşleşme kontrolü
    if (text === query) {
      return true;
    }

    // 2. Tam kelime eşleşmesi kontrolü
    const textWords = text.split(/\s+/);
    const queryWords = query.split(/\s+/);

    // Sorgu birden fazla kelimeden oluşuyorsa, her kelime için eşleşme kontrolü yap
    if (queryWords.length > 1) {
      let allWordsMatched = true;

      for (const queryWord of queryWords) {
        // Minimum karakter kontrolü - tek harfli kelimeler yine de atlanacak
        if (queryWord.length < MIN_MATCH_LENGTH) {
          continue;
        }

        // En az bir kelimede bu sorgu kelimesi geçiyor mu?
        const wordMatched = textWords.some(
          (textWord) =>
            textWord.includes(queryWord) ||
            (queryWord.length >= 3 && textWord.startsWith(queryWord)) // 3+ karakterli başlangıç eşleşmesi
        );

        if (!wordMatched) {
          allWordsMatched = false;
          break;
        }
      }

      return allWordsMatched;
    }

    // 3. Tek kelimeli sorgular için içerme kontrolü
    // Fakat sadece tek harf değilse kontrol et
    if (query.length >= MIN_MATCH_LENGTH && text.includes(query)) {
      return true;
    }

    // 4. Kelime başlangıcı kontrolü (örneğin "ala" -> "alarm")
    // Bu sadece sorgumuz yeterince uzunsa anlamlı olur
    if (query.length >= 3) {
      return textWords.some((word) => word.startsWith(query));
    }

    // Hiçbir koşul sağlanmazsa eşleşme yok
    return false;
  };

  // Kategorileri dolaş ve eşleşmeleri bul
  const traverseCategories = (obj: Record<string, unknown>, path: string[] = []): void => {
    if (!obj || typeof obj !== 'object') return;

    Object.keys(obj).forEach((key) => {
      // Meta veri alanlarını atla
      if (key === 'category_id' || key === 'parent_id') {
        return;
      }

      const currentPath = [...path, key];
      const category = obj[key] as CategoryObj;

      // Kategori adı sorguyla eşleşiyor mu kontrol et
      if (fuzzyMatch(key, lowerQuery)) {
        // Benzerlik skorunu hesapla
        const similarityScore = calculateSimilarity(lowerQuery, key.toLowerCase());

        results.push({
          id: category?.category_id ?? null,
          name: key,
          type: 'category', // Tip bilgisi eklendi
          path: currentPath,
          pathString: currentPath.join(' > '),
          parent_id: category?.parent_id ?? null,
          score: similarityScore
        });
      }

      // Alt kategorileri de dolaş
      traverseCategories(category as Record<string, unknown>, currentPath);
    });
  };

  // Ana kategori objesinde arama başlat
  if ((categoriesData as { categories?: Record<string, unknown> }).categories) {
    traverseCategories((categoriesData as { categories: Record<string, unknown> }).categories);
  } else {
    traverseCategories(categoriesData);
  }

  // Sonuçları skora göre sırala (yüksekten düşüğe)
  results.sort((a, b) => b.score - a.score);

  // En iyi 10 sonucu döndür
  return results.slice(0, 10);
};

/**
 * İki metin arasındaki benzerlik skorunu hesaplar
 *
 * @param query - Arama sorgusu
 * @param categoryName - Kategori adı
 * @returns Benzerlik skoru (0-100)
 */
const calculateSimilarity = (query: string, categoryName: string): number => {
  // Tam eşleşme
  if (query === categoryName) {
    return 100;
  }

  // Kategori adı, sorgu ile başlıyorsa
  if (categoryName.startsWith(query)) {
    // Başlangıç eşleşmesine yüksek puan (sorgu uzunluğu / kategori adı uzunluğu)
    return Math.round(70 + (query.length / categoryName.length) * 30);
  }

  // Kategori adı sorguyu içeriyorsa
  if (categoryName.includes(query)) {
    // İçerme eşleşmesine orta puan
    return Math.round(50 + (query.length / categoryName.length) * 20);
  }

  // Kelime bazlı eşleşme kontrolü
  const queryWords = query.split(/\s+/);
  const categoryWords = categoryName.split(/\s+/);

  let matchedWordCount = 0;
  queryWords.forEach((qWord) => {
    if (categoryWords.some((cWord) => cWord.includes(qWord))) {
      matchedWordCount++;
    }
  });

  if (matchedWordCount > 0) {
    return Math.round((matchedWordCount / queryWords.length) * 40);
  }

  return 0; // Eşleşme yoksa sıfır puan
};

/**
 * Kategori ID'sine göre kategori bilgilerini getirir
 *
 * @param categoryId - Kategori ID'si
 * @returns Kategori bilgilerini içeren promise
 */
const getCategoryById = async (categoryId: number | string): Promise<CategoryResult | null> => {
  try {
    const categoriesData = await fetchCategories();
    let result: CategoryResult | null = null;

    // ID'ye göre kategoriyi bul
    const findCategory = (obj: Record<string, unknown>, path: string[] = []): void => {
      if (!obj || typeof obj !== 'object') return;

      Object.keys(obj).forEach((key) => {
        if (key === 'category_id' && obj[key] == categoryId) {
          // Ana kategori bilgilerini al
          const parentKey = Object.keys(obj).find(
            (k) =>
              typeof obj[k] === 'object' &&
              obj[k] !== null &&
              k !== 'category_id' &&
              k !== 'parent_id'
          );

          if (parentKey) {
            result = {
              id: obj.category_id as string | number | null,
              name: parentKey,
              path: [...path, parentKey],
              pathString: [...path, parentKey].join(' > '),
              parent_id: (obj.parent_id as string | number | null) ?? null,
              type: 'category',
              score: 100
            };
            return;
          }
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          const currentPath =
            key !== 'category_id' && key !== 'parent_id' ? [...path, key] : path;
          findCategory(obj[key] as Record<string, unknown>, currentPath);
        }
      });
    };

    if ((categoriesData as { categories?: Record<string, unknown> }).categories) {
      findCategory((categoriesData as { categories: Record<string, unknown> }).categories);
    } else {
      findCategory(categoriesData);
    }

    return result;
  } catch (error) {
    console.error('Kategori bilgisi alınamadı:', error);
    return null;
  }
};

/**
 * Ürün datasında verilen sorguya eşleşen ürünleri arar
 *
 * @param query - Arama sorgusu
 * @returns Arama sonuçlarını içeren promise
 */
const searchProducts = async (query: string): Promise<unknown[]> => {
  try {
    // Güvenlik: Giriş temizleme
    const cleanQuery = sanitizeSearchQuery(query);

    // En az 2 karakter olmalı
    if (!cleanQuery || cleanQuery.length < 2) {
      return [];
    }

    // Hedef: GET /api/v1/listings?q=
    console.log(
      `[Search API] Hedef path: GET ${API_BASE_URL}/listings?q=${encodeURIComponent(cleanQuery)}`
    );

    if (USE_API_SEARCH) {
      const url = `${API_BASE_URL}/listings?q=${encodeURIComponent(cleanQuery)}&page=1&page_size=20`;
      const response = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
      if (!response.ok) throw new Error(`İlan arama API hatası: ${response.status}`);
      const json = await response.json();
      const body =
        json?.data && typeof json.data === 'object' ? json.data : json;
      const listings = body?.listings || body?.products || (Array.isArray(body) ? body : []);
      return Array.isArray(listings) ? listings : [];
    }

    console.warn(
      'Ürün arama API entegrasyonu henüz tamamlanmadı (USE_API_SEARCH=false), boş dizi döndürülüyor.'
    );
    return [];
  } catch (error) {
    console.error('Ürün arama hatası:', error);
    return [];
  }
};

/**
 * Slug'a göre kategori bilgisini getirir
 *
 * @param slug - Kategori slug'ı
 * @returns Kategori verisini içeren promise
 */
const getCategoryBySlug = async (slug: string): Promise<SlugResponse> => {
  try {
    // Hedef: GET /api/v1/categories/by-slug/{slug}
    console.log(`[Search API] Hedef path: GET ${API_BASE_URL}/categories/by-slug/${encodeURIComponent(slug)}`);

    // Mock: kategorileri getir
    const categoriesData = await fetchCategories();
    const allCategories: { id: string | number; name: string; slug: string; path: string[] }[] = [];

    // Kategori veri ağacını düzleştir
    const flattenCategories = (obj: Record<string, unknown>, path: string[] = []): void => {
      if (!obj || typeof obj !== 'object') return;

      Object.keys(obj).forEach((key) => {
        if (key === 'category_id' || key === 'parent_id') return;

        const category = obj[key] as CategoryObj;
        const currentPath = [...path, key];
        const categorySlug = currentPath
          .join('-')
          .toLowerCase()
          .replace(/\s+/g, '-');

        // Kategoriyi düz listeye ekle
        if (category && category.category_id) {
          allCategories.push({
            id: category.category_id,
            name: key,
            slug: categorySlug,
            path: currentPath
          });
        }

        // Alt kategorileri dolaş
        flattenCategories(category as Record<string, unknown>, currentPath);
      });
    };

    if ((categoriesData as { categories?: Record<string, unknown> }).categories) {
      flattenCategories((categoriesData as { categories: Record<string, unknown> }).categories);
    } else {
      flattenCategories(categoriesData);
    }

    // Slug'a göre kategoriyi bul
    const foundCategory = allCategories.find((cat) => cat.slug === slug);

    if (!foundCategory) {
      throw new Error(`Kategori bulunamadı: ${slug}`);
    }

    return {
      data: foundCategory,
      status: 200
    };
  } catch (error) {
    console.error('Slug ile kategori getirme hatası:', error);
    throw new Error('Kategori bulunamadı');
  }
};

/**
 * Bir kategorinin özel özelliğe sahip olup olmadığını kontrol eder
 *
 * @param categoryId - Kategori ID'si
 * @param featureName - Özellik adı
 * @returns Özelliğin varlığını gösteren boolean promise
 */
const hasSpecialFeature = async (categoryId: number | string, featureName: string): Promise<boolean> => {
  try {
    // Şimdilik belirli kategorilere özel durumlar tanımlayalım
    // Gerçek API'de bu bir API çağrısı olacak
    const specialFeatures: Record<string, string[]> = {
      'banner': ['1', '2', '5', '10'], // Banner özelliği olan kategori ID'leri
      'filter': ['1', '3', '4', '7'],  // Özel filtre özelliği olan kategori ID'leri
      'promo': ['2', '6', '8', '9']    // Promosyon özelliği olan kategori ID'leri
    };

    // Özellik listesi varsa ve kategori ID'si bu listedeyse true döndür
    return Boolean(
      specialFeatures[featureName] &&
      specialFeatures[featureName].includes(String(categoryId))
    );
  } catch (error) {
    console.error('Özellik kontrolü hatası:', error);
    return false;
  }
};

/**
 * Bir kategorinin alt kategorilerini getirir
 *
 * @param categoryId - Kategori ID'si
 * @returns Alt kategorileri içeren promise
 */
const getSubcategories = async (categoryId: number | string): Promise<SubcategoriesResponse> => {
  try {
    if (!categoryId) {
      throw new Error("Geçersiz kategori ID'si");
    }

    // Hedef: GET /api/v1/categories?parent_id={categoryId}
    console.log(
      `[Search API] Hedef path: GET ${API_BASE_URL}/categories?parent_id=${categoryId}`
    );

    // Mock: kategorileri getir
    const categoriesData = await fetchCategories();

    // Kategori ID'sine göre kategoriyi bul
    const findCategoryById = (
      obj: Record<string, unknown>,
      id: number | string,
      path: string[] = []
    ): { category: CategoryObj; path: string[] } | null => {
      if (!obj || typeof obj !== 'object') return null;

      for (const key in obj) {
        if (key === 'category_id') {
          if (String(obj[key]) === String(id)) {
            return { category: obj as CategoryObj, path };
          }
        } else if (typeof obj[key] === 'object') {
          const result = findCategoryById(obj[key] as Record<string, unknown>, id, [...path, key]);
          if (result) return result;
        }
      }

      return null;
    };

    let categoryObj: { category: CategoryObj; path: string[] } | null = null;
    if ((categoriesData as { categories?: Record<string, unknown> }).categories) {
      categoryObj = findCategoryById(
        (categoriesData as { categories: Record<string, unknown> }).categories,
        categoryId
      );
    } else {
      categoryObj = findCategoryById(categoriesData, categoryId);
    }

    if (!categoryObj) {
      throw new Error(`Kategori bulunamadı: ${categoryId}`);
    }

    // Alt kategorileri getir
    const subcategories: SubcategoryItem[] = [];
    for (const key in categoryObj.category) {
      if (key === 'category_id' || key === 'parent_id') continue;

      if (
        typeof categoryObj.category[key] === 'object' &&
        categoryObj.category[key] !== null
      ) {
        const subcategory = categoryObj.category[key] as CategoryObj;

        // Alt kategori nesnesini oluştur
        subcategories.push({
          id: subcategory.category_id || `${categoryId}-${key}`,
          name: key,
          slug: [...categoryObj.path, key]
            .join('-')
            .toLowerCase()
            .replace(/\s+/g, '-'),
          parent_id: categoryId
        });
      }
    }

    return {
      data: subcategories,
      status: 200
    };
  } catch (error: unknown) {
    console.error('Alt kategoriler getirilirken hata:', error);
    return {
      data: [],
      status: 404,
      error: (error as Error).message
    };
  }
};

/**
 * Bir kategorinin ebeveyn zincirini (breadcrumb) getirir
 *
 * @param categoryId - Kategori ID'si
 * @returns Breadcrumb verilerini içeren promise
 */
const getCategoryChain = async (categoryId: number | string): Promise<ChainResponse> => {
  try {
    if (!categoryId) {
      throw new Error("Geçersiz kategori ID'si");
    }

    // Hedef: GET /api/v1/categories/{categoryId}/path
    console.log(`[Search API] Hedef path: GET ${API_BASE_URL}/categories/${categoryId}/path`);

    // Mock: kategorileri getir
    const categoriesData = await fetchCategories();

    // Kategori zincirini bul
    const findCategoryChain = (
      obj: Record<string, unknown>,
      id: number | string,
      chain: ChainItem[] = []
    ): ChainItem[] | null => {
      if (!obj || typeof obj !== 'object') return null;

      for (const key in obj) {
        const currentObj = obj[key];

        if (key === 'category_id' && String(currentObj) === String(id)) {
          return chain;
        }

        if (typeof currentObj === 'object' && currentObj !== null) {
          // Mevcut kategoriyi zincire ekle
          if (key !== 'category_id' && key !== 'parent_id') {
            chain.push({
              id: (currentObj as CategoryObj).category_id || `temp-${key}`,
              name: key,
              slug: key.toLowerCase().replace(/\s+/g, '-')
            });
          }

          // Recursive olarak alt kategorilerde ara
          const result = findCategoryChain(
            currentObj as Record<string, unknown>,
            id,
            [...chain]
          );

          if (result) return result;

          // Eğer sonuç bulunamadıysa, eklenen kategoriyi çıkar
          if (chain.length > 0 && key !== 'category_id' && key !== 'parent_id') {
            chain.pop();
          }
        }
      }

      return null;
    };

    let chain: ChainItem[] | null = null;
    if ((categoriesData as { categories?: Record<string, unknown> }).categories) {
      chain = findCategoryChain(
        (categoriesData as { categories: Record<string, unknown> }).categories,
        categoryId
      );
    } else {
      chain = findCategoryChain(categoriesData, categoryId);
    }

    if (!chain) {
      throw new Error(`Kategori zinciri bulunamadı: ${categoryId}`);
    }

    return {
      data: chain,
      status: 200
    };
  } catch (error: unknown) {
    console.error('Kategori zinciri getirilirken hata:', error);
    return {
      data: [],
      status: 404,
      error: (error as Error).message
    };
  }
};

export {
  fetchCategories,
  getSuggestions,
  searchCategories,
  getCategoryById,
  searchProducts,
  getCategoryBySlug,
  hasSpecialFeature,
  getSubcategories,
  getCategoryChain
};
