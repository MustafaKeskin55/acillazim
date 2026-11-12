// Favori servisi - API simülasyonu ile çalışan tam özellikli favori yönetimi
// Gerçek API'ye geçildiğinde simulateApiRequest + localStorage kalıcı depo kaldırılacak
// Path alias yok: /v1/favorites veya /api/favorites kullanılmaz → /api/v1/favorites/...

/** Host normalize → {host}/api/v1 */
function resolveFavoritesApiBase(): string {
  const raw = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ''
  ).replace(/\/$/, '');
  if (!raw) return '/api/v1';
  if (/\/api\/v1$/i.test(raw)) return raw;
  const host = raw
    .replace(/\/api\/v1\/?$/i, '')
    .replace(/\/api\/?$/i, '')
    .replace(/\/v1\/?$/i, '');
  return `${host}/api/v1`;
}

const API_BASE_URL = resolveFavoritesApiBase();
const USE_MOCK = false; // Canlı BE — localStorage simülasyonu kapalı
const API_TOKEN = 'sim-favorites-xxxxx-token-12345'; // Yalnızca USE_MOCK=true

// LocalStorage key'leri
const STORAGE_KEYS = {
  LISTS: 'acillazim_favorite_lists',
  ITEMS: 'acillazim_favorite_items',
  USER_ID: 'acillazim_user_id',
};

interface SimulateApiOptions {
  method?: string;
  body?: string;
  delay?: number;
}

interface FavoriteList {
  id: string;
  name: string;
  itemCount: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt?: string;
  userId: string;
}

export interface PublicSharedListing {
  id: number | string;
  title: string;
  price?: number;
  currency?: string;
  images?: Array<{ url: string; thumbnail?: string }>;
  location?: {
    province?: string;
    district?: string;
    neighborhood?: string;
  };
  category?: {
    id?: number;
    name?: string;
  };
  isActive?: boolean;
}

export interface PublicSharedListResponse {
  listName: string;
  itemCount: number;
  sharedBy: string;
  sharedAt: string;
  expiresAt: string;
  items: Array<{
    listing: PublicSharedListing;
  }>;
}

interface FavoriteItem {
  id: string;
  listingId: string | number;
  listId: string;
  addedAt: string;
  userId: string;
  listingData: Record<string, unknown>;
}

interface ApiResult<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('auth_token') ||
    localStorage.getItem('AUTH_TOKEN') ||
    sessionStorage.getItem('auth_token') ||
    sessionStorage.getItem('AUTH_TOKEN') ||
    (typeof document !== 'undefined'
      ? document.cookie
          .split('; ')
          .find((row) => row.startsWith('auth_token='))
          ?.split('=')[1]
      : null) ||
    null
  );
}

/**
 * API isteği — USE_MOCK=false iken gerçek fetch
 */
const simulateApiRequest = async (
  endpoint: string,
  options: SimulateApiOptions = {}
): Promise<{ url: string; options: SimulateApiOptions; data?: unknown; raw?: unknown }> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const method = options.method || 'GET';
  console.log(`[Favorites API] ${method} ${url}`);

  if (!USE_MOCK) {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const response = await fetch(url, {
      method,
      headers,
      body: options.body,
    });
    if (!response.ok) {
      const errJson = await response.json().catch(() => null);
      const serverMsg =
        errJson?.message ||
        errJson?.error ||
        (errJson?.errors && typeof errJson.errors === 'object'
          ? Object.values(errJson.errors).join(', ')
          : null);
      throw new Error(serverMsg || `Favorites API ${response.status}: ${method} ${endpoint}`);
    }
    const raw = response.status === 204 ? null : await response.json().catch(() => null);
    const data =
      raw && typeof raw === 'object' && 'data' in (raw as object)
        ? (raw as { data: unknown }).data
        : raw;
    return { url, options, data, raw };
  }

  console.log(`[Favorites API] Token: ${API_TOKEN} (mock)`);
  const delay = options.delay || Math.floor(200 + Math.random() * 300);
  await new Promise((resolve) => setTimeout(resolve, delay));
  return { url, options };
};

