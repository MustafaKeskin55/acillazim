/**
 * Vitrin Listings Service (Vitrin İlanları Servisi)
 *
 * USE_API = false  → data/üründat.json'dan vitrin ilanlarını çeker
 * USE_API = true   → GET /api/v1/listings?vitrin_durumu=vitrin
 *
 * Path alias yok: /api/listings/vitrin kullanılmaz.
 * Geçiş: api/config.ts dosyasındaki USE_API flag'ini değiştir.
 */
import BaseListingsService from '@/services/listings/base/baseListingsService';
import { USE_API } from '@/api/config';
import urunData from '@/data/üründat.json';

interface IlanItem {
  ilan_id?: number | string;
  baslik?: string;
  fiyat?: number;
  para_birimi?: string;
  category_id?: number | string;
  vitrin_durumu?: string | string[];
  konum?: {
    il?: string;
    ilce?: string;
    mahalle?: string;
    koordinatlar?: unknown;
  };
  resimler?: string[];
  [key: string]: unknown;
}

interface IlanData {
  ilanlari?: IlanItem[];
}

class VitrinListingsService extends BaseListingsService {

  // ============================================================
  // MOCK: JSON'dan vitrin ilanları
  // ============================================================

  _getMockVitrinListings(): IlanItem[] {
    const ilanlar = (urunData as IlanData)?.ilanlari || [];
    return ilanlar.filter((ilan) => {
      if (!ilan.vitrin_durumu) return false;
      if (typeof ilan.vitrin_durumu === 'string') return ilan.vitrin_durumu === 'vitrin';
      if (Array.isArray(ilan.vitrin_durumu)) return ilan.vitrin_durumu.includes('vitrin');
      return false;
    });
  }

  _getMockOneCikanListings(): IlanItem[] {
    const ilanlar = (urunData as IlanData)?.ilanlari || [];
    return ilanlar.filter((ilan) => {
      if (!ilan.vitrin_durumu || !Array.isArray(ilan.vitrin_durumu)) return false;
      return (
        ilan.vitrin_durumu.includes('vitrin') && ilan.vitrin_durumu.includes('one_cikan')
      );
    });
  }

  // ============================================================
  // İLAN ZENGİNLEŞTİRME
  // ============================================================

