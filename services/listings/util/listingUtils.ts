/**
 * İlan işlemleri için yardımcı fonksiyonlar
 */

interface ListingItem {
  konum?: { il?: string; ilce?: string };
  il?: string;
  ilce?: string;
  location?: string;
  city?: string;
  sehir?: string;
  [key: string]: unknown;
}

// UTF-8 Mojibake tablosu (Örn: Can Ã–ztÃ¼rk -> Can Öztürk, Ä°Ã§ -> İç)
const MOJIBAKE_MAP: Record<string, string> = {
  'Ã§': 'ç', 'Ã‡': 'Ç',
  'Ã¶': 'ö', 'Ã–': 'Ö',
  'Ã¼': 'ü', 'Ãœ': 'Ü',
  'ÄŸ': 'ğ', 'Äž': 'Ğ',
  'Ä±': 'ı', 'Ä°': 'İ',
  'ÅŸ': 'ş', 'Åž': 'Ş',
  'Ã¢': 'â', 'Ã®': 'î', 'Ã»': 'û',
  'Ã©': 'é',
  'â€™': "'", 'â€œ': '"', 'â€': '"', 'â€“': '–', 'â€”': '—',
};

// Veritabanı charset / encoding bozulmalarından (??) kaynaklanan kelimeleri onaran sözlük
const TURKISH_CORRUPTED_WORDS: Record<string, string> = {
  // Şehirler & İlçeler
  '??stanbul': 'İstanbul',
  '??sk??dar': 'Üsküdar',
  '??zmit': 'İzmit',
  '??zmir': 'İzmir',
  'eski??ehir': 'Eskişehir',
  'ba??ak??ehir': 'Başakşehir',
  'be??ikta??': 'Beşiktaş',
  'kad??k??y': 'Kadıköy',
  'kartal': 'Kartal',
  '??ankaya': 'Çankaya',
  '??ank??r??': 'Çankırı',
  '??orum': 'Çorum',
  'ayd??n': 'Aydın',
  'diyarbak??r': 'Diyarbakır',
  'elaz????': 'Elazığ',
  'gaziantep': 'Gaziantep',
  'k??r??kkale': 'Kırıkkale',
  'k??rklareli': 'Kırklareli',
  'k??r??ehir': 'Kırşehir',
  'k??tahya': 'Kütahya',
  'mu??la': 'Muğla',
  'ni??de': 'Niğde',
  'tekirda??': 'Tekirdağ',
  '??anl??urfa': 'Şanlıurfa',
  'u??ak': 'Uşak',

  // Yaygın İlan Başlık & Açıklama Terimleri
  'g??venlik': 'Güvenlik',
  'g??venli': 'güvenli',
  'g??ven': 'güven',
  'bak??m??': 'Bakımı',
  'bak??m': 'Bakım',
  'onar??m??': 'Onarımı',
  'onar??m': 'Onarım',
  '??at??': 'Çatı',
  '??at??s??': 'Çatısı',
  '??zolasyonu': 'İzolasyonu',
  '??zolasyon': 'İzolasyon',
  'yal??t??m??': 'Yalıtımı',
  'yal??t??m': 'Yalıtım',
  'ustas??': 'Ustası',
  'usta': 'Usta',
  'n??bet??i': 'Nöbetçi',
  'ar??za': 'Arıza',
  'ar??zas??': 'Arızası',
  'i??leri': 'işleri',
  'i??': 'iş',
  'i??yeri': 'işyeri',
  'i?? yeri': 'iş yeri',
  'y??l': 'yıl',
  'y??ll??k': 'yıllık',
  's??zd??rmazl??k': 'sızdırmazlık',
  'sertifikas??': 'sertifikası',
  'atmas??': 'atması',
  'k??sa': 'kısa',
  'ayd??nlatma': 'aydınlatma',
  'montaj??': 'montajı',
  'montaj': 'montaj',
  'standartlar??nda': 'standartlarında',
  'standartlar??': 'standartları',
  'fiyatlar??': 'fiyatları',
  'fiyat??': 'fiyatı',
  'yap??l??r': 'yapılır',
  'yap??m??': 'yapımı',
  'yap??m': 'yapım',
  'temizli??i': 'temizliği',
  'temizlik': 'temizlik',
  'servisi': 'servisi',
  'hizmeti': 'hizmeti',
  'hizmetleri': 'hizmetleri',
  'kalitel??': 'kaliteli',
  'garantil??': 'garantili',
  'tesisat??': 'tesisatı',
  'elektrik??i': 'Elektrikçi',
  'boyac??': 'Boyacı',
  'tamir??': 'tamiri',
  'tamirat??': 'tamiratı',
  'yenileme': 'yenileme',
  'aktarma': 'aktarma',
  'kiremit': 'kiremit',
};

/**
 * Bozulmuş Türkçe karakterleri (mojibake ve ?? işaretleri) akıllıca onarır
 */
