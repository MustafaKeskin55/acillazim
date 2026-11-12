/**
 * Reklam Filtreleme Motoru
 * Bu modül reklamların filtrelenmesi için gelişmiş bir motor sağlar.
 */

interface Advertisement {
  id?: number | string;
  title?: string;
  mediaType?: string;
  src?: string;
  link?: string;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  pageId?: number;
  sectionId?: number;
  categoryId?: number | null;
  requiresLogin?: boolean;
  listingType?: string | null;
  regions?: string[];
  section_code?: string;
  page?: string;
  [key: string]: unknown;
}

interface FilterAdsByContextOptions {
  pageId: number;
  sectionId: number;
  categoryId?: number | null;
  listingType?: string | null;
  region?: string | null;
  isUserLoggedIn?: boolean;
}

interface GetFilteredAdsOptions extends FilterAdsByContextOptions {
  limit?: number;
}

interface FilterByOptions {
  listingType?: string | null;
}

/**
 * Tarihin geçerli olup olmadığını kontrol eder
 * @param startDate - Başlangıç tarihi (ISO string)
 * @param endDate - Bitiş tarihi (ISO string)
 * @returns Tarih geçerliyse true
 */
const isDateValid = (startDate: string | undefined, endDate: string | undefined): boolean => {
  if (!startDate || !endDate) return false;

  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  return now >= start && now <= end;
};

/**
 * Verilen reklamların aktif ve geçerli tarih aralığında olup olmadığını kontrol eder
 * @param advertisements - Reklam nesneleri dizisi
 * @returns Filtrelenmiş reklam dizisi
 */
const filterActiveAds = (advertisements: Advertisement[]): Advertisement[] => {
  if (!Array.isArray(advertisements)) return [];

  return advertisements.filter((ad) => {
    if (!ad || typeof ad !== 'object') return false;

    // Aktiflik kontrolü
    if (ad.isActive !== true) return false;

    // Tarih aralığı kontrolü
    return isDateValid(ad.startDate, ad.endDate);
  });
};

/**
 * Reklamları sayfa, bölüm ve kategoriye göre filtreler
 * @param advertisements - Reklam nesneleri dizisi
 * @param options - Filtreleme seçenekleri
 * @returns Filtrelenmiş reklam dizisi
 */
const filterAdsByContext = (
  advertisements: Advertisement[],
  {
    pageId,
    sectionId,
    categoryId = null,
    listingType = null,
    region = null,
    isUserLoggedIn = false
  }: FilterAdsByContextOptions
): Advertisement[] => {
  if (!Array.isArray(advertisements)) {
    console.warn('Filtreleme için geçersiz parametre: advertisements bir array değil');
    return [];
  }

  if (!pageId || !sectionId) {
    console.warn('Filtreleme için geçersiz parametreler:', { pageId, sectionId });
    return [];
  }

  // Geçerli sayfa ve bölüm değerlerini kontrol et (ID bazlı)
  const validPageIds = [1, 2, 3, 4]; // 1: kategori, 2: anasayfa, 3: detay, 4: tüm sayfalar
  const validSectionIds = [1, 2, 3, 4]; // 1: üst banner, 2: sidebar, 3: içerik, 4: tüm bölümler

  if (!validPageIds.includes(pageId)) {
    console.warn(`Geçersiz pageId: ${pageId}`);
    return [];
  }

  if (!validSectionIds.includes(sectionId)) {
    console.warn(`Geçersiz sectionId: ${sectionId}`);
    return [];
  }

  // Filtreleme öncesi reklamların sayısını logla
  console.log('Filtreleme öncesi reklam sayısı:', advertisements.length);
  console.log('Filtreleme parametreleri:', {
    pageId,
    sectionId,
    categoryId,
    listingType,
    region,
    isUserLoggedIn
  });

  // Sadece sayfa ve bölüm eşleşmesine göre filtrele, diğer faktörleri daha esnek tut
  const result = advertisements.filter((ad) => {
    // Temel kontroller
    if (!ad || typeof ad !== 'object') {
      return false;
    }

    // Sayfa ID eşleşmesi - sayfaId=4 tüm sayfaları temsil eder
    const pageMatch =
      ad.pageId === pageId ||
      ad.pageId === 4 || // 4: tüm sayfalar
      (pageId === 1 && ad.pageId === 1); // Kategori sayfası özel eşleşme

    if (!pageMatch) {
      return false;
    }

    // Bölüm ID eşleşmesi - bölümId=4 tüm bölümler, pageId=3 detay sayfasında tüm detay bölümleri
    const sectionMatch =
      ad.sectionId === sectionId ||
      ad.sectionId === 4 || // 4: tüm bölümler
      pageId === 3 || // Detay sayfası (İD1/DB1/DS1/HI1)
      (sectionId === 2 && ad.sectionId === 2); // Sidebar özel eşleşme

    if (!sectionMatch) {
      return false;
    }

    // Kullanıcı giriş durumu kontrolü
    if (ad.requiresLogin === true && !isUserLoggedIn) {
      return false;
    }

    return true;
  });

  // Filtreleme sonrası reklamların sayısını ve içeriğini logla
  console.log(`Filtreleme sonrası ${result.length} reklam bulundu`);
  if (result.length === 0) {
    console.warn('Filtreleme kriterlerine uygun reklam bulunamadı:', {
      pageId,
      sectionId,
      categoryId,
      listingType,
      region
    });
  } else {
    console.log(
      'Bulunan reklamlar:',
      result.map((ad) => ({
        id: ad.id,
        title: ad.title,
        categoryId: ad.categoryId,
        sectionId: ad.sectionId
      }))
    );
  }

  return result;
};