function fromApiResult<T>(sim: { data?: unknown; raw?: unknown }, fallbackMessage: string): ApiResult<T> {
  const raw = sim.raw as Record<string, unknown> | null | undefined;
  return {
    success: raw?.success !== false,
    message: String(raw?.message ?? fallbackMessage),
    data: (sim.data as T) ?? null,
  };
}

/**
 * LocalStorage'dan favori listelerini getir
 */
const getFavoriteLists = (): FavoriteList[] => {
  if (typeof window === 'undefined') return [];
  try {
    const lists = localStorage.getItem(STORAGE_KEYS.LISTS);
    return lists ? JSON.parse(lists) : [];
  } catch (error) {
    console.error('[Favorites] Liste okuma hatası:', error);
    return [];
  }
};

/**
 * LocalStorage'a favori listelerini kaydet
 */
const saveFavoriteLists = (lists: FavoriteList[]): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(STORAGE_KEYS.LISTS, JSON.stringify(lists));
    return true;
  } catch (error) {
    console.error('[Favorites] Liste kaydetme hatası:', error);
    return false;
  }
};

/**
 * LocalStorage'dan favori itemları getir
 */
const getFavoriteItems = (): FavoriteItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const items = localStorage.getItem(STORAGE_KEYS.ITEMS);
    return items ? JSON.parse(items) : [];
  } catch (error) {
    console.error('[Favorites] Item okuma hatası:', error);
    return [];
  }
};

/**
 * LocalStorage'a favori itemları kaydet
 * NOT: Event gönderme ProductCard ve useProductDetailController'da yapılıyor
 */
const saveFavoriteItems = (items: FavoriteItem[]): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
    return true;
  } catch (error) {
    console.error('[Favorites] Item kaydetme hatası:', error);
    return false;
  }
};

/**
 * Kullanıcı ID'sini al (şimdilik simüle edilmiş)
 */
const getUserId = (): string => {
  if (typeof window === 'undefined') return 'user_ssr';
  let userId = localStorage.getItem(STORAGE_KEYS.USER_ID);
  if (!userId) {
    userId = 'user_' + Date.now();
    localStorage.setItem(STORAGE_KEYS.USER_ID, userId);
  }
  return userId;
};

/**
 * Default favori listesi oluştur (eğer yoksa)
 */
const ensureDefaultList = (): FavoriteList => {
  const lists = getFavoriteLists();
  if (lists.length === 0) {
    const defaultList: FavoriteList = {
      id: 'default_' + Date.now(),
      name: 'Favori İlanlarım',
      itemCount: 0,
      isDefault: true,
      createdAt: new Date().toISOString(),
      userId: getUserId()
    };
    saveFavoriteLists([defaultList]);
    return defaultList;
  }
  return lists.find((list) => list.isDefault) || lists[0];
};

