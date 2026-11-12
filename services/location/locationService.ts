/**
 * Birleşik Konum Servisi
 * il, ilçe, mahalle (GeoData), kullanıcı konum, ilan filtreleme, OSM harita
 * USE_REAL_API = false → data/geodata/*.json
 * USE_REAL_API = true  → GET /api/v1/locations/...
 * Path alias yok: /api/locations/... veya api.acillazim.com/api/locations (v1’siz) kullanılmaz
 * NEXT_PUBLIC_ prefix | SSR uyumlu localStorage/window guard
 */

import cities from '@/data/geodata/cities.json';
import districts from '@/data/geodata/districts.json';
import quarters from '@/data/geodata/quarters.json';
import villages from '@/data/geodata/villages.json';
import nearbyListingsService from '@/services/listings/nearby-listings/nearbyListingsService';
import featuredListingsService from '@/services/listings/featured-listings/featuredListingsService';

/** Host normalize → {host}/api/v1 */
function resolveLocationApiBase(): string {
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

// ---- TİP TANIMLARI ----
interface CityRaw { Id: number; Name: string; [key: string]: unknown; }
interface DistrictRaw { Id: number; Name: string; CityId: number; [key: string]: unknown; }
interface QuarterRaw {
  Id?: number; ID?: number; QuarterName?: string; Name?: string;
  DistrictId?: number; DistrictID?: number; VillageId?: number; TypeCode?: number;
  [key: string]: unknown;
}
interface VillageRaw {
  Id?: number; ID?: number; Name: string;
  DistrictId?: number; DistrictID?: number; TypeCode?: number;
  [key: string]: unknown;
}
export interface Province { id: number; name: string; osmId: string; }
export interface District { id: number; name: string; provinceId: number; osmId: string; }
export interface Neighborhood {
  id: string; name: string; districtId: number; villageId?: number;
  typeCode: number; typeLabel?: string; type?: string; osmId: string;
}
interface CacheItem<T> { data: T | null; timestamp: number | null; accessCount: number; }
interface GeoDataCache {
  provinces: CacheItem<Province[]>;
  districts: Record<string, CacheItem<District[]>>;
  neighborhoods: Record<string, CacheItem<Neighborhood[]>>;
}
interface LocationData { city: string; district: string | null; savedAt: string; }
interface NearbyListingsResult {
  items: unknown[]; city: string | null; totalCount: number;
  isRecommended: boolean; error?: string;
}
interface Coordinates {
  lat: number; lon: number; displayName: string; osmId: string; osmType: string;
  boundingBox: { north: number; south: number; east: number; west: number; } | null;
}

// ---- YAPILANDIRMA ----
const USE_REAL_API = true; // GET /api/v1/locations/provinces|districts|neighborhoods (canlı BE)
const API_BASE_URL = resolveLocationApiBase();
// Hedef path'ler: `${API_BASE_URL}/locations/provinces|districts|neighborhoods|quarters`

const CACHE_CONFIG = { timeoutMinutes: 120, maxCacheSize: 50, provincesCacheTimeout: 1440 };

const cache: GeoDataCache = {
  provinces: { data: null, timestamp: null, accessCount: 0 },
  districts: {},
  neighborhoods: {}
};

// ---- CACHE YARDIMCILARI ----
const isCacheValid = (item: CacheItem<unknown>, isProvince = false): boolean => {
  if (!item?.timestamp) return false;
  const diffMin = (Date.now() - item.timestamp) / 60000;
  return diffMin < (isProvince ? CACHE_CONFIG.provincesCacheTimeout : CACHE_CONFIG.timeoutMinutes);
};

const incAccess = (item: CacheItem<unknown>) => {
  if (item) item.accessCount = (item.accessCount || 0) + 1;
};

const cleanupCache = (obj: Record<string, CacheItem<unknown>>) => {
  Object.keys(obj).forEach(k => { if (!isCacheValid(obj[k])) delete obj[k]; });
  const keys = Object.keys(obj);
  if (keys.length > CACHE_CONFIG.maxCacheSize) {
    const sorted = keys.sort((a, b) => (obj[a].accessCount || 0) - (obj[b].accessCount || 0));
    const remove = Math.min(Math.ceil((keys.length - CACHE_CONFIG.maxCacheSize) * 1.2), sorted.length);
    for (let i = 0; i < remove; i++) delete obj[sorted[i]];
  }
};

// ---- API / MOCK DATA ----
const fetchFromAPI = async (endpoint: string, params: Record<string, unknown> = {}): Promise<unknown> => {
  // v1 query: province_id / district_id (camelCase alias gönderilmez)
  const normalized: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    if (k === 'provinceId') normalized.province_id = String(v);
    else if (k === 'districtId') normalized.district_id = String(v);
    else normalized[k] = String(v);
  }
  const qs = new URLSearchParams(normalized).toString();
  const url = `${API_BASE_URL}${endpoint}${qs ? `?${qs}` : ''}`;
  console.log(`[Location API] GET ${url}`);
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
  if (!response.ok) throw new Error(`API hatası: ${response.status}`);
  const json = await response.json();
  if (json && typeof json === 'object' && 'data' in json && (json as { success?: boolean }).success !== false) {
    return (json as { data: unknown }).data;
  }
  return json;
};

