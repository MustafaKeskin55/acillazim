/**
 * Bildirim Servisi - Modernize Edilmiş Versiyon
 *
 * USE_MOCK_API = true  → data/notifications.json + localStorage (mockNotifications)
 * USE_MOCK_API = false → GET/PUT/DELETE /api/v1/notifications/...
 *
 * Path alias yok: /api/notifications (v1’siz) kullanılmaz.
 * BE routing: /unread-count, /mark-all-read, /bulk-delete, /preferences → {id} öncesi.
 *
 * Kullanım:
 *   import notificationService from './services/notification/notificationService';
 *
 *   const notifications = await notificationService.getNotifications({
 *     userId: 123,
 *     page: 1,
 *     limit: 20
 *   });
 */

import notificationsData from '@/data/notifications.json';

/** Host normalize → {host}/api/v1 */
function resolveNotificationsApiBase(): string {
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

const API_BASE_URL = resolveNotificationsApiBase();

// Mock API kullanımı - Backend hazır olunca false
const USE_MOCK_API = false; // Canlı BE

interface NotificationItem {
  id: number;
  userId: number;
  type: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
  link?: string;
  details?: {
    listing?: { id?: number | string };
    conversation?: { id?: number | string };
    appointment?: { id?: number | string };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface NotificationsJson {
  notifications: NotificationItem[];
  preferences: Record<string, unknown>;
}

interface GetNotificationsParams {
  userId: number;
  page?: number;
  limit?: number;
  type?: string;
  unreadOnly?: boolean;
}

interface BulkDeleteParams {
  userId: number;
  notificationIds: number[];
}

interface UpdatePreferencesParams {
  userId: number;
  preferences: Record<string, unknown>;
}

interface PaginatedResult {
  notifications: NotificationItem[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    unreadCount: number;
  };
}

// Mock data referansı (gerçek API'ye geçişte kaldırılacak)
// localStorage'dan yükle, yoksa JSON'dan yükle
const getMockNotifications = (): NotificationItem[] => {
  if (typeof window === 'undefined') {
    return [...(notificationsData as NotificationsJson).notifications];
  }
  try {
    const saved = localStorage.getItem('mockNotifications');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.error('[NotificationService] localStorage okuma hatası:', err);
  }
  return [...(notificationsData as NotificationsJson).notifications];
};

const saveMockNotifications = (notifications: NotificationItem[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('mockNotifications', JSON.stringify(notifications));
  } catch (err) {
    console.error('[NotificationService] localStorage yazma hatası:', err);
  }
};

let mockNotifications: NotificationItem[] = getMockNotifications();
let mockPreferences: Record<string, unknown> = {
  ...(notificationsData as NotificationsJson).preferences
};

/**
 * API istekleri için base fetch fonksiyonu
 * Gerçek API'ye geçişte kullanılacak — path: {API_BASE_URL}/notifications/...
 */
const apiFetch = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<unknown> => {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('auth_token') || localStorage.getItem('token')
      : null;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json'
  };

  if (token) {
    (defaultHeaders as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  };

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  console.log(`[Notifications API] ${options.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        (errorData as { message?: string }).message || `HTTP error! status: ${response.status}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('[NotificationService] Fetch error:', error);
    throw error;
  }
};

/**
 * Yardımcı fonksiyonlar
 */
const filterNotificationsByUser = (
  notifications: NotificationItem[],
  userId: number
): NotificationItem[] => {
  return notifications.filter((notification) => notification.userId === userId);
};

const filterNotificationsByType = (
  notifications: NotificationItem[],
  type: string
): NotificationItem[] => {
  if (!type) return notifications;
  return notifications.filter((notification) => notification.type === type);
};

const filterUnreadNotifications = (notifications: NotificationItem[]): NotificationItem[] => {
  return notifications.filter((notification) => !notification.read);
};

const paginateNotifications = (
  notifications: NotificationItem[],
  page = 1,
  limit = 20
): PaginatedResult => {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedNotifications = notifications.slice(startIndex, endIndex);

  return {
    notifications: paginatedNotifications,
    pagination: {
      total: notifications.length,
      page: page,
      pageSize: limit,
      totalPages: Math.ceil(notifications.length / limit),
      unreadCount: notifications.filter((n) => !n.read).length
    }
  };
};

/**
 * Bildirim Servisi Ana Sınıfı
 */
class NotificationService {
  /**
   * Bildirimleri getir
   *
   * @param params - Bildirim getirme parametreleri
   * @param params.userId - Kullanıcı ID (zorunlu)
   * @param params.page - Sayfa numarası (default: 1)
   * @param params.limit - Sayfa başı kayıt (default: 20, max: 50)
   * @param params.type - Bildirim tipi filtresi (opsiyonel)
   * @param params.unreadOnly - Sadece okunmamışlar (default: false)
   * @returns Bildirimler ve pagination bilgisi
   */
  async getNotifications(params: GetNotificationsParams): Promise<PaginatedResult> {
    try {
      // Parametre validasyonu
      if (!params.userId) {
        throw new Error('Kullanıcı ID gereklidir');
      }

      // Limit kontrolü (max 50)
      if (params.limit && params.limit > 50) {
        params.limit = 50;
      }

      if (USE_MOCK_API) {
        // Mock API - Gerçek API'ye geçişte kaldırılacak
        return new Promise((resolve) => {
          setTimeout(() => {
            try {
              // localStorage'dan güncel veriyi yükle (başka yerden değişmiş olabilir)
              mockNotifications = getMockNotifications();

              // Kullanıcıya göre filtrele
              let filtered = filterNotificationsByUser(mockNotifications, params.userId);

              // Tipe göre filtrele
              if (params.type) {
                filtered = filterNotificationsByType(filtered, params.type);
              }

              // Okunmamışları filtrele
              if (params.unreadOnly) {
                filtered = filterUnreadNotifications(filtered);
              }

              // Tarihe göre sırala (en yeni önce)
              filtered.sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );

              // Sayfalama
              const result = paginateNotifications(
                filtered,
                params.page || 1,
                params.limit || 20
              );

              resolve(result);
            } catch (error) {
              throw error;
            }
          }, 300); // API gecikmesi simülasyonu
        });
      }

      // Gerçek API — userId token'dan; query'de gönderilmez
      const queryParams = new URLSearchParams({
        page: (params.page || 1).toString(),
        limit: (params.limit || 20).toString(),
      });
      if (params.type) queryParams.set('type', params.type);
      if (params.unreadOnly) queryParams.set('unread_only', 'true');

      const response = (await apiFetch(`/notifications?${queryParams}`)) as {
        data: PaginatedResult;
      };
      return response.data;
    } catch (error) {
      console.error('[NotificationService] getNotifications error:', error);
      throw error;
    }
  }

  /**
   * Tekil bildirim getir
   *
   * @param notificationId - Bildirim ID
   * @returns Bildirim detayı
   */
  async getNotificationById(notificationId: number | string): Promise<NotificationItem> {
    try {
      if (!notificationId) {
        throw new Error('Bildirim ID gereklidir');
      }

      if (USE_MOCK_API) {
        return new Promise((resolve) => {
          setTimeout(() => {
            // localStorage'dan güncel veriyi yükle
            mockNotifications = getMockNotifications();
            const notification = mockNotifications.find(
              (n) => n.id === parseInt(String(notificationId))
            );

            if (notification) {
              resolve(notification);
            } else {
              throw new Error('Bildirim bulunamadı');
            }
          }, 200);
        });
      }

      // Gerçek API çağrısı
      const response = (await apiFetch(`/notifications/${notificationId}`)) as {
        data: { notification: NotificationItem };
      };
      return response.data.notification;
    } catch (error) {
      console.error('[NotificationService] getNotificationById error:', error);
      throw error;
    }
  }

  /**
   * Bildirimi okundu olarak işaretle
   *
   * @param notificationId - Bildirim ID
   * @returns İşlem sonucu
   */
  async markAsRead(
    notificationId: number | string
  ): Promise<{ notificationId: number; read: boolean; readAt: string }> {
    try {
      if (!notificationId) {
        throw new Error('Bildirim ID gereklidir');
      }

      if (USE_MOCK_API) {
        // Mock API modu - Gerçek API'ye geçişte bu kısım kaldırılacak
        console.log('[NotificationService] markAsRead (MOCK):', notificationId);
        return new Promise((resolve) => {
          setTimeout(() => {
            // localStorage'dan güncel veriyi yükle
            mockNotifications = getMockNotifications();
            const notification = mockNotifications.find(
              (n) => n.id === parseInt(String(notificationId))
            );

            if (notification) {
              notification.read = true;
              notification.readAt = new Date().toISOString();

              // localStorage'a kaydet
              saveMockNotifications(mockNotifications);

              console.log(
                "[NotificationService] Bildirim mock data'da okundu olarak işaretlendi:",
                notificationId
              );
              resolve({
                notificationId: notification.id,
                read: true,
                readAt: notification.readAt!
              });
            } else {
              throw new Error('Bildirim bulunamadı');
            }
          }, 200);
        });
      }

      // Gerçek API çağrısı - PUT /notifications/:id/read endpoint'ine istek gönderilir
      console.log(
        '[NotificationService] markAsRead (API):',
        notificationId,
        '→ PUT',
        `${API_BASE_URL}/notifications/${notificationId}/read`
      );
      const response = (await apiFetch(`/notifications/${notificationId}/read`, {
        method: 'PUT'
      })) as { data: { notificationId: number; read: boolean; readAt: string } };
      console.log('[NotificationService] API yanıtı alındı:', response.data);
      return response.data;
    } catch (error) {
      console.error('[NotificationService] markAsRead error:', error);
      throw error;
    }
  }

  /**
   * Tüm bildirimleri okundu olarak işaretle
   *
   * @param userId - Kullanıcı ID
   * @returns İşlem sonucu (markedCount dahil)
   */
  async markAllAsRead(userId: number): Promise<{ markedCount: number }> {
    try {
      if (!userId) {
        throw new Error('Kullanıcı ID gereklidir');
      }

      if (USE_MOCK_API) {
        return new Promise((resolve) => {
          setTimeout(() => {
            // localStorage'dan güncel veriyi yükle
            mockNotifications = getMockNotifications();
            const userNotifications = filterNotificationsByUser(mockNotifications, userId);
            const unreadNotifications = filterUnreadNotifications(userNotifications);

            unreadNotifications.forEach((notification) => {
              notification.read = true;
              notification.readAt = new Date().toISOString();
            });

            // localStorage'a kaydet
            saveMockNotifications(mockNotifications);

            resolve({
              markedCount: unreadNotifications.length
            });
          }, 300);
        });
      }

      // Gerçek API — userId token'dan
      const response = (await apiFetch('/notifications/mark-all-read', {
        method: 'PUT',
      })) as { data: { markedCount: number } };
      return response.data;
    } catch (error) {
      console.error('[NotificationService] markAllAsRead error:', error);
      throw error;
    }
  }

  /**
   * Okunmamış bildirim sayısını getir
   *
   * @param userId - Kullanıcı ID
   * @returns Okunmamış bildirim sayısı
   */
  async getUnreadCount(userId: number): Promise<number> {
    try {
      if (!userId) {
        throw new Error('Kullanıcı ID gereklidir');
      }

      if (USE_MOCK_API) {
        return new Promise((resolve) => {
          setTimeout(() => {
            const userNotifications = filterNotificationsByUser(mockNotifications, userId);
            const unreadCount = filterUnreadNotifications(userNotifications).length;
            resolve(unreadCount);
          }, 150);
        });
      }

      // Gerçek API — userId token'dan
      void userId;
      const response = (await apiFetch('/notifications/unread-count')) as {
        data: { count: number };
      };
      return response.data.count;
    } catch (error) {
      console.error('[NotificationService] getUnreadCount error:', error);
      throw error;
    }
  }

  /**
   * Bildirimi sil
   *
   * @param notificationId - Bildirim ID
   * @returns İşlem başarı durumu
   */
  async deleteNotification(notificationId: number | string): Promise<boolean> {
    try {
      if (!notificationId) {
        throw new Error('Bildirim ID gereklidir');
      }

      if (USE_MOCK_API) {
        return new Promise((resolve) => {
          setTimeout(() => {
            const index = mockNotifications.findIndex(
              (n) => n.id === parseInt(String(notificationId))
            );

            if (index !== -1) {
              mockNotifications.splice(index, 1);
              resolve(true);
            } else {
              throw new Error('Bildirim bulunamadı');
            }
          }, 200);
        });
      }

      // Gerçek API çağrısı
      await apiFetch(`/notifications/${notificationId}`, {
        method: 'DELETE'
      });
      return true;
    } catch (error) {
      console.error('[NotificationService] deleteNotification error:', error);
      throw error;
    }
  }

  /**
   * Toplu bildirim silme
   *
   * @param params - Silme parametreleri
   * @param params.userId - Kullanıcı ID
   * @param params.notificationIds - Silinecek bildirim ID'leri
   * @returns İşlem sonucu (deletedCount dahil)
   */
  async bulkDelete(params: BulkDeleteParams): Promise<{ deletedCount: number }> {
    try {
      if (!params.userId) {
        throw new Error('Kullanıcı ID gereklidir');
      }

      if (
        !params.notificationIds ||
        !Array.isArray(params.notificationIds) ||
        params.notificationIds.length === 0
      ) {
        throw new Error("Silinecek bildirim ID'leri gereklidir");
      }

      if (USE_MOCK_API) {
        return new Promise((resolve) => {
          setTimeout(() => {
            let deletedCount = 0;

            params.notificationIds.forEach((id) => {
              const index = mockNotifications.findIndex(
                (n) => n.id === parseInt(String(id)) && n.userId === params.userId
              );
              if (index !== -1) {
                mockNotifications.splice(index, 1);
                deletedCount++;
              }
            });

            resolve({
              deletedCount
            });
          }, 300);
        });
      }

      // Gerçek API — userId token'dan
      const response = (await apiFetch('/notifications/bulk-delete', {
        method: 'DELETE',
        body: JSON.stringify({
          notification_ids: params.notificationIds,
        }),
      })) as { data: { deletedCount: number } };
      return response.data;
    } catch (error) {
      console.error('[NotificationService] bulkDelete error:', error);
      throw error;
    }
  }

  /**
   * Bildirim tercihlerini getir
   *
   * @param userId - Kullanıcı ID
   * @returns Bildirim tercihleri
   */
  async getPreferences(userId: number): Promise<Record<string, unknown>> {
    try {
      if (!userId) {
        throw new Error('Kullanıcı ID gereklidir');
      }

      if (USE_MOCK_API) {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(mockPreferences);
          }, 200);
        });
      }

      // Gerçek API — userId token'dan
      void userId;
      const response = (await apiFetch('/notifications/preferences')) as {
        data: { preferences: Record<string, unknown> };
      };
      return response.data.preferences;
    } catch (error) {
      console.error('[NotificationService] getPreferences error:', error);
      throw error;
    }
  }

  /**
   * Bildirim tercihlerini güncelle
   *
   * @param params - Güncelleme parametreleri
   * @param params.userId - Kullanıcı ID
   * @param params.preferences - Bildirim tercihleri objesi
   * @returns İşlem başarı durumu
   */
  async updatePreferences(params: UpdatePreferencesParams): Promise<boolean> {
    try {
      if (!params.userId) {
        throw new Error('Kullanıcı ID gereklidir');
      }

      if (!params.preferences) {
        throw new Error('Bildirim tercihleri gereklidir');
      }

      if (USE_MOCK_API) {
        return new Promise((resolve) => {
          setTimeout(() => {
            // Mock'ta tercihleri güncelle
            Object.assign(mockPreferences, params.preferences);
            resolve(true);
          }, 300);
        });
      }

      // Gerçek API — userId token'dan
      await apiFetch('/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify({ preferences: params.preferences }),
      });
      return true;
    } catch (error) {
      console.error('[NotificationService] updatePreferences error:', error);
      throw error;
    }
  }

  /**
   * Bildirimleri tipe göre filtrele (yardımcı fonksiyon)
   *
   * @param notifications - Bildirim dizisi
   * @param type - Bildirim tipi
   * @returns Filtrelenmiş bildirimler
   */
  filterByType(notifications: NotificationItem[], type: string): NotificationItem[] {
    return filterNotificationsByType(notifications, type);
  }

  /**
   * Okunmamış bildirimleri filtrele (yardımcı fonksiyon)
   *
   * @param notifications - Bildirim dizisi
   * @returns Okunmamış bildirimler
   */
  filterUnread(notifications: NotificationItem[]): NotificationItem[] {
    return filterUnreadNotifications(notifications);
  }

  /**
   * Bildirimleri tarihe göre sırala (yardımcı fonksiyon)
   *
   * @param notifications - Bildirim dizisi
   * @param order - Sıralama yönü ('desc' | 'asc', default: 'desc')
   * @returns Sıralanmış bildirimler
   */
  sortByDate(notifications: NotificationItem[], order = 'desc'): NotificationItem[] {
    const sorted = [...notifications];
    sorted.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();

      if (order === 'asc') {
        return dateA - dateB;
      }
      return dateB - dateA;
    });

    return sorted;
  }

  /**
   * Bildirim detayını aç ve okundu olarak işaretle
   *
   * @param notificationId - Bildirim ID
   * @returns Bildirim detayı
   */
  async openNotification(notificationId: number | string): Promise<NotificationItem> {
    try {
      // Bildirimi getir
      const notification = await this.getNotificationById(notificationId);

      // Okunmamışsa okundu olarak işaretle
      if (!notification.read) {
        await this.markAsRead(notificationId);
        notification.read = true;
        notification.readAt = new Date().toISOString();
      }

      return notification;
    } catch (error) {
      console.error('[NotificationService] openNotification error:', error);
      throw error;
    }
  }

  /**
   * Bildirim tipine göre detay sayfası linkini oluştur
   *
   * @param notification - Bildirim objesi
   * @returns Detay sayfası linki
   */
  getDetailLink(notification: NotificationItem): string | null {
    if (notification.link) {
      return notification.link;
    }

    // Tip bazlı varsayılan linkler
    switch (notification.type) {
      case 'price-drop':
      case 'listing-published':
      case 'listing-expired':
        return notification.details?.listing?.id
          ? `/ilan/${notification.details.listing.id}`
          : null;

      case 'new-message':
        return notification.details?.conversation?.id
          ? `/dashboard/mesajlar/${notification.details.conversation.id}`
          : null;

      case 'appointment-request':
        return notification.details?.appointment?.id
          ? `/dashboard/randevular/${notification.details.appointment.id}`
          : null;

      case 'seller-review':
        return `/profil/${notification.userId}/degerlendirmeler`;

      default:
        return null;
    }
  }
}

// Singleton instance oluştur ve export et
const notificationService = new NotificationService();

export default notificationService;

// Named export için de destek
export { NotificationService };