  _ilanZenginlestir(ilan: IlanItem): Record<string, unknown> | null {
    const temelIlan = this._ilanDuzenle(ilan) as Record<string, unknown> | null;
    if (!temelIlan) return null;

    if (ilan.category_id) {
      const kategoriMap = this._buildCategoryMap(this._getCategories());
      const kategoriId = ilan.category_id;

      if (kategoriMap[kategoriId as string | number]) {
        const anaKategori = kategoriMap[kategoriId as string | number].anaKategori || 'Diğer';
        temelIlan.kategori = anaKategori;
        temelIlan.categories = anaKategori;

        const kategoriYolu = kategoriMap[kategoriId as string | number].path || [];
        temelIlan.kategoriYolu = kategoriYolu;

        if (kategoriYolu.length > 1) {
          temelIlan.alt_kategori = kategoriYolu[1];
          temelIlan.subcategory = kategoriYolu[1];
        }
        if (kategoriYolu.length > 2) {
          temelIlan.alt_alt_kategori = kategoriYolu[2];
          temelIlan.sub_subcategory = kategoriYolu[2];
        }
      }
    }

    if (ilan.konum) {
      temelIlan.il = ilan.konum.il;
      temelIlan.ilce = ilan.konum.ilce;
      temelIlan.mahalle = ilan.konum.mahalle;
      temelIlan.sehir = ilan.konum.il;
      temelIlan.city = ilan.konum.il;
      temelIlan.location = `${ilan.konum.il}, ${ilan.konum.ilce}`;
      if (ilan.konum.koordinatlar) {
        temelIlan.koordinatlar = ilan.konum.koordinatlar;
        temelIlan.coordinates = ilan.konum.koordinatlar;
      }
    }

    if (ilan.vitrin_durumu) {
      if (typeof ilan.vitrin_durumu === 'string') {
        temelIlan.ilanTipi = ilan.vitrin_durumu;
      } else if (Array.isArray(ilan.vitrin_durumu)) {
        if (ilan.vitrin_durumu.includes('one_cikan')) temelIlan.ilanTipi = 'one_cikan';
        else if (ilan.vitrin_durumu.includes('vitrin')) temelIlan.ilanTipi = 'vitrin';
      }
    }

    if (ilan.fiyat !== undefined) {
      temelIlan.fiyat = ilan.fiyat;
      temelIlan.price = ilan.fiyat;
      temelIlan.para_birimi = ilan.para_birimi || 'TL';
      temelIlan.currency = ilan.para_birimi || 'TL';
    }

    if (ilan.resimler && Array.isArray(ilan.resimler)) {
      temelIlan.resimler = ilan.resimler;
      temelIlan.images = ilan.resimler;
      temelIlan.resim = ilan.resimler[0] || null;
      temelIlan.img = ilan.resimler[0] || null;
    }

    return temelIlan;
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  async getVitrinListings(limit = 55): Promise<Record<string, unknown>[]> {
    try {
      let ilanlar: IlanItem[] = [];

      if (!USE_API) {
        // Mock mod
        ilanlar = this._getMockVitrinListings();
      } else {
        // Gerçek API — filtre BE'de
        const result = await this.getListings({
          page: 1,
          pageSize: 100,
          vitrin_durumu: 'vitrin',
        });
        ilanlar = (result?.listings || []) as unknown as IlanItem[];
      }

      const zenginlestirilmis = ilanlar
        .map((ilan) => this._ilanZenginlestir(ilan))
        .filter((ilan): ilan is Record<string, unknown> => ilan !== null);

      const karisik = this._shuffleArray(zenginlestirilmis) as Record<string, unknown>[];
      return karisik.slice(0, limit);
    } catch (error) {
      console.error('❌ getVitrinListings işleminde hata:', error);
      return [];
    }
  }

  async getOneCikanVitrinListings(limit = 10): Promise<Record<string, unknown>[]> {
    try {
      let ilanlar: IlanItem[] = [];

      if (!USE_API) {
        // Mock mod
        ilanlar = this._getMockOneCikanListings();
      } else {
        // BE tek değerde "vitrin"+"one_cikan" birleşimini desteklemiyorsa one_cikan ile çekip client kontrol kalır
        const result = await this.getListings({
          page: 1,
          pageSize: 100,
          vitrin_durumu: 'one_cikan',
        });
        const raw = result?.listings || [];
        ilanlar = raw.filter((ilan) => {
          const vd = ilan.vitrin_durumu;
          if (Array.isArray(vd)) return vd.includes('vitrin') && vd.includes('one_cikan');
          return vd === 'one_cikan';
        }) as unknown as IlanItem[];
      }

      const zenginlestirilmis = ilanlar
        .map((ilan) => this._ilanZenginlestir(ilan))
        .filter((ilan): ilan is Record<string, unknown> => ilan !== null);

      const karisik = this._shuffleArray(zenginlestirilmis) as Record<string, unknown>[];
      return karisik.slice(0, limit);
    } catch (error) {
      console.error('❌ getOneCikanVitrinListings işleminde hata:', error);
      return [];
    }
  }

  async getVitrinListingsByCategory(
    kategoriId: number | string,
    limit = 15
  ): Promise<Record<string, unknown>[]> {
    if (!kategoriId) return [];

    try {
      const vitrinIlanlar = await this.getVitrinListings(100);
      const filtered = vitrinIlanlar.filter((ilan) => ilan.category_id === kategoriId);
      const karisik = this._shuffleArray(filtered) as Record<string, unknown>[];
      return karisik.slice(0, limit);
    } catch (error) {
      console.error('❌ getVitrinListingsByCategory işleminde hata:', error);
      return [];
    }
  }
}

const vitrinListingsService = new VitrinListingsService();
export default vitrinListingsService;
