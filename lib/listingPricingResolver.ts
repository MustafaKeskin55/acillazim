/**
 * listingPricingResolver.ts
 *
 * Veritabanı ve API modeline göre Satış, Kiralama ve Hizmet ilanlarının
 * fiyat, paket fiyatı ve periyot görünümlerini %100 dinamik olarak çözer.
 *
 * Veri Modeli Prensipleri:
 * 1. listings.price: Satılıkta satış bedeli, Kiralıkta kira bedeli, Hizmette taban/0.
 * 2. service_packages: Hizmet paketleri bağımsız entity'dir; paket fiyatı malın satış fiyatı gibi basılmaz.
 * 3. listing_type / is_service: İlanın hizmet mi, kiralık mı, satılık mı olduğu ilişkisel
 *    tablolar (service_packages, service_areas, service_working_hours) ve attribute'lar ile belirlenir.
 * 4. Asla sabit ID kontrolüne bel bağlamaz; kategori taşınsa dahi dinamik çalışır.
 */

import { isServiceListing, type CategoryPathItemLike } from './isServiceListing';

export type ListingTransactionType = 'service' | 'rental' | 'sale';

export interface ListingPricingDisplay {
  /** İlanın türü: 'service' | 'rental' | 'sale' */
  type: ListingTransactionType;
  /** Ekranda fiyat/tutar gösterilmeli mi? (Hizmette daima false'tur; paket fiyatını tutar olarak basmaz) */
  hasPrice: boolean;
  /** Formatlanmış fiyat (örn: '450.000', '25.000') veya null */
  formattedPrice: string | null;
  /** Sayısal fiyat */
  rawPrice: number;
  /** Para birimi sembolü ('₺', '$', '€') */
  currencySymbol: string;
  /** Kiralama periyodu ('/ Ay', '/ Gün') veya null */
  periodLabel: string | null;
  /** Hizmete özel aksiyon metni ('Teklif Alın') veya null */
  actionText: string | null;
  /** Pazarlık durumu (listings.price_negotiable) */
  isNegotiable: boolean;
}

/**
 * Sayıyı Türkiye formatında binlik ayracıyla biçimlendirir.
 */
export function formatCurrencyAmount(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === '') return '0';
  const num = typeof value === 'number' ? value : Number(String(value).replace(/\./g, '').replace(/,/g, '.'));
  if (isNaN(num)) return '0';
  return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Para birimini sembole çevirir.
 */
export function resolveCurrencySymbol(currency?: string | null): string {
  const c = String(currency || 'TL').trim().toUpperCase();
  if (c === 'USD' || c === '$') return '$';
  if (c === 'EUR' || c === '€') return '€';
  if (c === 'GBP' || c === '£') return '£';
  return '₺';
}

/**
 * İlan verisinden fiyat görünüm modelini %100 dinamik olarak çözer.
 */
export function resolveListingPricing(
  product?: Record<string, unknown> | null,
  categoryPath?: CategoryPathItemLike[] | null,
  pathname?: string | null
): ListingPricingDisplay {
  if (!product || typeof product !== 'object') {
    return {
      type: 'sale',
      hasPrice: false,
      formattedPrice: null,
      rawPrice: 0,
      currencySymbol: '₺',
      periodLabel: null,
      actionText: null,
      isNegotiable: false,
    };
  }

  // 1. HİZMET TESPİTİ (İlişkisel tablolar, is_service flag'i ve semantik yollar):
  const isService = isServiceListing(product, categoryPath, pathname);

  const rawCurrency = String(product.currency || product.para_birimi || 'TL');
  const currencySymbol = resolveCurrencySymbol(rawCurrency);
  const isNegotiable = Boolean(product.price_negotiable || product.pazarlik || product.priceNegotiable);

  // A) HİZMET İLANI:
  // Kural: Hizmette paket fiyatı genel tutar gibi yazılmaz. Tutar gösterilmez, teklif/iletişim çağrısı yapılır.
  if (isService) {
    return {
      type: 'service',
      hasPrice: false,
      formattedPrice: null,
      rawPrice: 0,
      currencySymbol,
      periodLabel: null,
      actionText: 'Teklif Alın',
      isNegotiable,
    };
  }

  // Fiyat değeri (listings.price veya fiyat)
  const rawPriceNum = Number(product.price ?? product.fiyat ?? 0);
  const hasValidPrice = !isNaN(rawPriceNum) && rawPriceNum > 0;
  const formattedPrice = hasValidPrice ? formatCurrencyAmount(rawPriceNum) : null;

  // 2. KİRALAMA TESPİTİ (listing_attributes.listing_type, kategori ve başlık):
  const attributes = (product.attributes as Record<string, unknown>) || {};
  const ozellikler = (product.ozellikler as Record<string, unknown>) || {};

  const rawListingType = String(
    product.listing_type ||
    product.listingType ||
    attributes.listing_type ||
    ozellikler.listing_type ||
    product.durum ||
    product.islem_turu ||
    product.ilan_turu ||
    ''
  ).toLowerCase().trim();

  // Kategori yolu ve başlık kontrolü
  const kategoriYoluArr = Array.isArray(product.kategoriYolu) ? product.kategoriYolu : [];
  const categoryTexts = [
    rawListingType,
    String(product.kategori || ''),
    String(product.categoryName || ''),
    String(product.categories || ''),
    ...kategoriYoluArr.map(k => String(k || '')),
    String(product.title || product.baslik || '')
  ].join(' ').toLowerCase();

  const isRental =
    rawListingType === 'kiralik' ||
    rawListingType.includes('kiral') ||
    categoryTexts.includes('kiralık') ||
    categoryTexts.includes('kiralik') ||
    categoryTexts.includes('kiralama');

  // B) KİRALAMA İLANI:
  if (isRental) {
    const isDaily =
      rawListingType.includes('gunluk') ||
      rawListingType.includes('günlük') ||
      categoryTexts.includes('günlük') ||
      categoryTexts.includes('gunluk');

    return {
      type: 'rental',
      hasPrice: hasValidPrice,
      formattedPrice,
      rawPrice: rawPriceNum,
      currencySymbol,
      periodLabel: isDaily ? '/ Gün' : '/ Ay',
      actionText: null,
      isNegotiable,
    };
  }

  // C) SATILIK İLANI:
  return {
    type: 'sale',
    hasPrice: hasValidPrice,
    formattedPrice,
    rawPrice: rawPriceNum,
    currencySymbol,
    periodLabel: null,
    actionText: null,
    isNegotiable,
  };
}