export const favoriteService = {
  // ========== FAVORİ LİSTE YÖNETİMİ ==========

  // Favori listesi oluşturma
  createList: async (listName: string): Promise<ApiResult<FavoriteList>> => {
    try {
      console.log(`[Favorites API] Yeni liste oluşturuluyor: ${listName}`);

      const sim = await simulateApiRequest('/favorites', {
        method: 'POST',
        body: JSON.stringify({ name: listName }),
        delay: 300
      });
      if (!USE_MOCK) return fromApiResult<FavoriteList>(sim, 'Liste başarıyla oluşturuldu');

      const lists = getFavoriteLists();
      const newList: FavoriteList = {
        id: 'list_' + Date.now(),
        name: listName,
        itemCount: 0,
        isDefault: false,
        createdAt: new Date().toISOString(),
        userId: getUserId()
      };

      lists.push(newList);
      saveFavoriteLists(lists);

      console.log(`[Favorites API] Liste oluşturuldu:`, newList);
      return {
        success: true,
        message: 'Liste başarıyla oluşturuldu',
        data: newList
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Liste oluşturulurken hata oluştu';
      console.error('[Favorites API] Liste oluşturma hatası:', error);
      return {
        success: false,
        message: msg,
        data: null
      };
    }
  },

  // Favori listesini güncelleme
  updateList: async (listId: string, listName: string): Promise<ApiResult<FavoriteList>> => {
    try {
      console.log(`[Favorites API] Liste güncelleniyor: ${listId}`);

      const sim = await simulateApiRequest(`/favorites/${listId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: listName }),
        delay: 250
      });
      if (!USE_MOCK) return fromApiResult<FavoriteList>(sim, 'Liste başarıyla güncellendi');

      const lists = getFavoriteLists();
      const listIndex = lists.findIndex((list) => list.id === listId);

      if (listIndex === -1) {
        return {
          success: false,
          message: 'Liste bulunamadı',
          data: null
        };
      }

      lists[listIndex].name = listName;
      lists[listIndex].updatedAt = new Date().toISOString();
      saveFavoriteLists(lists);

      console.log(`[Favorites API] Liste güncellendi:`, lists[listIndex]);
      return {
        success: true,
        message: 'Liste başarıyla güncellendi',
        data: lists[listIndex]
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Liste güncellenirken hata oluştu';
      console.error('[Favorites API] Liste güncelleme hatası:', error);
      return {
        success: false,
        message: msg,
        data: null
      };
    }
  },

  // Favori listesini silme
  deleteList: async (listId: string): Promise<ApiResult<{ deletedListId: string }>> => {
    try {
      console.log(`[Favorites API] Liste siliniyor: ${listId}`);

      const sim = await simulateApiRequest(`/favorites/${listId}`, {
        method: 'DELETE',
        delay: 200
      });
      if (!USE_MOCK) return fromApiResult<{ deletedListId: string }>(sim, 'Liste başarıyla silindi');

      const lists = getFavoriteLists();
      const listToDelete = lists.find((list) => list.id === listId);

      // Default liste silinemez
      if (listToDelete && listToDelete.isDefault) {
        return {
          success: false,
          message: 'Varsayılan liste silinemez',
          data: null
        };
      }

      const updatedLists = lists.filter((list) => list.id !== listId);
      saveFavoriteLists(updatedLists);

      // Bu listedeki itemları da sil
      const items = getFavoriteItems();
      const updatedItems = items.filter((item) => item.listId !== listId);
      saveFavoriteItems(updatedItems);

      console.log(`[Favorites API] Liste silindi: ${listId}`);
      return {
        success: true,
        message: 'Liste başarıyla silindi',
        data: { deletedListId: listId }
      };
    } catch (error) {
      console.error('[Favorites API] Liste silme hatası:', error);
      return {
        success: false,
        message: 'Liste silinirken hata oluştu',
        data: null
      };
    }
  },

  // Favori listesini paylaşma
  shareList: async (listId: string): Promise<ApiResult<{ shareUrl: string }>> => {
    try {
      console.log(`[Favorites API] Liste paylaşılıyor: ${listId}`);

      const sim = await simulateApiRequest(`/favorites/${listId}/share`, {
        method: 'POST',
        delay: 200
      });
      if (!USE_MOCK) return fromApiResult<{ shareUrl: string }>(sim, 'Paylaşım linki oluşturuldu');

      const shareUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/favorites/shared/${listId}`
          : `/favorites/shared/${listId}`;

      console.log(`[Favorites API] Paylaşım URL'si oluşturuldu:`, shareUrl);
      return {
        success: true,
        message: 'Paylaşım linki oluşturuldu',
        data: { shareUrl }
      };
    } catch (error) {
      console.error('[Favorites API] Liste paylaşma hatası:', error);
      return {
        success: false,
        message: 'Paylaşım linki oluşturulurken hata oluştu',
        data: null
      };
    }
  },

  // Paylaşılan favori listesini görüntüleme (Public)
  getSharedList: async (token: string): Promise<ApiResult<PublicSharedListResponse>> => {
    try {
      console.log(`[Favorites API] Paylaşılan liste getiriliyor: ${token}`);

      const sim = await simulateApiRequest(`/favorites/shared/${token}`, {
        method: 'GET',
        delay: 150
      });
      if (!USE_MOCK) return fromApiResult<PublicSharedListResponse>(sim, 'Paylaşılan liste getirildi');

      const lists = getFavoriteLists();
      const list = lists.find((item) => item.id === token) || lists[0];
      if (!list) {
        return {
          success: false,
          message: 'Paylaşılan liste bulunamadı',
          data: null
        };
      }
      const items = getFavoriteItems().filter((item) => item.listId === list.id);
      return {
        success: true,
        message: 'Paylaşılan liste getirildi',
        data: {
          listName: list.name,
          itemCount: items.length,
          sharedBy: 'Acil Lazım Kullanıcısı',
          sharedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          items: items.map((it) => {
            const ld = (it.listingData || {}) as Record<string, unknown>;
            return {
              listing: {
                id: it.listingId,
                title: (ld.title as string) || (ld.baslik as string) || 'İlan',
                price: (ld.price as number) || (ld.fiyat as number) || 0,
                currency: (ld.currency as string) || 'TRY',
                images: ld.image ? [{ url: ld.image as string }] : (Array.isArray(ld.images) ? ld.images : []),
                location: {
                  province: (ld.province as string) || (ld.il as string) || (ld.sehir as string) || '',
                  district: (ld.district as string) || (ld.ilce as string) || ''
                },
                category: {
                  name: (ld.categoryName as string) || (ld.category as string) || (ld.kategori as string) || ''
                },
                isActive: true
              }
            };
          })
        }
      };
    } catch (error) {
      console.error('[Favorites API] Paylaşılan liste getirme hatası:', error);
      return {
        success: false,
        message: 'Paylaşılan liste getirilirken hata oluştu',
        data: null
      };
    }
  },

  // ========== İLAN FAVORİ İŞLEMLERİ ==========

  // İlanı favorilere ekleme (default listeye veya belirtilen listeye)
  addToFavorites: async (
    listingId: string | number,
    listingData: Record<string, unknown> | null = null,
    listId: string | null = null
  ): Promise<ApiResult<FavoriteItem>> => {
    try {
      console.log(`[Favorites API] İlan favorilere ekleniyor: ${listingId}`);

      // 1. Önce her zaman yerel depoya kaydet (ağ/token sorunu olsa bile kullanıcı favorisi asla kaybolmaz)
      const defaultList = ensureDefaultList();
      const targetListId = listId || defaultList.id;
      const userId = getUserId();
      const items = getFavoriteItems();

      const existingItem = items.find(
        (item) => String(item.listingId) === String(listingId) && item.listId === targetListId
      );

      let newItem: FavoriteItem;
      if (!existingItem) {
        newItem = {
          id: 'item_' + Date.now(),
          listingId,
          listId: targetListId,
          addedAt: new Date().toISOString(),
          userId,
          listingData: listingData || { id: listingId }
        };
        items.push(newItem);
        saveFavoriteItems(items);

        // Liste sayısını güncelle
        const lists = getFavoriteLists();
        const listIndex = lists.findIndex((list) => list.id === targetListId);
        if (listIndex !== -1) {
          lists[listIndex].itemCount = items.filter((item) => item.listId === targetListId).length;
          saveFavoriteLists(lists);
        }
      } else {
        newItem = existingItem;
      }

      // 2. Canlı API varsa backend senkronizasyonu dene
      if (!USE_MOCK) {
        try {
          const numericId = Number(listingId);
          const validId = Number.isFinite(numericId) ? numericId : listingId;
          const apiPayload: { listing_id: string | number; list_id?: string } = {
            listing_id: validId,
            ...(listId && !String(listId).startsWith('default_')
              ? { list_id: String(listId) }
              : {})
          };
          const sim = await simulateApiRequest('/favorites/add', {
            method: 'POST',
            body: JSON.stringify(apiPayload),
            delay: 150
          });
          return fromApiResult<FavoriteItem>(sim, 'İlan favorilere eklendi');
        } catch (apiErr) {
          console.warn('[Favorites API] Backend senkronizasyon uyarısı, yerel kayıt korundu:', apiErr);
          return {
            success: true,
            message: 'İlan favorilere eklendi',
            data: newItem
          };
        }
      }

      console.log(`[Favorites API] ✅ İlan favorilere eklendi: ${listingId}`);
      return {
        success: true,
        message: 'İlan favorilere eklendi',
        data: newItem
      };
    } catch (error) {
      console.error('[Favorites API] Favori ekleme hatası:', error);
      return {
        success: false,
        message: 'İlan favorilere eklenirken hata oluştu',
        data: null
      };
    }
  },

  // İlandan favorilerden çıkarma (tüm listelerden)
  removeFromFavorites: async (
    listingId: string | number
  ): Promise<ApiResult<{ removedCount: number }>> => {
    try {
      console.log(`[Favorites API] İlan favorilerden çıkarılıyor: ${listingId}`);

      // 1. Önce yerel depodan temizle
      const items = getFavoriteItems();
      const removedItems = items.filter((item) => String(item.listingId) === String(listingId));
      const updatedItems = items.filter((item) => String(item.listingId) !== String(listingId));
      saveFavoriteItems(updatedItems);

      // Etkilenen listelerin sayısını güncelle
      const lists = getFavoriteLists();
      const affectedListIds = [...new Set(removedItems.map((item) => item.listId))];
      affectedListIds.forEach((lId) => {
        const listIndex = lists.findIndex((list) => list.id === lId);
        if (listIndex !== -1) {
          lists[listIndex].itemCount = updatedItems.filter((item) => item.listId === lId).length;
        }
      });
      saveFavoriteLists(lists);

      // 2. Canlı API varsa backend'e silme isteği ilet
      if (!USE_MOCK) {
        try {
          const numericId = Number(listingId);
          const validId = Number.isFinite(numericId) ? numericId : listingId;
          const apiPayload = {
            listing_id: validId
          };
          const sim = await simulateApiRequest(`/favorites/remove/${validId}`, {
            method: 'DELETE',
            body: JSON.stringify(apiPayload),
            delay: 150
          });
          return fromApiResult<{ removedCount: number }>(sim, 'İlan favorilerden çıkarıldı');
        } catch (apiErr) {
          console.warn('[Favorites API] Backend silme uyarısı, yerel kayıt güncellendi:', apiErr);
          return {
            success: true,
            message: 'İlan favorilerden çıkarıldı',
            data: { removedCount: removedItems.length || 1 }
          };
        }
      }

      console.log(`[Favorites API] İlan favorilerden çıkarıldı: ${listingId}`);
      return {
        success: true,
        message: 'İlan favorilerden çıkarıldı',
        data: { removedCount: removedItems.length }
      };
    } catch (error) {
      console.error('[Favorites API] Favori çıkarma hatası:', error);
      return {
        success: false,
        message: 'İlan favorilerden çıkarılırken hata oluştu',
        data: null
      };
    }
  },

  // İlanın favori durumunu kontrol etme
  checkFavoriteStatus: async (
    listingId: string | number
  ): Promise<ApiResult<{ isFavorite: boolean; listingId: string | number }>> => {
    try {
      console.log(`[Favorites API] İlan favori durumu kontrol ediliyor: ${listingId}`);

      const sim = await simulateApiRequest(`/favorites/status/${listingId}`, {
        method: 'GET',
        delay: 100
      });
      if (!USE_MOCK) {
        return fromApiResult<{ isFavorite: boolean; listingId: string | number }>(
          sim,
          'Favori durumu kontrol edildi'
        );
      }

      const items = getFavoriteItems();
      const isFavorite = items.some((item) => item.listingId === listingId);

      return {
        success: true,
        message: 'Favori durumu kontrol edildi',
        data: { isFavorite, listingId }
      };
    } catch (error) {
      console.error('[Favorites API] Favori durum kontrolü hatası:', error);
      return {
        success: false,
        message: 'Favori durumu kontrol edilirken hata oluştu',
        data: { isFavorite: false, listingId }
      };
    }
  },

  // ========== FAVORİ LİSTE İÇERİK YÖNETİMİ ==========

  // Listeye ilan ekleme (belirli bir listeye)
  addToList: async (
    listId: string,
    listingId: string | number,
    listingData: Record<string, unknown> | null = null
  ): Promise<ApiResult<FavoriteItem>> => {
    try {
      console.log(
        `[Favorites API] İlan listeye ekleniyor: Liste=${listId}, İlan=${listingId}`
      );

      const userId = getUserId();

      // *** GERÇEK API'YE GİDECEK VERİLER ***
      const apiPayload = {
        listing_id: listingId,
        list_id: listId,
        user_id: userId // Gerçekte token'dan gelecek
      };

      console.log(`[Favorites API] Backend'e gönderilecek veri:`, apiPayload);

      const sim = await simulateApiRequest(`/favorites/${listId}/items`, {
        method: 'POST',
        body: JSON.stringify(apiPayload),
        delay: 250
      });
      if (!USE_MOCK) return fromApiResult<FavoriteItem>(sim, 'İlan listeye eklendi');

      const items = getFavoriteItems();

      // Zaten bu listede mi kontrol et
      const existingItem = items.find(
        (item) => item.listingId === listingId && item.listId === listId
      );

      if (existingItem) {
        return {
          success: false,
          message: 'İlan zaten bu listede',
          data: null
        };
      }

      const newItem: FavoriteItem = {
        id: 'item_' + Date.now(),
        listingId,
        listId,
        addedAt: new Date().toISOString(),
        userId: getUserId(),
        listingData: listingData || { id: listingId }
      };

      items.push(newItem);
      saveFavoriteItems(items);

      // Liste item sayısını güncelle
      const lists = getFavoriteLists();
      const listIndex = lists.findIndex((list) => list.id === listId);
      if (listIndex !== -1) {
        lists[listIndex].itemCount = items.filter((item) => item.listId === listId).length;
        saveFavoriteLists(lists);
      }

      console.log(`[Favorites API] İlan listeye eklendi:`, newItem);
      return {
        success: true,
        message: 'İlan listeye eklendi',
        data: newItem
      };
    } catch (error) {
      console.error('[Favorites API] Listeye ekleme hatası:', error);
      return {
        success: false,
        message: 'İlan listeye eklenirken hata oluştu',
        data: null
      };
    }
  },

  // Listeden ilan çıkarma
  removeFromList: async (
    listId: string,
    listingId: string | number
  ): Promise<ApiResult<{ listId: string; listingId: string | number }>> => {
    try {
      console.log(
        `[Favorites API] İlan listeden çıkarılıyor: Liste=${listId}, İlan=${listingId}`
      );

      const sim = await simulateApiRequest(`/favorites/${listId}/items/${listingId}`, {
        method: 'DELETE',
        delay: 200
      });
      if (!USE_MOCK) {
        return fromApiResult<{ listId: string; listingId: string | number }>(
          sim,
          'İlan listeden çıkarıldı'
        );
      }

      const items = getFavoriteItems();
      const updatedItems = items.filter(
        (item) => !(item.listingId === listingId && item.listId === listId)
      );
      saveFavoriteItems(updatedItems);

      // Liste item sayısını güncelle
      const lists = getFavoriteLists();
      const listIndex = lists.findIndex((list) => list.id === listId);
      if (listIndex !== -1) {
        lists[listIndex].itemCount = updatedItems.filter((item) => item.listId === listId).length;
        saveFavoriteLists(lists);
      }

      console.log(`[Favorites API] İlan listeden çıkarıldı`);
      return {
        success: true,
        message: 'İlan listeden çıkarıldı',
        data: { listId, listingId }
      };
    } catch (error) {
      console.error('[Favorites API] Listeden çıkarma hatası:', error);
      return {
        success: false,
        message: 'İlan listeden çıkarılırken hata oluştu',
        data: null
      };
    }
  },

  // Liste içeriğini görüntüleme
  getListItems: async (listId: string): Promise<ApiResult<FavoriteItem[]>> => {
    try {
      console.log(`[Favorites API] Liste içeriği getiriliyor: ${listId}`);

      const sim = await simulateApiRequest(`/favorites/${listId}/items`, {
        method: 'GET',
        delay: 200
      });
      if (!USE_MOCK) return fromApiResult<FavoriteItem[]>(sim, 'Liste içeriği getirildi');

      const items = getFavoriteItems();
      const listItems = items.filter((item) => item.listId === listId);

      console.log(`[Favorites API] ${listItems.length} adet item bulundu`);
      return {
        success: true,
        message: 'Liste içeriği getirildi',
        data: listItems
      };
    } catch (error) {
      console.error('[Favorites API] Liste içeriği getirme hatası:', error);
      return {
        success: false,
        message: 'Liste içeriği getirilirken hata oluştu',
        data: []
      };
    }
  },

  // ========== KULLANICI FAVORİ İŞLEMLERİ ==========

  // Kullanıcının tüm favori listelerini getirme
  getUserLists: async (): Promise<ApiResult<FavoriteList[]>> => {
    try {
      console.log(`[Favorites API] Kullanıcı favori listeleri getiriliyor`);

      const sim = await simulateApiRequest('/favorites/user', {
        method: 'GET',
        delay: 200
      });
      if (!USE_MOCK) return fromApiResult<FavoriteList[]>(sim, 'Favori listeleri getirildi');

      // Default liste yoksa oluştur
      ensureDefaultList();

      const lists = getFavoriteLists();
      const items = getFavoriteItems();

      // Her liste için item sayısını güncelle
      const updatedLists = lists.map((list) => ({
        ...list,
        itemCount: items.filter((item) => item.listId === list.id).length
      }));

      console.log(`[Favorites API] ${updatedLists.length} adet liste bulundu`);
      return {
        success: true,
        message: 'Favori listeleri getirildi',
        data: updatedLists
      };
    } catch (error) {
      console.error('[Favorites API] Liste getirme hatası:', error);
      return {
        success: false,
        message: 'Favori listeleri getirilirken hata oluştu',
        data: []
      };
    }
  },

  // Belirli bir favori listesinin detaylarını getirme
  getListDetails: async (
    listId: string
  ): Promise<ApiResult<FavoriteList & { items: FavoriteItem[] }>> => {
    try {
      console.log(`[Favorites API] Liste detayları getiriliyor: ${listId}`);

      const sim = await simulateApiRequest(`/favorites/${listId}`, {
        method: 'GET',
        delay: 150
      });
      if (!USE_MOCK) {
        return fromApiResult<FavoriteList & { items: FavoriteItem[] }>(
          sim,
          'Liste detayları getirildi'
        );
      }

      const lists = getFavoriteLists();
      const list = lists.find((l) => l.id === listId);

      if (!list) {
        return {
          success: false,
          message: 'Liste bulunamadı',
          data: null
        };
      }

      const items = getFavoriteItems();
      const listItems = items.filter((item) => item.listId === listId);

      const listDetails = {
        ...list,
        itemCount: listItems.length,
        items: listItems
      };

      console.log(`[Favorites API] Liste detayları getirildi:`, listDetails.name);
      return {
        success: true,
        message: 'Liste detayları getirildi',
        data: listDetails
      };
    } catch (error) {
      console.error('[Favorites API] Liste detayı getirme hatası:', error);
      return {
        success: false,
        message: 'Liste detayları getirilirken hata oluştu',
        data: null
      };
    }
  },

  // Kullanıcının favori ilanlarını getirme (tüm listelerden)
  getUserFavoriteListings: async (): Promise<ApiResult<FavoriteItem[]>> => {
    try {
      console.log(`[Favorites API] Kullanıcı favori ilanları getiriliyor`);

      if (!USE_MOCK) {
        try {
          const sim = await simulateApiRequest('/favorites/user/listings', {
            method: 'GET',
            delay: 150
          });
          return fromApiResult<FavoriteItem[]>(sim, 'Favori ilanlar getirildi');
        } catch (beErr) {
          console.warn('[Favorites API] Canlı API favorileri getiremedi, yerel kayıtlar okunuyor:', beErr);
        }
      }

      const items = getFavoriteItems();

      // Benzersiz ilanları getir
      const uniqueListings: FavoriteItem[] = [];
      const seenIds = new Set<string | number>();

      items.forEach((item) => {
        if (!seenIds.has(item.listingId)) {
          seenIds.add(item.listingId);
          uniqueListings.push(item);
        }
      });

      console.log(`[Favorites API] ${uniqueListings.length} adet favori ilan bulundu`);
      return {
        success: true,
        message: 'Favori ilanlar getirildi',
        data: uniqueListings
      };
    } catch (error) {
      console.error('[Favorites API] Favori ilanlar getirme hatası:', error);
      return {
        success: true,
        message: 'Favori ilanlar yerel depodan getirildi',
        data: getFavoriteItems()
      };
    }
  }
};

export default favoriteService;