/**
 * Reklamları önceliğe göre sıralar (id değeri küçük olan daha öncelikli)
 * @param advertisements - Reklam nesneleri dizisi
 * @returns Sıralanmış reklam dizisi
 */
const sortAdsByPriority = (advertisements: Advertisement[]): Advertisement[] => {
  if (!Array.isArray(advertisements)) return [];

  return [...advertisements].sort((a, b) => Number(a.id) - Number(b.id));
};

/**
 * Reklamları sayfa, bölüm ve kategoriye göre filtreler ve aktif olanları döndürür
 * @param advertisements - Reklam nesneleri dizisi
 * @param options - Filtreleme seçenekleri
 * @returns Filtrelenmiş ve sıralanmış reklam dizisi
 */
const getFilteredAds = (
  advertisements: Advertisement[],
  {
    pageId,
    sectionId,
    categoryId = null,
    listingType = null,
    region = null,
    isUserLoggedIn = false,
    limit = 1
  }: GetFilteredAdsOptions
): Advertisement[] => {
  console.log(
    `getFilteredAds çağrıldı: pageId=${pageId}, sectionId=${sectionId}, categoryId=${categoryId}`
  );

  // Önce aktif reklamları filtrele
  const activeAds = filterActiveAds(advertisements);
  console.log(`Aktif reklam sayısı: ${activeAds.length}`);

  // Sonra sayfa, bölüm ve kategoriye göre filtrele
  const contextFilteredAds = filterAdsByContext(activeAds, {
    pageId,
    sectionId,
    categoryId,
    listingType,
    region,
    isUserLoggedIn
  });

  // Önceliğe göre sırala
  const sortedAds = sortAdsByPriority(contextFilteredAds);

  // İstenilen sayıda reklam döndür
  return sortedAds.slice(0, limit);
};

/**
 * Güvenlik kontrollerini doğrular
 * @param ad - Reklam nesnesi
 * @returns Reklam güvenli ise true
 */
