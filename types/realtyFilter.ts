/**
 * Emlak dinamik filtre şeması — kaynak: `data/realty_filter.json`
 * API / mock aynı yapıyı döndürebilir; `adaptFilterFromJson` ile UI alanına normalize edilir.
 */

/** JSON ve kodda kullanılan görünüm / davranış tipi */
export type RealtyFilterUiType =
  | 'multi-select'
  | 'checkbox'
  | 'radio'
  | 'select'
  | 'dropdown'
  /** Min–max (ör. Brüt m², Net m²) — `options` dizisi yok, `unit` olabilir */
  | 'range';

/** realty_filter.json içindeki `options` nesnesi için ortak alanlar */
export interface RealtyFilterOptionsCommon {
  priority?: boolean;
  label: string;
  type: RealtyFilterUiType;
  db_field: string;
  display_location?: string;
}

/** Seçenek listeli filtreler (oda sayısı, ısıtma, Evet/Hayır vb.) */
export interface RealtyFilterOptionsWithChoices extends RealtyFilterOptionsCommon {
  type: Exclude<RealtyFilterUiType, 'range'>;
  options: string[];
}

/** Aralık filtreleri (Brüt m², fiyat aralığı vb.) */
export interface RealtyFilterOptionsRange extends RealtyFilterOptionsCommon {
  type: 'range';
  unit?: string;
}

/** JSON’daki tek bir `options` bloğu */
export type RealtyFilterOptionsBlock =
  | RealtyFilterOptionsWithChoices
  | RealtyFilterOptionsRange;

/** `realty_filter.json` kök dizisindeki tek öğe */
export interface RealtyFilterJsonEntry {
  id: number;
  category_dependency: number[];
  options: RealtyFilterOptionsBlock;
}

/** `mockFilterData.adaptFilterFromJson` çıktısı — FilterSidebar’daki `categoryFilters` satırı */
export interface AdaptedDynamicFilter {
  id: string | number;
  urlParam: string | number;
  label: string;
  /** Sunucu yeni bir `type` ekleyebilir; daraltmak için `RealtyFilterUiType` ile kesiştirilebilir */
  type: RealtyFilterUiType | string;
  formatting: string;
  unit: string;
  apiField: string;
  isRequired: boolean;
  allowMultiple: boolean;
  dependsOn: unknown;
  optionsSource: string | null;
  options: string[];
}

/** `categoryFilterValues` state: filtre id → tek değer | çoklu | aralık */
export type CategoryFilterValuesMap = Record<
  string | number,
  string | string[] | { min?: string; max?: string } | undefined
>;

export function isRangeFilterOptions(o: RealtyFilterOptionsBlock): o is RealtyFilterOptionsRange {
  return o.type === 'range';
}

export function isAdaptedRangeFilter(f: AdaptedDynamicFilter): boolean {
  return f.type === 'range';
}

/**
 * `data/filtre/emlak.json` Net/Brüt m² için `type: "price"` kullanılır (sayısal min–max).
 * `realty_filter.json` aynı UI için `range` kullanır — ikisi de aynı bileşende gösterilir.
 */
export function isNumericRangeFilterType(type: string | undefined): boolean {
  return type === 'range' || type === 'price';
}