const filterAndFormat = (
  dataType: string,
  data: (CityRaw | DistrictRaw | QuarterRaw | VillageRaw)[],
  params?: Record<string, unknown>
): unknown[] => {
  switch (dataType) {
    case 'cities':
      return (data as CityRaw[]).map(c => ({ id: c.Id, name: c.Name, osmId: `city_${c.Id}` }))
        .sort((a, b) => a.name.localeCompare(b.name, 'tr'));

    case 'districts': {
      let d = data as DistrictRaw[];
      if (params?.provinceId) {
        const cid = parseInt(String(params.provinceId));
        d = d.filter(x => x.CityId === cid);
      }
      return d.map(x => ({ id: x.Id, name: x.Name, provinceId: x.CityId, osmId: `district_${x.Id}` }))
        .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    }

    case 'quarters': {
      let q = data as QuarterRaw[];
      if (params?.districtId) {
        const did = parseInt(String(params.districtId));
        q = q.filter(x => x.DistrictId === did || x.DistrictID === did);
      }
      return q.map(x => ({
        id: `${x.DistrictId || x.DistrictID}_mah_${x.Id || x.ID}`,
        name: x.QuarterName || x.Name,
        districtId: x.DistrictId || x.DistrictID,
        typeCode: x.TypeCode || 0,
        osmId: `quarter_${x.Id || x.ID}`
      })).filter((x: unknown) => {
        const i = x as { name: string; typeCode: number };
        return i.name !== 'MERKEZ' && !i.name?.match(/^MERKEZ\s/i) && i.typeCode !== 3;
      }).sort((a, b) => (a as { name: string }).name.localeCompare((b as { name: string }).name, 'tr'));
    }

    case 'neighborhoods': {
      if (!params?.districtId) return [];
      const did = parseInt(String(params.districtId));
      const allV = (villages as VillageRaw[]).filter(v =>
        v.DistrictId === did || v.DistrictID === did ||
        String(v.DistrictId) === String(did) || String(v.DistrictID) === String(did)
      );
      const nonCentral = allV.filter(v =>
        v.Name !== 'MERKEZ' && !v.Name?.match(/^MERKEZ\s/i) && v.TypeCode !== 3
      );
      const allQ = (quarters as QuarterRaw[]).filter(q => {
        const dm = q.DistrictId === did || q.DistrictID === did ||
          String(q.DistrictId) === String(did) || String(q.DistrictID) === String(did);
        const vIds = allV.map(v => v.Id || v.ID);
        return dm || (q.VillageId && vIds.includes(q.VillageId as number));
      });
      const result: unknown[] = [];
      nonCentral.forEach(v => result.push({
        id: `${did}_koy_${v.Id || v.ID}`, name: v.Name, districtId: did,
        villageId: v.Id || v.ID, typeCode: v.TypeCode || 0, typeLabel: 'Köy',
        type: 'village', osmId: `village_${v.Id || v.ID}`
      }));
      allQ.forEach(q => result.push({
        id: `${did}_mah_${q.Id || q.ID}`, name: q.QuarterName || q.Name,
        districtId: did, villageId: q.VillageId, typeCode: q.TypeCode || 1,
        typeLabel: 'Mahalle', type: 'quarter', osmId: `quarter_${q.Id || q.ID}`
      }));
      return result.sort((a, b) => (a as { name: string }).name.localeCompare((b as { name: string }).name, 'tr'));
    }

    default:
      return [];
  }
};