const validateAdSecurity = (ad: Advertisement): boolean => {
  if (!ad || typeof ad !== 'object') return false;

  // Zorunlu alanlar var mı?
  if (!ad.id || !ad.title || !ad.mediaType || !ad.src || !ad.link) {
    console.warn(`[SECURITY] Zorunlu alanlar eksik:`, {
      id: ad.id,
      title: ad.title,
      src: ad.src,
      link: ad.link
    });
    return false;
  }

  // Medya türü geçerli mi?
  const validMediaTypes = ['image', 'video', 'animation', 'iframe', 'html', 'lottie'];
  if (!validMediaTypes.includes(ad.mediaType)) {
    console.warn(`[SECURITY] Geçersiz medya türü:`, ad.mediaType);
    return false;
  }

  // Link güvenli mi? - Gelişmiş güvenlik kontrolü
  const srcSecure = isUrlSecure(ad.src);
  const linkSecure = isUrlSecure(ad.link);

  console.log(`[SECURITY] Reklam ID ${ad.id}:`, {
    src: ad.src,
    srcSecure,
    link: ad.link,
    linkSecure,
    passed: srcSecure && linkSecure
  });

  if (!srcSecure || !linkSecure) {
    console.warn(`[SECURITY] URL güvenlik kontrolü başarısız:`, { srcSecure, linkSecure });
    return false;
  }

  return true;
};

/**
 * URL güvenlik kontrolü - Beyaz liste tabanlı
 * @param url - Kontrol edilecek URL
 * @returns URL güvenli ise true
 */
const isUrlSecure = (url: string | undefined): boolean => {
  if (!url || typeof url !== 'string') {
    console.warn(`[URL_SECURITY] Geçersiz URL:`, url);
    return false;
  }

  // Local yollar (/ ile başlayanlar) her zaman güvenli
  if (url.startsWith('/')) {
    console.log(`[URL_SECURITY] Local yol kabul edildi:`, url);
    return true;
  }

  // JavaScript protokolünü engelle (XSS önleme)
  if (url.toLowerCase().includes('javascript:')) {
    console.warn('Güvenlik: JavaScript protokolü engellendi:', url);
    return false;
  }

  // Data protokolünü engelle
  if (url.toLowerCase().startsWith('data:')) {
    console.warn('Güvenlik: Data protokolü engellendi:', url);
    return false;
  }

  // Sadece HTTPS protokolüne izin ver (HTTP güvensiz)
  if (!url.startsWith('https://')) {
    console.warn('Güvenlik: Sadece HTTPS protokolüne izin veriliyor:', url);
    return false;
  }

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    console.log(`[URL_SECURITY] URL parsing başarılı:`, { url, hostname });

    // Güvenilir domain beyaz listesi
    const trustedDomains = [
      // AcilLazim kendi domainleri
      'acillazim.com',
      'www.acillazim.com',
      'api.acillazim.com',
      'admin.acillazim.com',
      'cdn.acillazim.com',
      'acillazim.net',
      'www.acillazim.net',
      'api.acillazim.net',
      'admin.acillazim.net',
      'cdn.acillazim.net',

      // Google servisleri
      'drive.google.com',
      'docs.google.com',
      'sheets.google.com',
      'lh3.googleusercontent.com',
      'lh4.googleusercontent.com',
      'lh5.googleusercontent.com',
      'lh6.googleusercontent.com',
      'drive.usercontent.google.com',
      'googleusercontent.com',

      // Ücretsiz resim ve video hosting servisleri
      'i.ibb.co',
      'ibb.co',
      'i.imgur.com',
      'imgur.com',
      'res.cloudinary.com',
      'images.unsplash.com',
      'pixabay.com',
      'cdn.pixabay.com',
      'via.placeholder.com',
      'picsum.photos',
      'i.postimg.cc',
      'postimg.cc',

      // GitHub için (raw content)
      'raw.githubusercontent.com',

      // Amazon S3 (AWS)
      's3.amazonaws.com',
      's3.us-east-1.amazonaws.com',
      's3.us-west-1.amazonaws.com',
      's3.us-west-2.amazonaws.com',
      's3.eu-west-1.amazonaws.com',
      's3.eu-central-1.amazonaws.com',
      's3.ap-southeast-1.amazonaws.com',

      // Canva (marketplace)
      'marketplace.canva.com'
    ];

    // Domain kontrolü
    const isDomainTrusted =
      trustedDomains.some((domain) => {
        return hostname === domain || hostname.endsWith('.' + domain);
      }) ||
      // S3 bucket pattern kontrolü (bucket-name.s3.region.amazonaws.com)
      /^[a-zA-Z0-9\-\.]+\.s3\.[a-zA-Z0-9\-]+\.amazonaws\.com$/.test(hostname) ||
      // CloudFront distribution pattern kontrolü
      /^[a-zA-Z0-9]+\.cloudfront\.net$/.test(hostname);

    const isS3Pattern =
      /^[a-zA-Z0-9\-\.]+\.s3\.[a-zA-Z0-9\-]+\.amazonaws\.com$/.test(hostname);
    const isCloudFrontPattern = /^[a-zA-Z0-9]+\.cloudfront\.net$/.test(hostname);

    console.log(`[URL_SECURITY] Domain kontrolü:`, {
      hostname,
      isDomainTrusted,
      isS3Pattern,
      isCloudFrontPattern
    });

    if (!isDomainTrusted) {
      console.warn('Güvenlik: Güvenilir olmayan domain engellendi:', hostname);
      return false;
    }

    // Port kontrolü (standart portlar: 80, 443)
    if (urlObj.port && urlObj.port !== '80' && urlObj.port !== '443') {
      console.warn('Güvenlik: Standart olmayan port engellendi:', urlObj.port);
      return false;
    }

    console.log('URL güvenlik kontrolü başarılı:', hostname);
    return true;
  } catch (error) {
    console.error('URL parsing hatası:', error);
    return false;
  }
};

