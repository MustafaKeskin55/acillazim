/**
 * carDamageService.ts - Araç hasar/boya durumu servisi
 * processCarDamageInfo: client-only (ilan ozellikler parse).
 * getDamageStatusConfig: mock; hedef GET /api/v1/listings/vehicle-damage/config (veya FE const).
 * Path alias yok.
 */

/** Host normalize → {host}/api/v1 */
function resolveCarDamageApiBase(): string {
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

const API_BASE_URL = resolveCarDamageApiBase();

// ---- TİP TANIMLARI ----
interface StatusType {
  label: string;
  color: string;
}

interface DamageStatusConfig {
  title: string;
  statusTypes: Record<string, StatusType>;
  partTranslations: Record<string, string>;
}

interface CarBasicInfo {
  marka?: string;
  model?: string;
  modelYili?: string | number;
}

interface DamageResult {
  carId: number;
  carInfo: CarBasicInfo;
  partsStatus: Record<string, string>;
  hasAnyDamage: boolean;
  message: string;
  config: DamageStatusConfig;
}

interface ApiResult<T = unknown> {
  success: boolean;
  message?: string;
  data: T;
}

interface ProductData {
  ilan_id: number;
  ozellikler?: {
    hasar_durumlari?: Record<string, string>;
    parca_durumlari?: Record<string, string>;
    arac_temel_bilgileri?: {
      marka?: string;
      model?: string;
      model_yili?: string | number;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

let cachedConfig: DamageStatusConfig | null = null;

/**
 * API'den hasar durumu konfigürasyon bilgilerini getiren fonksiyon
 * Canlı BE: GET /api/v1/mobile/config/damage-status
 */
export const getDamageStatusConfig = async (): Promise<ApiResult<DamageStatusConfig | null>> => {
  try {
    if (cachedConfig) {
      return { success: true, data: cachedConfig };
    }

    const response = await fetch(`${API_BASE_URL}/mobile/config/damage-status`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();
    if (!json?.success || !json?.data) {
      throw new Error(json?.error?.message || 'Durum konfigürasyonu alınamadı');
    }

    cachedConfig = json.data as DamageStatusConfig;
    return { success: true, data: cachedConfig };
  } catch (error) {
    console.error('Araç durum konfigürasyonu alınamadı:', error);
    return { success: false, message: 'Durum konfigürasyonu alınamadı', data: null };
  }
};

/**
 * Ürün verilerinden araç hasar bilgilerini çıkartıp işleyen fonksiyon
 */
export const processCarDamageInfo = async (
  productData: ProductData
): Promise<ApiResult<DamageResult | null> | null> => {
  try {
    if (!productData) {
      throw new Error('Ürün verisi bulunamadı');
    }

    // Hasar durumlarını kontrol et
    const partConditions: Record<string, string> =
      productData.ozellikler?.hasar_durumlari ||
      productData.ozellikler?.parca_durumlari ||
      {};

    // Eğer hasar verisi yoksa null döndür
    if (Object.keys(partConditions).length === 0) {
      return null;
    }

    // API'den statüs konfigürasyonlarını al
    const configResponse = await getDamageStatusConfig();
    if (!configResponse.success || !configResponse.data) {
      throw new Error('Durum konfigürasyonu alınamadı');
    }

    const config = configResponse.data;
    const statusTypes = config.statusTypes || {};
    const partTranslations = config.partTranslations || {};

    // API yanıtındaki durum etiketlerini bir listede topla
    const statusLabels: Record<string, string> = {};
    Object.entries(statusTypes).forEach(([key, data]) => {
      statusLabels[data.label] = key;
    });

    // Ön tampon için özel işlem
    if (partConditions.on_tampon) {
      partConditions.on_tampon_sol = partConditions.on_tampon;
      partConditions.on_tampon_sag = partConditions.on_tampon;
    }

    // Parça durumlarını kategorilere ayır
    const categories: Record<string, Set<string>> = {};
    Object.keys(statusTypes).forEach(key => {
      categories[key] = new Set();
    });

    // Her parçayı ilgili kategoriye ekle
    Object.entries(partConditions).forEach(([part, status]) => {
      if (part !== 'on_tampon_sol' && part !== 'on_tampon_sag') {
        const formattedName = partTranslations[part] || part;
        const statusKey = statusLabels[status] || 'unspecified';

        if (categories[statusKey]) {
          categories[statusKey].add(formattedName);
        }
      }
    });

    // Hasar mesajı oluştur
    let message = '';

    if (
      categories.local_painted.size === 0 &&
      categories.painted.size === 0 &&
      categories.changed.size === 0
    ) {
      message = 'Aracın tüm parçaları orijinaldir. Değişen ve boyalı parçası bulunmamaktadır.';
    } else {
      Object.entries(categories).forEach(([statusKey, parts]) => {
        if (parts.size > 0) {
          const statusLabel = statusTypes[statusKey]?.label || statusKey;
          const partsList = Array.from(parts).map(part => part.replace(/\.$/, ''));
          message += `${statusLabel} parçalar: ${partsList.join(', ')}. `;
        }
      });
    }

    return {
      success: true,
      data: {
        carId: productData.ilan_id,
        carInfo: {
          marka: productData.ozellikler?.arac_temel_bilgileri?.marka,
          model: productData.ozellikler?.arac_temel_bilgileri?.model,
          modelYili: productData.ozellikler?.arac_temel_bilgileri?.model_yili
        },
        partsStatus: partConditions,
        hasAnyDamage: Object.values(partConditions).some(status => status !== 'Orijinal'),
        message: message,
        config: configResponse.data
      }
    };
  } catch (error) {
    console.error('Araç hasar bilgileri işlenirken hata oluştu:', error);
    return { success: false, message: 'Araç hasar bilgileri işlenemedi', data: null };
  }
};

export default {
  processCarDamageInfo,
  getDamageStatusConfig
};