const fetchGeoData = async (dataType: string, params?: Record<string, unknown>): Promise<unknown[]> => {
  if (USE_REAL_API) {
    const eps: Record<string, string> = {
      cities: '/locations/provinces', districts: '/locations/districts',
      quarters: '/locations/quarters', neighborhoods: '/locations/neighborhoods'
    };
    return (await fetchFromAPI(eps[dataType] || `/${dataType}`, params)) as unknown[];
  }
  const rawMap: Record<string, unknown[]> = {
    cities: cities as unknown[], districts: districts as unknown[],
    quarters: quarters as unknown[], neighborhoods: [...(quarters as unknown[]), ...(villages as unknown[])],
    villages: villages as unknown[]
  };
  const raw = rawMap[dataType];
  if (!raw) throw new Error(`Bilinmeyen veri tipi: ${dataType}`);
  return filterAndFormat(dataType, raw as (CityRaw | DistrictRaw | QuarterRaw | VillageRaw)[], params);
};

// ============================================================================
// COĞRAFI VERİ FONKSİYONLARI
// ============================================================================

export const getProvinces = async (): Promise<Province[]> => {
  if (isCacheValid(cache.provinces, true)) {
    incAccess(cache.provinces); return cache.provinces.data!;
  }
  const data = (await fetchGeoData('cities')) as Province[];
  cache.provinces = { data, timestamp: Date.now(), accessCount: 1 };
  return data;
};

export const getDistricts = async (provinceId: number | string): Promise<District[]> => {
  const key = String(provinceId);
  if (cache.districts[key] && isCacheValid(cache.districts[key])) {
    incAccess(cache.districts[key]); return cache.districts[key].data!;
  }
  const data = (await fetchGeoData('districts', { provinceId })) as District[];
  cleanupCache(cache.districts as Record<string, CacheItem<unknown>>);
  cache.districts[key] = { data, timestamp: Date.now(), accessCount: 1 };
  return data;
};

export const getNeighborhoods = async (districtId: number | string): Promise<Neighborhood[]> => {
  const key = String(districtId);
  if (cache.neighborhoods[key] && isCacheValid(cache.neighborhoods[key])) {
    incAccess(cache.neighborhoods[key]); return cache.neighborhoods[key].data!;
  }
  const data = (await fetchGeoData('neighborhoods', { districtId })) as Neighborhood[];
  cleanupCache(cache.neighborhoods as Record<string, CacheItem<unknown>>);
  cache.neighborhoods[key] = { data, timestamp: Date.now(), accessCount: 1 };
  return data;
};

/** @deprecated getProvinces() kullanın */
export const getAllCities = async (): Promise<string[]> => {
  return (await getProvinces()).map(p => p.name);
};

/** @deprecated getDistricts(id) kullanın */
export const getDistrictsByCity = async (cityName: string): Promise<string[]> => {
  if (!cityName) return [];
  const provinces = await getProvinces();
  const city = provinces.find(p => p.name === cityName || p.name.toUpperCase() === cityName.toUpperCase());
  if (!city) return [];
  return (await getDistricts(city.id)).map(d => d.name);
};

export const getDistrictsByCityId = async (cityId: number | string): Promise<District[]> =>
  getDistricts(cityId);

export const getCities = async (): Promise<Province[]> => getProvinces();