/**
 * Tüm reklamların güvenlik kontrollerini yapar ve güvenli olanları döndürür
 * @param advertisements - Reklam nesneleri dizisi
 * @returns Güvenlik kontrolünden geçen reklamlar
 */
const filterSecureAds = (advertisements: unknown[]): Advertisement[] => {
  if (!Array.isArray(advertisements)) return [];

  return (advertisements as Advertisement[]).filter(validateAdSecurity);
};

/**
 * Belirli bir kategoriye göre reklamları filtreler
 * @param advertisements - Reklam nesneleri dizisi
 * @param categoryId - Kategori ID
 * @param options - Ek filtreleme seçenekleri
 * @returns Filtrelenmiş reklam dizisi
 */
const filterByCategoryId = (
  advertisements: Advertisement[],
  categoryId: number,
  options: FilterByOptions = {}
): Advertisement[] => {
  if (!Array.isArray(advertisements) || !categoryId) return [];

  return advertisements.filter((ad) => {
    // Kategori ID kontrolü
    if (ad.categoryId !== categoryId) return false;

    // İlan tipi kontrolü (opsiyonel)
    if (options.listingType && ad.listingType) {
      if (ad.listingType !== options.listingType) return false;
    }

    return true;
  });
};

/**
 * Belirli bir bölgeye göre reklamları filtreler
 * @param advertisements - Reklam nesneleri dizisi
 * @param region - Bölge adı
 * @returns Filtrelenmiş reklam dizisi
 */
const filterByRegion = (advertisements: Advertisement[], region: string): Advertisement[] => {
  if (!Array.isArray(advertisements) || !region) return [];

  return advertisements.filter((ad) => {
    if (!ad.regions || !Array.isArray(ad.regions)) return false;
    return ad.regions.includes(region) || ad.regions.includes('all');
  });
};

/**
 * Kullanıcı giriş durumuna göre reklamları filtreler
 * @param advertisements - Reklam nesneleri dizisi
 * @param isUserLoggedIn - Kullanıcı giriş yapmış mı
 * @returns Filtrelenmiş reklam dizisi
 */
const filterByLoginStatus = (
  advertisements: Advertisement[],
  isUserLoggedIn: boolean
): Advertisement[] => {
  if (!Array.isArray(advertisements)) return [];

  if (isUserLoggedIn) {
    // Kullanıcı giriş yapmışsa tüm reklamları görebilir
    return advertisements;
  } else {
    // Kullanıcı giriş yapmamışsa, giriş gerektirmeyen reklamları filtrele
    return advertisements.filter((ad) => ad.requiresLogin !== true);
  }
};

export {
  isDateValid,
  filterActiveAds,
  filterAdsByContext,
  sortAdsByPriority,
  getFilteredAds,
  validateAdSecurity,
  filterSecureAds,
  filterByCategoryId,
  filterByRegion,
  filterByLoginStatus,
  isUrlSecure
};
