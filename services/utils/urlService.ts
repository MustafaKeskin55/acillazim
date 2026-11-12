/**
 * URL Servis — SEO dostu linkler (client-only)
 *
 * Ayrı BE resource yok: /api/utils, /api/url kullanılmaz.
 * Opsiyonel bağımlılıklar:
 *   → GET /api/v1/categories/{categoryId}/path  (getCategoryPathById)
 *   → GET /api/v1/listings/{listingId}         (routeIlanDetay doğrulama)
 *
 * /ilan/{id}, /filtrele/... → Next.js sayfa path’leri (REST değil)
 */

/** Dokümantasyon / log — fetch bu modülde yok (mock JSON) */
function resolveUtilsRelatedApiBase(): string {
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

const RELATED_API_BASE = resolveUtilsRelatedApiBase();

/**
 * Kategori yolu önbelleği — canlı BE'den (GET /categories/{id}/path) gelen sonuçları
 * bellekte + localStorage'da tutar. Çağıranların çoğu senkron (useMemo/render) olduğu
 * için gerçek fetch arka planda yapılır; sonuç önbelleğe girdiğinde bir sonraki render
 * gerçek veriyi kullanır (ilk render'da geriye dönük uyumlu boş dizi davranışı korunur).
 */
const CATEGORY_PATH_CACHE_KEY_PREFIX = 'acillazim_category_path_';
const categoryPathMemoryCache = new Map<number, string[]>();
const categoryPathInFlight = new Map<number, Promise<string[]>>();
const isBrowserEnv = typeof window !== 'undefined';

interface CategoryPathApiItem {
  id?: number | string;
  label?: string;
  name?: string;
  slug?: string;
}

function readCategoryPathFromStorage(catId: number): string[] | null {
  if (!isBrowserEnv) return null;
  try {
    const raw = window.localStorage.getItem(`${CATEGORY_PATH_CACHE_KEY_PREFIX}${catId}`);
    return raw ? (JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

function writeCategoryPathToStorage(catId: number, path: string[]): void {
  if (!isBrowserEnv) return;
  try {
    window.localStorage.setItem(`${CATEGORY_PATH_CACHE_KEY_PREFIX}${catId}`, JSON.stringify(path));
  } catch {
    // localStorage dolu/erişilemez olabilir — sorun değil, bellek önbelleği yeterli
  }
}

/** Kategori yolunu canlı BE'den getirir: GET /api/v1/categories/{id}/path */
async function fetchCategoryPathFromApi(catId: number): Promise<string[]> {
  const response = await fetch(`${RELATED_API_BASE}/categories/${catId}/path`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Kategori yolu alınamadı: CategoryID=${catId} (HTTP ${response.status})`);
  }
  const json = await response.json();
  const items: CategoryPathApiItem[] = Array.isArray(json) ? json : json?.data ?? [];
  return items.map((item) => item.label || item.name || '').filter(Boolean);
}

/** Kategori yolunu önbelleğe alıp döndürür; eşzamanlı çağrılar aynı isteği paylaşır. */
function warmCategoryPathCache(catId: number): Promise<string[]> {
  const existing = categoryPathInFlight.get(catId);
  if (existing) return existing;

  const promise = fetchCategoryPathFromApi(catId)
    .then((path) => {
      categoryPathMemoryCache.set(catId, path);
      writeCategoryPathToStorage(catId, path);
      return path;
    })
    .catch((err) => {
      console.error('[urlService] Kategori yolu BE\'den alınamadı:', err);
      return [];
    })
    .finally(() => {
      categoryPathInFlight.delete(catId);
    });

  categoryPathInFlight.set(catId, promise);
  return promise;
}

interface IlanItem {
  ilan_id?: string | number;
  baslik?: string;
  title?: string;
  ad?: string;
  name?: string;
  category_id?: string | number;
  kategori?: string;
  category?: string;
  alt_kategori?: string;
  subcategory?: string;
  alt_alt_kategori?: string;
  sub_subcategory?: string;
  kategoriYolu?: string[];
  [key: string]: unknown;
}

interface RouteResult {
  ilanId: string | null;
  path: string;
  isValid: boolean;
}

/**
 * Metni URL dostu formata dönüştürür (slug oluşturma)
 * @param text - Dönüştürülecek metin
 * @returns URL dostu metin
 */
const createSlug = (text: string): string => {
  if (!text) return '';

  // Türkçe karakterleri değiştir
  const turkishChars: Record<string, string> = {
    'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c',
    'İ': 'I', 'Ğ': 'G', 'Ü': 'U', 'Ş': 'S', 'Ö': 'O', 'Ç': 'C'
  };
  let slug = text.toString().toLowerCase();

  // Türkçe karakterleri değiştir
  slug = slug.replace(/[ıİğĞüÜşŞöÖçÇ]/g, (char) => turkishChars[char] || char);

  // Özel karakterleri kaldır, boşlukları tire ile değiştir
  slug = slug
    .replace(/[^a-z0-9\s-]/g, '') // Alfanumerik olmayan karakterleri kaldır
    .replace(/\s+/g, '-')         // Boşlukları tire ile değiştir
    .replace(/-+/g, '-')          // Ardışık tireleri tek tireye dönüştür
    .replace(/^-+/, '')           // Baştaki tireleri kaldır
    .replace(/-+$/, '');          // Sondaki tireleri kaldır

  return slug;
};

/**
 * Kategori ID'sine göre tam kategori yolunu döndürür (ana-alt-alt alt kategori şeklinde)
 * Canlı BE: GET /api/v1/categories/{categoryId}/path
 *
 * Senkron imza (birçok çağıran useMemo/render içinde sync bekliyor) korunur:
 * önbellekte veri varsa hemen döner, yoksa arka planda gerçek isteği tetikler ve
 * bu ilk çağrıda boş dizi döner (önbellek dolduğunda sonraki render gerçek veriyi kullanır).
 * Async bekleyebilen çağıranlar için `getCategoryPathByIdAsync` kullanılmalı.
 */
const getCategoryPathById = (categoryId: string | number): string[] => {
  try {
    const catId = typeof categoryId === 'string' ? parseInt(categoryId, 10) : categoryId;

    if (!catId || isNaN(catId as number)) {
      console.error('Geçersiz kategori ID:', categoryId);
      return [];
    }

    const memCached = categoryPathMemoryCache.get(catId as number);
    if (memCached) return memCached;

    const stored = readCategoryPathFromStorage(catId as number);
    if (stored) {
      categoryPathMemoryCache.set(catId as number, stored);
      return stored;
    }

    // Önbellekte yok — arka planda gerçek BE'den getir (fire-and-forget)
    void warmCategoryPathCache(catId as number);
    return [];
  } catch (error) {
    console.error('Kategori yolunu oluşturma hatası:', error);
    return [];
  }
};

/**
 * Kategori ID'sine göre tam kategori yolunu döndürür (async, canlı BE)
 * GET /api/v1/categories/{categoryId}/path
 */
const getCategoryPathByIdAsync = async (categoryId: string | number): Promise<string[]> => {
  const catId = typeof categoryId === 'string' ? parseInt(categoryId, 10) : categoryId;
  if (!catId || isNaN(catId as number)) {
    console.error('Geçersiz kategori ID:', categoryId);
    return [];
  }

  const memCached = categoryPathMemoryCache.get(catId as number);
  if (memCached) return memCached;

  const stored = readCategoryPathFromStorage(catId as number);
  if (stored) {
    categoryPathMemoryCache.set(catId as number, stored);
    return stored;
  }

  return warmCategoryPathCache(catId as number);
};

/**
 * İlan ID, kategori ve başlık kullanarak SEO dostu bir URL oluşturur
 * @param ilanId - İlan ID
 * @param kategori - İlan kategorisi (ör: "emlak-konut-satilik-daire")
 * @param baslik - İlan başlığı
 * @returns Oluşturulan SEO dostu URL
 */
const createSeoUrl = (ilanId: string | number, kategori: string, baslik: string): string => {
  if (!ilanId) return '/';

  // Kategori ve başlık sluglarını oluştur
  const kategoriSlug = createSlug(kategori);
  const baslikSlug = createSlug(baslik);

  // SEO dostu URL oluştur: /kategori-alt-kategori/baslik-ilanid
  // Örnek: /emlak-konut-satilik-daire/3-1-bahceli-daire-1001
  let url = '';

  if (kategoriSlug) {
    url += `/${kategoriSlug}`;
  }

  // İlanın başlığı varsa ekle ve ID ile birleştir
  if (baslikSlug) {
    // Başlık içinde zaten ID varsa, sadece başlığı ekle
    if (baslikSlug.includes(ilanId.toString())) {
      url += `/${baslikSlug}`;
    } else {
      // Yoksa başlık-ID formatında ekle
      url += `/${baslikSlug}-${ilanId}`;
    }
  } else {
    // Başlık yoksa sadece ID'yi ekle
    url += `/${ilanId}`;
  }

  return url;
};

/**
 * İlan objesi için SEO dostu URL oluşturur
 * @param ilan - İlan objesi
 * @returns Oluşturulan SEO dostu URL
 */
const getIlanUrl = (ilan: IlanItem): string => {
  if (!ilan || !ilan.ilan_id) return '/';

  // İlanın başlığını al
  const baslik = ilan.baslik || ilan.title || ilan.ad || ilan.name || '';

  // ID'yi başlıktan çıkar - ID tekrarını önlemek için
  const temizBaslik = baslik.toString().replace(new RegExp(`-?${ilan.ilan_id}$`), '');

  // İlanın kategori yolunu oluştur
  let kategoriYolu = '';

  // İlanın kategori ID'si varsa, tam kategori yolunu oluştur
  // Bu işlem gerçek bir API ile yapılacak, burada simüle ediyoruz
  if (ilan.category_id) {
    // Kategori ID'den kategori yolunu al
    const categoryPath = getCategoryPathById(ilan.category_id);

    if (categoryPath && categoryPath.length > 0) {
      // Kategori yolu dizi olarak kaydet (daha sonra kullanılabilir)
      ilan.kategoriYolu = categoryPath;

      // Kategori yolunu string'e dönüştür
      kategoriYolu = categoryPath.map((category) => createSlug(category)).join('-');
    }
  }

  // Eğer API'den kategoriYolu dizisi gelmişse, onu kullan
  if (!kategoriYolu && ilan.kategoriYolu && Array.isArray(ilan.kategoriYolu) && ilan.kategoriYolu.length > 0) {
    // Kategorileri diziden alıp tire ile birleştir
    kategoriYolu = ilan.kategoriYolu.map((kategori) => createSlug(kategori)).join('-');
  }

  // Hala kategori yolu yoksa, eski yöntemi kullan (geriye dönük uyumluluk)
  if (!kategoriYolu) {
    const anaKategori = ilan.kategori || ilan.category || '';
    const altKategori = ilan.alt_kategori || ilan.subcategory || '';
    const altAltKategori = ilan.alt_alt_kategori || ilan.sub_subcategory || '';

    // Ana kategori ekle
    if (anaKategori) {
      kategoriYolu = createSlug(anaKategori);
    }

    // Alt kategorileri ekle
    if (altKategori) {
      kategoriYolu += `-${createSlug(altKategori)}`;
    }

    if (altAltKategori) {
      kategoriYolu += `-${createSlug(altAltKategori)}`;
    }
  }

  // Hiçbir kategori yoksa "diger" kullan
  if (!kategoriYolu) {
    kategoriYolu = 'diger';
  }

  // SEO dostu URL oluştur (kategori ve başlık bilgileriyle)
  const url = createSeoUrl(ilan.ilan_id, kategoriYolu, temizBaslik);

  return url;
};

/**
 * SEO dostu URL'den kategori yolunu çıkarır
 * @param url - İlan URL'si
 * @returns Kategori yolu veya null
 */
const extractCategoryFromUrl = (url: string): string | null => {
  if (!url) return null;

  // URL bir string değilse veya boşsa null döndür
  if (typeof url !== 'string' || url.trim() === '') {
    return null;
  }

  try {
    // URL'den segmentleri al ('/' ile ayrılmış)
    const segments = url.split('/').filter((segment) => segment.trim() !== '');

    // URL boşsa veya hiç segment yoksa null döndür
    if (segments.length === 0) {
      return null;
    }

    // İlk segment kategori yoludur
    const categorySegment = segments[0];
    return categorySegment;
  } catch (error) {
    console.error('URL kategorisi işlenirken hata oluştu:', error);
    return null;
  }
};

/**
 * Verilen kategori ID'si ile URL'deki kategori uyumlu mu kontrol eder
 * @param urlCategorySlug - URL'den alınan kategori slug'ı
 * @param categoryId - İlanın kategori ID'si
 * @returns Kategori uyumlu mu
 */
const validateCategoryMatch = (urlCategorySlug: string, categoryId: string | number): boolean => {
  try {
    // Kategori ID'ye göre tam yolu al
    const categoryPath = getCategoryPathById(categoryId);
    if (!categoryPath || categoryPath.length === 0) {
      // Önbellek henüz dolmamış olabilir (arka planda fetch ediliyor), kullanıcıyı engellememek için true kabul et
      return true;
    }

    // Kategori yolu slug'ını oluştur (tam yol)
    const fullPathSlug = categoryPath.map((cat) => createSlug(cat)).join('-');

    // URL'deki kategori ile ilanın kategori yolu eşleşiyor mu?
    const urlCategoryLower = urlCategorySlug.toLowerCase();
    const fullPathSlugLower = fullPathSlug.toLowerCase();

    // Ana kategori (ilk segment) kontrolü
    const mainCategorySlug = createSlug(categoryPath[0]);
    const isMainCategoryMatch = urlCategoryLower === mainCategorySlug.toLowerCase();

    // Tam yol kontrolü
    const isFullPathMatch = urlCategoryLower === fullPathSlugLower;

    // Ana kategori veya tam yol eşleşiyorsa true döndür
    return isMainCategoryMatch || isFullPathMatch;
  } catch (error) {
    console.error('Kategori eşleşme kontrolü sırasında hata:', error);
    return false;
  }
};

/**
 * SEO dostu URL'den ilan ID'sini çıkarır
 * @param url - İlan URL'si
 * @returns İlan ID'si veya null
 */
const extractIlanId = (url: string): string | null => {
  if (!url) return null;

  // URL bir string değilse veya boşsa null döndür
  if (typeof url !== 'string' || url.trim() === '') {
    return null;
  }

  try {
    // Hata ayıklama için log
    console.log('extractIlanId çalışıyor. URL:', url);

    // 1. Doğrudan ilan formatını kontrol et: /ilan/1234
    const ilanMatch = url.match(/\/ilan\/(\d+)/);
    if (ilanMatch && ilanMatch[1]) {
      console.log('Doğrudan ilan formatı eşleşti:', ilanMatch[1]);
      return ilanMatch[1];
    }

    // 2. URL'den sondaki segment alınır ('/' ile ayrılmış)
    const segments = url.split('/').filter((segment) => segment.trim() !== '');

    // URL boşsa veya hiç segment yoksa null döndür
    if (segments.length === 0) {
      console.log("URL'de hiç segment bulunamadı");
      return null;
    }

    // 3. URL'nin son segmentini al (başlık-id formatında olmalı)
    const lastSegment = segments[segments.length - 1];
    console.log('URL son segmenti:', lastSegment);

    // 4. Son segmentin sonunda bir sayı var mı kontrol et
    const idAtEnd = lastSegment.match(/-(\d+)$/);
    if (idAtEnd && idAtEnd[1]) {
      console.log('Son segmentte ID bulundu:', idAtEnd[1]);
      return idAtEnd[1];
    }

    // 5. Son segment tamamen sayı mı?
    if (/^\d+$/.test(lastSegment)) {
      console.log('Son segment tamamen sayı:', lastSegment);
      return lastSegment;
    }

    // 6. Son kısmı tire ile ayırarak ID olabilecek kısmı kontrol et
    const parts = lastSegment.split('-');
    const lastPart = parts[parts.length - 1];

    if (lastPart && /^\d+$/.test(lastPart)) {
      console.log('Son parça sayı:', lastPart);
      return lastPart;
    }

    // 7. Hiçbir yöntem başarılı olmadıysa, URL içinde sayı ara
    const numberMatches = url.match(/\d+/g);
    if (numberMatches && numberMatches.length > 0) {
      // En son sayıyı al (genellikle ID'dir)
      const potentialId = numberMatches[numberMatches.length - 1];
      console.log('URL içinde potansiyel ID bulundu:', potentialId);
      return potentialId;
    }

    console.log("URL'den ID çıkarılamadı");
    return null;
  } catch (error) {
    console.error('URL işlenirken hata oluştu:', error);
    return null;
  }
};

/**
 * URL'den ilan detay sayfasına yönlendirme yapar (App Router)
 * Canlı BE: GET /api/v1/listings/{listingId}
 * Not: dönen path `/ilan/{id}` FE route’tur, REST değil.
 */
const routeIlanDetay = async (urlPath: string): Promise<RouteResult> => {
  const ilanId = extractIlanId(urlPath);

  if (!ilanId) {
    return {
      ilanId: null,
      path: '/sayfa-bulunamadi',
      isValid: false
    };
  }

  try {
    const response = await fetch(`${RELATED_API_BASE}/listings/${ilanId}`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      console.error(`İlan ID ${ilanId} ile eşleşen ilan bulunamadı (HTTP ${response.status})`);
      return {
        ilanId: null,
        path: '/sayfa-bulunamadi',
        isValid: false
      };
    }

    const json = await response.json();
    const ilanData: Record<string, unknown> = json?.data ?? json;
    const categoryId = (ilanData?.categoryId ?? ilanData?.category_id) as string | number | undefined;

    // URL'den kategori yolunu çıkar
    const urlCategorySlug = extractCategoryFromUrl(urlPath);

    // Kategori eşleşmesini kontrol et
    if (urlCategorySlug && categoryId) {
      const isCategoryValid = validateCategoryMatch(urlCategorySlug, categoryId);

      // Kategori eşleşmiyorsa, 404 sayfasına yönlendir (artık doğru URL'ye yönlendirmiyoruz)
      if (!isCategoryValid) {
        console.warn(
          `URL'deki kategori (${urlCategorySlug}) ile ilan kategorisi (ID: ${categoryId}) eşleşmiyor`
        );

        // 404 sayfasına yönlendir
        return {
          ilanId: null,
          path: '/sayfa-bulunamadi',
          isValid: false
        };
      }
    }

    // Her şey doğruysa ilan sayfasına yönlendir
    return {
      ilanId,
      path: `/ilan/${ilanId}`,
      isValid: true
    };
  } catch (error) {
    console.error('Yönlendirme sırasında hata:', error);

    // Hata durumunda da ilan sayfasına yönlendir
    // Detaylı kontrol ilan detay sayfasında yapılacak
    return {
      ilanId,
      path: `/ilan/${ilanId}`,
      isValid: true
    };
  }
};

/**
 * Kategori yolundan hiyerarşik filtre URL'si oluşturur
 * @param categoryPath - Kategori yolu dizisi (örn: ["Emlak", "Konut", "Satılık"])
 * @returns Filtre URL'si (örn: "/filtrele/emlak/konut/satilik")
 */
const createFilterUrlFromPath = (categoryPath: string[]): string => {
  if (!categoryPath || !Array.isArray(categoryPath) || categoryPath.length === 0) {
    console.error('Geçersiz kategori yolu:', categoryPath);
    return '/filtrele';
  }

  // Her kategori adını slug'a dönüştür
  const slugs = categoryPath.map((category) => createSlug(category));

  // URL yolunu oluştur
  return `/filtrele/${slugs.join('/')}`;
};

/**
 * Kategori ID'sine göre hiyerarşik filtre URL'si oluşturur
 * @param categoryId - Kategori ID'si
 * @returns Filtre URL'si (örn: "/filtrele/emlak/konut/satilik")
 */
const createFilterUrlFromCategoryId = (categoryId: string | number): string => {
  try {
    // Kategori ID'den tam yolu al
    const categoryPath = getCategoryPathById(categoryId);

    // Yolu URL'ye dönüştür
    return createFilterUrlFromPath(categoryPath);
  } catch (error) {
    console.error("Filtre URL'si oluşturma hatası:", error);
    return `/filtrele`;
  }
};

// URL Servis modülü
const urlService = {
  createSlug,
  createSeoUrl,
  extractIlanId,
  extractCategoryFromUrl,
  validateCategoryMatch,
  getIlanUrl,
  getCategoryPathById,
  getCategoryPathByIdAsync,
  routeIlanDetay,
  createFilterUrlFromPath,
  createFilterUrlFromCategoryId
};

export default urlService;