export function fixCorruptedTurkishText(text: string): string {
  if (!text || typeof text !== 'string') return text;
  let r = text;

  // 1. Mojibake düzeltmesi (Ã–ztÃ¼rk -> Öztürk)
  for (const [k, v] of Object.entries(MOJIBAKE_MAP)) {
    r = r.split(k).join(v);
  }

  // 2. ?? ile bozulmuş Türkçe kelimeleri onar
  if (r.includes('??')) {
    for (const [k, v] of Object.entries(TURKISH_CORRUPTED_WORDS)) {
      const pattern = k.replace(/\?/g, '\\?');
      const regex = new RegExp('(^|[^a-zA-ZçÇğĞıİöÖşŞüÜ0-9])' + pattern + '(?=$|[^a-zA-ZçÇğĞıİöÖşŞüÜ0-9])', 'gi');
      r = r.replace(regex, (match, prefix) => {
        const word = match.slice(prefix.length);
        const isUpper = word === word.toUpperCase();
        const isCapital = word[0] === word[0].toUpperCase();
        const replacement = isUpper ? v.toUpperCase() : (isCapital ? v.charAt(0).toUpperCase() + v.slice(1) : v.toLowerCase());
        return prefix + replacement;
      });
    }

    // 3. Yaygın Türkçe ek kalıpları
    r = r.replace(/([a-zA-ZçÇğĞıİöÖşŞüÜ])lar\?\?/gi, '$1ları');
    r = r.replace(/([a-zA-ZçÇğĞıİöÖşŞüÜ])ler\?\?/gi, '$1leri');
    r = r.replace(/([a-zA-ZçÇğĞıİöÖşŞüÜ])s\?\?/gi, '$1sı');
    r = r.replace(/([a-zA-ZçÇğĞıİöÖşŞüÜ])l\?\?k/gi, '$1lık');
    r = r.replace(/([a-zA-ZçÇğĞıİöÖşŞüÜ])c\?\?/gi, '$1cı');
    r = r.replace(/([a-zA-ZçÇğĞıİöÖşŞüÜ])ç\?\?/gi, '$1çı');
  }

  return r;
}

/**
 * HTML karakter kodlarını düzgün metne dönüştürür ve bozulmuş Türkçe karakterleri onarır
 * @param text - Dönüştürülecek metin
 * @returns Dönüştürülmüş ve onarılmış metin
 */
export function decodeHtmlEntities(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let decoded = text;

  // SSR uyumlu HTML entity decode (document olmadan)
  if (typeof document !== 'undefined') {
    try {
      const textArea = document.createElement('textarea');
      textArea.innerHTML = text;
      decoded = textArea.value;
    } catch {
      decoded = text;
    }
  } else {
    // Server-side fallback: yaygın entity'leri manuel çevir
    decoded = text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }

  // Bozulmuş Türkçe karakterleri onar
  return fixCorruptedTurkishText(decoded);
}

/**
 * İlan başlığını biçimlendirir (HTML karakter kodlarını düzeltir)
 * @param title - İlan başlığı
 * @returns Düzeltilmiş başlık
 */
export function formatListingTitle(title: string): string {
  if (!title) return '';

  // HTML karakter kodlarını düzelt
  return decodeHtmlEntities(title);
}

/**
 * İlan konumunu birleştirir
 * @param listing - İlan objesi
 * @returns "İl, İlçe" formatında konum
 */
export function formatListingLocation(listing: ListingItem): string {
  if (!listing) return '';

  let location = 'Belirtilmemiş';
  let il = '';
  let ilce = '';

  // İl ve ilçe bilgilerini farklı objelerden çıkart
  if (listing.konum && listing.konum.il) {
    // Eski format: Direkt konum nesnesi varsa
    il = listing.konum.il;
    ilce = listing.konum.ilce || '';
  } else if (listing.il) {
    // Yeni format: Ayrıştırılmış il ve ilçe bilgileri
    il = listing.il;
    ilce = listing.ilce || '';
  } else if (
    listing.location &&
    typeof listing.location === 'string' &&
    listing.location.includes(',')
  ) {
    // Zaten formatlanmış location string varsa
    // İl ve ilçeyi ayır
    const parts = listing.location.split(',').map((part) => part.trim());
    il = parts[0];
    ilce = parts.length > 1 ? parts[1] : '';
  } else {
    // Diğer alternatifler
    il = listing.city || listing.sehir || (listing as Record<string, unknown>).province as string || 'Belirtilmemiş';
    ilce = (listing as Record<string, unknown>).district as string || '';
  }

  // İstanbul Anadolu/Avrupa Yakası ifadelerini temizle
  if (il && il.startsWith('İstanbul ')) {
    il = 'İstanbul';
  }

  // Konum bilgisini formatla
  if (il && ilce) {
    location = `${il}, ${ilce}`;
  } else {
    location = il || 'Belirtilmemiş';
  }

  return decodeHtmlEntities(location);
}

/**
 * Fiyat formatla
 * @param price - Fiyat değeri
 * @returns Formatlanmış fiyat (1000 -> 1.000)
 */
