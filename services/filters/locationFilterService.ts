/**
 * mockFilterData içindeki mahalle/köy kolu için köprü.
 * Tam eşleme locationService async API ile yapılır; burada senkron imza korunur.
 * (İleride cache veya preload ile doldurulabilir.)
 */

export interface QuarterItem {
  id: string | number;
  name: string;
  typeLabel: string;
}

export function getQuartersByDistrictId(_districtId: string | number): QuarterItem[] {
  return [];
}

export function getQuartersByDistrict(_province: string, _district: string): QuarterItem[] {
  return [];
}