export const clearCache = (cacheType = '', id: string | number | null = null): void => {
  if (!cacheType) {
    cache.provinces = { data: null, timestamp: null, accessCount: 0 };
    cache.districts = {}; cache.neighborhoods = {};
    return;
  }
  if (cacheType === 'provinces') {
    cache.provinces = { data: null, timestamp: null, accessCount: 0 };
  } else if (cacheType === 'districts') {
    if (id) delete cache.districts[String(id)]; else cache.districts = {};
  } else if (cacheType === 'neighborhoods') {
    if (id) delete cache.neighborhoods[String(id)]; else cache.neighborhoods = {};
  }
};

export const getCacheStats = () => ({
  provinces: { cached: cache.provinces.data !== null, accessCount: cache.provinces.accessCount, itemCount: cache.provinces.data?.length || 0 },
  districts: { cachedCount: Object.keys(cache.districts).length, totalItems: Object.values(cache.districts).reduce((s, i) => s + (i.data?.length || 0), 0) },
  neighborhoods: { cachedCount: Object.keys(cache.neighborhoods).length, totalItems: Object.values(cache.neighborhoods).reduce((s, i) => s + (i.data?.length || 0), 0) }
});

export const getQuartersByDistrict = async (province: string, district: string): Promise<Neighborhood[]> => {
  if (!province || !district) return [];
  const provinces = await getProvinces();
  const city = provinces.find(c => normalizeCity(c.name) === normalizeCity(province));
  if (!city) return [];
  const dists = await getDistricts(city.id);
  const d = dists.find(x => normalizeCity(x.name) === normalizeCity(district));
  if (!d) return [];
  return getNeighborhoods(d.id);
};

export const getQuartersByMultipleDistrictIds = async (ids: (string | number)[]): Promise<Neighborhood[]> => {
  if (!ids?.length) return [];
  const all: Neighborhood[] = [];
  for (const id of ids) {
    const n = await getNeighborhoods(id);
    all.push(...n);
  }
  const seen = new Set<string>();
  return all.filter(n => { if (seen.has(n.id)) return false; seen.add(n.id); return true; })
    .sort((a, b) => a.name.localeCompare(b.name, 'tr-TR'));
};

export const getIlIlceData = async (): Promise<{ provinces: string[]; districtsMap: Record<string, string[]> }> => {
  const names = await getAllCities();
  const provs = await getProvinces();
  const map: Record<string, string[]> = {};
  for (const name of names) {
    const city = provs.find(c => c.name === name);
    if (city) map[name] = (await getDistricts(city.id)).map(d => d.name);
  }
  return { provinces: names, districtsMap: map };
};

export const isValidDistrict = async (province: string, district: string): Promise<boolean> => {
  const dists = await getDistrictsByCity(province);
  return dists.some(d => d === district);
};

export const normalizeProvinceForMap = (province: string): string => {
  if (!province) return '';
  if (province.includes('İstanbul')) return 'İstanbul';
  return province;
};

// ============================================================================
// 2. KULLANICI KONUM YÖNETİMİ
// ============================================================================

export const normalizeCity = (cityName: string): string => {
  if (!cityName) return '';
  return cityName.toLowerCase().trim()
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');
};

export const saveUserLocation = (city: string, district: string | null = null): boolean => {
  if (typeof window === 'undefined' || !city) return false;
  try {
    const data: LocationData = { city, district, savedAt: new Date().toISOString() };
    localStorage.setItem('user_location', JSON.stringify(data));
    setLocationModalSeen(true);
    window.dispatchEvent(new CustomEvent('userLocationChanged', { detail: data }));
    return true;
  } catch { return false; }
};

export const getUserLocation = (): LocationData | null => {
  if (typeof window === 'undefined') return null;
  try {
    const s = localStorage.getItem('user_location');
    if (!s) return null;
    const d: LocationData = JSON.parse(s);
    return d?.city ? d : null;
  } catch { return null; }
};

export const clearUserLocation = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.removeItem('user_location');
    setLocationModalSeen(true);
    window.dispatchEvent(new CustomEvent('userLocationChanged', { detail: null }));
    return true;
  } catch { return false; }
};

export const setLocationModalSeen = (seen = true): boolean => {
  if (typeof window === 'undefined') return false;
  try { localStorage.setItem('location_modal_seen', seen.toString()); return true; }
  catch { return false; }
};