export function formatPrice(price: number | string): string {
  if (!price) return '0';
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Tarihi formatlar
 * @param date - Tarih değeri (string, ISO formatı, Date objesi vb.)
 * @returns Formatlanmış tarih (örn: "27 Nisan 2025")
 */
export function formatDate(date: string | Date): string {
  if (!date) return '';

  // Date objesi değilse, string'i Date objesine çevir
  let dateObj: Date;

  try {
    if (typeof date === 'string') {
      // ISO formatı, Unix timestamp (ms), veya diğer string formatları
      if (date.includes('T')) {
        // ISO formatı (2023-04-27T14:30:00.000Z)
        dateObj = new Date(date);
      } else if (!isNaN(Number(date)) && date.length === 10) {
        // Unix timestamp (saniye) - 10 haneli
        dateObj = new Date(parseInt(date) * 1000);
      } else if (!isNaN(Number(date)) && date.length === 13) {
        // Unix timestamp (milisaniye) - 13 haneli
        dateObj = new Date(parseInt(date));
      } else {
        // Diğer string formatları
        dateObj = new Date(date);
      }
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      return '';
    }

    // Geçersiz tarih kontrolü
    if (isNaN(dateObj.getTime())) {
      return '';
    }

    // Türkçe ay isimleri
    const aylar = [
      'Ocak',
      'Şubat',
      'Mart',
      'Nisan',
      'Mayıs',
      'Haziran',
      'Temmuz',
      'Ağustos',
      'Eylül',
      'Ekim',
      'Kasım',
      'Aralık'
    ];

    const gun = dateObj.getDate();
    const ay = aylar[dateObj.getMonth()];
    const yil = dateObj.getFullYear();

    // "27 Nisan 2025" formatında döndür
    return `${gun} ${ay} ${yil}`;
  } catch (error) {
    console.error('Tarih formatı dönüştürme hatası:', error);
    return '';
  }
}

/** Kartlarda görsel yoksa: public/Görsel yok fotosu.png (UTF-8 yol; encode 404/kırık ikona yol açabiliyordu) */
export const LISTING_PLACEHOLDER_IMAGE = '/Görsel yok fotosu.png';

function pickFirstImageFromArray(arr: unknown): string | null {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const first = arr[0];
  if (typeof first === 'string' && first.trim()) return first.trim();
  if (first && typeof first === 'object') {
    const o = first as Record<string, unknown>;
    const u = o.url ?? o.src ?? o.image ?? o.photo ?? o.path;
    if (typeof u === 'string' && u.trim()) return u.trim();
  }
  return null;
}

/**
 * İlan kaydında görsel URL’sini tek yerden çözer (API / mock alan adı farkları).
 */
export function getListingPrimaryImageUrl(
  listing: Record<string, unknown> | null | undefined
): string | null {
  if (!listing) return null;

  const candidates: unknown[] = [
    listing.img,
    listing.image,
    listing.resim,
    listing.photo,
    listing.thumbnail,
    listing.cover_image,
    listing.main_image,
    listing.image_url,
    listing.photo_url,
    listing.coverImage,
    listing.mainImage,
    listing.primary_image,
  ];

  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }

  const fromResimler = pickFirstImageFromArray(listing.resimler);
  if (fromResimler) return fromResimler;
  const fromImages = pickFirstImageFromArray(listing.images);
  if (fromImages) return fromImages;
  const fromPhotos = pickFirstImageFromArray(listing.photos);
  if (fromPhotos) return fromPhotos;

  return null;
}


/**
 * Dizi veya diziyi temsil eden metinleri (JSON array, Java toString array, virgülle ayrılmış liste)
 * güvenli bir şekilde JavaScript Array yapısına dönüştürür.
 */
export function safeParseArray<T = unknown>(raw: unknown): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === '[]' || trimmed === '{}') return [];

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return [];
    }

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed as T[];
      } catch {
        // Not valid JSON
      }
    }

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const inner = trimmed.slice(1, -1).trim();
      if (!inner) return [];

      if (inner.includes('{') && inner.includes('}')) {
        const objectMatches = inner.match(/\{[^}]+\}/g);
        if (objectMatches && objectMatches.length > 0) {
          return objectMatches.map((objStr) => {
            const content = objStr.slice(1, -1);
            const obj: Record<string, string> = {};
            content.split(',').forEach((pair) => {
              const eqIdx = pair.indexOf('=');
              if (eqIdx > -1) {
                const k = pair.slice(0, eqIdx).trim();
                const v = pair.slice(eqIdx + 1).trim();
                obj[k] = v;
              }
            });
            return obj as unknown as T;
          });
        }
      }

      return inner.split(',').map((s) => s.trim()).filter(Boolean) as unknown as T[];
    }

    if (trimmed.includes(',')) {
      return trimmed.split(',').map((s) => s.trim()).filter(Boolean) as unknown as T[];
    }

    return [trimmed as unknown as T];
  }
  return [];
}

export default {
  safeParseArray,
  decodeHtmlEntities,
  formatListingTitle,
  formatListingLocation,
  formatPrice,
  formatDate,
  getListingPrimaryImageUrl,
  LISTING_PLACEHOLDER_IMAGE,
};