export const isLocationModalSeen = (): boolean => {
  if (typeof window === 'undefined') return false;
  try { return localStorage.getItem('location_modal_seen') === 'true'; }
  catch { return false; }
};

export const resetLocationModalSeen = (): boolean => {
  if (typeof window === 'undefined') return false;
  try { localStorage.removeItem('location_modal_seen'); return true; }
  catch { return false; }
};

// ============================================================================
// 3. İLAN FİLTRELEME
// ============================================================================

export const getListingsByCity = async (city: string, limit = 50): Promise<unknown[]> => {
  if (!city) return [];
  // Gerçek BE: nearbyListingsService zaten GET /api/v1/listings?il=...&page_size=... yapıyor
  // (USE_API flag'ine göre). Hata olursa mock'a düşülmez, boş dizi döner.
  try {
    return await nearbyListingsService.getListingsByCity(city, limit);
  } catch (error) {
    console.error('[LocationService] getListingsByCity hatası:', error);
    return [];
  }
};

export const getRecommendedListings = async (limit = 15): Promise<unknown[]> => {
  // Gerçek BE: featuredListingsService zaten GET /api/v1/listings?vitrin_durumu=one_cikan yapıyor.
  // Hata olursa mock'a düşülmez, boş dizi döner.
  try {
    return await featuredListingsService.getFeaturedListings(limit);
  } catch (error) {
    console.error('[LocationService] getRecommendedListings hatası:', error);
    return [];
  }
};

export const getNearbyListings = async (city: string, limit = 15): Promise<NearbyListingsResult> => {
  if (!city) return { items: [], city: null, totalCount: 0, isRecommended: false };
  try {
    const items = await getListingsByCity(city, limit);
    return { items, city, totalCount: items.length, isRecommended: false };
  } catch (e) {
    return { items: [], city, totalCount: 0, isRecommended: false, error: (e as Error).message };
  }
};

// ============================================================================
// 4. HARİTA KOORDİNAT İŞLEMLERİ (OSM)
// ============================================================================

export const getCoordinates = async (params: {
  city: string; district?: string; neighborhood?: string;
}): Promise<Coordinates> => {
  if (!params.city) throw new Error('İl bilgisi gerekli');
  let q = params.city;
  if (params.district) q = params.district + ', ' + q;
  if (params.neighborhood) q = params.neighborhood + ', ' + q;
  q += ', Türkiye';
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&addressdetails=1&accept-language=tr`;
  const res = await fetch(url, { headers: { 'User-Agent': 'AcilLazimApp/1.0' } });
  if (!res.ok) throw new Error(`Koordinat alınamadı: ${res.status}`);
  const data = await res.json();
  if (!data?.length) throw new Error('Koordinat bulunamadı');
  const r = data[0];
  return {
    lat: parseFloat(r.lat), lon: parseFloat(r.lon),
    displayName: r.display_name, osmId: r.osm_id, osmType: r.osm_type,
    boundingBox: r.boundingbox ? {
      north: parseFloat(r.boundingbox[1]), south: parseFloat(r.boundingbox[0]),
      east: parseFloat(r.boundingbox[3]), west: parseFloat(r.boundingbox[2])
    } : null
  };
};

export const getOpenStreetMapUrl = (lat: number, lon: number, zoom = 15): string =>
  `https://www.openstreetmap.org/#map=${zoom}/${lat}/${lon}`;

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

const locationService = {
  getProvinces, getDistricts, getNeighborhoods, getAllCities,
  getDistrictsByCity, getDistrictsByCityId, getCities, clearCache, getCacheStats,
  normalizeCity, saveUserLocation, getUserLocation, clearUserLocation,
  setLocationModalSeen, isLocationModalSeen, resetLocationModalSeen,
  getNearbyListings, getListingsByCity, getRecommendedListings,
  getCoordinates, getOpenStreetMapUrl,
  getQuartersByDistrict, getQuartersByMultipleDistrictIds,
  getIlIlceData, isValidDistrict, normalizeProvinceForMap
};

export default locationService;
