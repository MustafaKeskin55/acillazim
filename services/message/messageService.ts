/**
 * Mesajlaşma Servisi
 * ==================
 *
 * Şu an geçici mock data; API hazır olunca mock + setTimeout kaldırılacak.
 * Path alias yok: /api/conversations veya /api/messages (v1’siz) kullanılmaz
 *   → /api/v1/conversations/...
 *   → /api/v1/messages/...
 *
 * BE routing: /unread-count ve /with/{userId}, {conversationId} dinamik route’larından önce.
 */

import { conversationsData, messagesData } from '@/data/messageData';
import listingsData from '@/data/üründat.json';
import usersData from '@/data/user_database2.json';
import authService from '@/services/auth/authService';

/** Host normalize → {host}/api/v1 */
function resolveMessagesApiBase(): string {
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

const API_BASE_URL = resolveMessagesApiBase();
const USE_MOCK = false; // Canlı BE

interface Conversation {
  conversation_id: number | null;
  from_user_id: number | string | null;
  to_user_id: number | string | null;
  listing_id?: number | string | null;
  timestamp?: string;
  isRead?: boolean;
  [key: string]: unknown;
}

interface Message {
  message_id: number | null;
  conversation_id: number | string;
  sender_id: number | string | null;
  receiver_id?: number | string;
  content: string;
  timestamp: string;
  status?: string;
  [key: string]: unknown;
}

interface UserInfo {
  id: number | string;
  name: string | null;
  avatar: string | null;
  phone?: string;
  email?: string;
}

interface ListingInfo {
  id: number | string;
  title: string | null;
  price: string | null;
  image: string | null;
  location?: string | null;
  category?: number | string;
}

interface ReportResult {
  success: boolean;
  message: string | null;
}

interface UserRecord {
  user_id?: number | string;
  ad_soyad?: string;
  profil_fotografi?: string;
  telefon?: string;
  email?: string;
  [key: string]: unknown;
}

interface ListingRecord {
  ilan_id?: number | string;
  baslik?: string;
  fiyat?: number;
  para_birimi?: string;
  konum?: { il?: string };
  category_id?: number | string;
  resimler?: string[];
  [key: string]: unknown;
}

interface ListingDataType {
  ilanlari?: ListingRecord[];
}

// Geçici mock data (API entegrasyonu sonrası kaldırılacak)
let conversations: Conversation[] = [...(conversationsData as Conversation[])];
let messages: Message[] = [...(messagesData as Message[])];

const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

const unwrapData = <T>(json: unknown): T => {
  if (json && typeof json === 'object' && 'data' in (json as object)) {
    return (json as { data: T }).data;
  }
  return json as T;
};

/**
 * Mevcut kullanıcı ID'sini getir
 */
const getCurrentUserId = (): number | string | null => {
  const currentUser = authService.getCurrentUser();
  if (!currentUser) return null;

  return (currentUser as { id?: number | string; user_id?: number | string; userId?: number | string }).id ||
    (currentUser as { user_id?: number | string }).user_id ||
    (currentUser as { userId?: number | string }).userId ||
    null;
};

/**
 * Tüm konuşmaları getir
 * API: GET /api/v1/conversations
 */
export const getConversations = async (): Promise<Conversation[]> => {
  console.log(`[Messages API] Hedef path: GET ${API_BASE_URL}/conversations`);
  if (!USE_MOCK) {
    const res = await fetch(`${API_BASE_URL}/conversations`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`API hatası: ${res.status}`);
    return unwrapData<Conversation[]>(await res.json());
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(conversations);
    }, 100);
  });
};

/**
 * Belirli bir mesajı ID ile getir
 * API: GET /api/v1/messages/{messageId}
 */
export const getMessageById = async (messageId: number | string): Promise<Message | null> => {
  console.log(`[Messages API] Hedef path: GET ${API_BASE_URL}/messages/${messageId}`);
  if (!USE_MOCK) {
    const res = await fetch(`${API_BASE_URL}/messages/${messageId}`, { headers: getAuthHeaders() });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`API hatası: ${res.status}`);
    return unwrapData<Message>(await res.json());
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      const message = messages.find((msg) => msg.message_id === messageId);
      resolve(message || null);
    }, 100);
  });
};

/**
 * Belirli bir konuşmanın mesajlarını getir
 * API: GET /api/v1/conversations/{conversationId}/messages
 */
export const getMessagesByConversationId = async (conversationId: number | string): Promise<Message[]> => {
  console.log(`[Messages API] Hedef path: GET ${API_BASE_URL}/conversations/${conversationId}/messages`);
  if (!USE_MOCK) {
    const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`API hatası: ${res.status}`);
    return unwrapData<Message[]>(await res.json());
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      const conversationMessages = messages.filter(
        (msg) => msg.conversation_id === conversationId
      );
      resolve(conversationMessages);
    }, 100);
  });
};

/**
 * Konuşmayı okundu olarak işaretle
 * API: PUT /api/v1/conversations/{conversationId}/read
 */
export const markConversationAsRead = async (conversationId: number | string): Promise<boolean> => {
  console.log(`[Messages API] Hedef path: PUT ${API_BASE_URL}/conversations/${conversationId}/read`);
  if (!USE_MOCK) {
    const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}/read`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`API hatası: ${res.status}`);
    return true;
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      conversations = conversations.map((conv) =>
        conv.conversation_id === conversationId ? { ...conv, isRead: true } : conv
      );
      resolve(true);
    }, 100);
  });
};

/**
 * Tüm konuşmaları okundu olarak işaretle
 * API: PUT /api/v1/conversations/read-all (varsa) veya tek tek /conversations/{id}/read
 */
export const markAllConversationsAsRead = async (conversationIds?: Array<number | string>): Promise<boolean> => {
  console.log(`[Messages API] Hedef path: PUT ${API_BASE_URL}/conversations/read-all`);
  if (!USE_MOCK) {
    let success = false;
    try {
      const res = await fetch(`${API_BASE_URL}/conversations/read-all`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        success = true;
      }
    } catch {
      /* fallback if /read-all endpoint doesn't exist on BE */
    }

    if (!success && conversationIds && conversationIds.length > 0) {
      await Promise.allSettled(
        conversationIds.map((id) => markConversationAsRead(id))
      );
      success = true;
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('messagesUpdated', { detail: { count: 0 } }));
    }
    return success;
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      conversations = conversations.map((conv) => ({ ...conv, isRead: true }));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('messagesUpdated', { detail: { count: 0 } }));
      }
      resolve(true);
    }, 100);
  });
};

/**
 * Yeni mesaj gönder
 * API: POST /api/v1/conversations/{conversationId}/messages
 */
export const sendMessage = async (conversationId: number | string, content: string): Promise<Message | null> => {
  console.log(`[Messages API] Hedef path: POST ${API_BASE_URL}/conversations/${conversationId}/messages`);
  if (!USE_MOCK) {
    const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error(`API hatası: ${res.status}`);
    const json = await res.json();
    // BE yanıtı data.message içine sarıyor: { data: { message: {...}, conversationId } }
    const data = unwrapData<Message & { message?: Message }>(json);
    const rawMessage = (data && typeof data === 'object' && data.message) ? data.message : (data as Message);
    if (!rawMessage) return null;
    return {
      ...rawMessage,
      message_id: rawMessage.message_id ?? (rawMessage as Record<string, unknown>).id as (number | null),
      conversation_id: rawMessage.conversation_id ?? conversationId,
      sender_id: rawMessage.sender_id ?? (rawMessage as Record<string, unknown>).senderId as (number | string | null),
      content: rawMessage.content ?? content,
      timestamp: rawMessage.timestamp ?? new Date().toISOString(),
    };
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        resolve(null);
        return;
      }

      const conversation = conversations.find((c) => c.conversation_id === conversationId);
      if (!conversation) {
        resolve(null);
        return;
      }

      const receiverId =
        conversation.from_user_id === currentUserId
          ? conversation.to_user_id
          : conversation.from_user_id;

      const newMessage: Message = {
        message_id: Date.now(),
        conversation_id: conversationId,
        sender_id: currentUserId,
        receiver_id: receiverId ?? undefined,
        content: content,
        timestamp: new Date().toISOString(),
        status: 'sent',
      };

      messages.push(newMessage);

      conversations = conversations.map((conv) =>
        conv.conversation_id === conversationId
          ? { ...conv, timestamp: newMessage.timestamp }
          : conv
      );

      resolve(newMessage);
    }, 100);
  });
};

/**
 * Konuşmayı sil (tüm mesajlarıyla birlikte)
 * API: DELETE /api/v1/conversations/{conversationId}
 */
export const deleteConversation = async (conversationId: number | string): Promise<boolean> => {
  console.log(`[Messages API] Hedef path: DELETE ${API_BASE_URL}/conversations/${conversationId}`);
  if (!USE_MOCK) {
    const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`API hatası: ${res.status}`);
    return true;
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      conversations = conversations.filter(
        (conv) => conv.conversation_id !== conversationId
      );
      messages = messages.filter((msg) => msg.conversation_id !== conversationId);
      resolve(true);
    }, 100);
  });
};

/**
 * Mesajı raporla
 * API: POST /api/v1/messages/{messageId}/report
 */
export const reportMessage = async (messageId: number | string, reason: string): Promise<ReportResult> => {
  console.log(`[Messages API] Hedef path: POST ${API_BASE_URL}/messages/${messageId}/report`);
  if (!USE_MOCK) {
    const res = await fetch(`${API_BASE_URL}/messages/${messageId}/report`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) throw new Error(`API hatası: ${res.status}`);
    const json = await res.json();
    const data = unwrapData<ReportResult | null>(json);
    return data || { success: true, message: (json as { message?: string }).message ?? null };
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Mesaj raporlandı - ID: ${messageId}, Sebep: ${reason}`);
      resolve({
        success: true,
        message: null,
      });
    }, 100);
  });
};

/**
 * Okunmamış mesaj sayısını getir
 * API: GET /api/v1/conversations/unread-count
 */
export const getUnreadCount = async (): Promise<number> => {
    if (!USE_MOCK) {
    const res = await fetch(`${API_BASE_URL}/conversations/unread-count`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`API hatası: ${res.status}`);
    const data = unwrapData<number | { count: number }>(await res.json());
    return typeof data === 'number' ? data : data.count;
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      const unreadCount = conversations.filter((conv) => !conv.isRead).length;
      resolve(unreadCount);
    }, 100);
  });
};

/**
 * Belirli bir kullanıcıyla olan conversation'ı bul
 * API: GET /api/v1/conversations/with/{userId}
 */
export const getConversationWithUser = async (userId: number | string): Promise<Conversation | null> => {
  console.log(`[Messages API] Hedef path: GET ${API_BASE_URL}/conversations/with/${userId}`);
  if (!USE_MOCK) {
    const res = await fetch(`${API_BASE_URL}/conversations/with/${userId}`, {
      headers: getAuthHeaders(),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`API hatası: ${res.status}`);
    return unwrapData<Conversation>(await res.json());
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        resolve(null);
        return;
      }

      const conversation = conversations.find(
        (conv) =>
          (conv.from_user_id === currentUserId && conv.to_user_id === userId) ||
          (conv.to_user_id === currentUserId && conv.from_user_id === userId)
      );

      resolve(conversation || null);
    }, 100);
  });
};

/**
 * Yeni konuşma başlat
 * API: POST /api/v1/conversations
 */
export const createConversation = async (
  toUserId: number | string,
  listingId: number | string | null = null
): Promise<Conversation | null> => {
  console.log(`[Messages API] Hedef path: POST ${API_BASE_URL}/conversations`);
  if (!USE_MOCK) {
    const res = await fetch(`${API_BASE_URL}/conversations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ to_user_id: toUserId, listing_id: listingId }),
    });
    if (!res.ok) throw new Error(`API hatası: ${res.status}`);
    return unwrapData<Conversation>(await res.json());
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        resolve(null);
        return;
      }

      const existingConv = conversations.find(
        (conv) =>
          (conv.from_user_id === currentUserId && conv.to_user_id === toUserId) ||
          (conv.to_user_id === currentUserId && conv.from_user_id === toUserId)
      );

      if (existingConv) {
        resolve(existingConv);
        return;
      }

      const newConversation: Conversation = {
        conversation_id: Date.now(),
        from_user_id: currentUserId,
        to_user_id: toUserId,
        listing_id: listingId || null,
        timestamp: new Date().toISOString(),
        isRead: true,
      };

      conversations.push(newConversation);
      resolve(newConversation);
    }, 100);
  });
};

/**
 * Kullanıcı bilgisini getir
 * API: GET /api/v1/users/{userId}
 */
export const getUserById = async (userId: number | string): Promise<UserInfo> => {
  console.log(`[Messages API] Hedef path: GET ${API_BASE_URL}/users/${userId}`);
  if (!USE_MOCK) {
    const res = await fetch(`${API_BASE_URL}/users/${userId}`, { headers: getAuthHeaders() });
    if (!res.ok) {
      return { id: userId, name: null, avatar: null };
    }
    const raw = unwrapData<Record<string, unknown>>(await res.json());
    return {
      id: (raw.id as number | string) || (raw.user_id as number | string) || userId,
      name: (raw.name as string) || (raw.ad_soyad as string) || null,
      avatar: (raw.avatar as string) || (raw.profil_fotografi as string) || null,
      phone: raw.phone as string | undefined,
      email: raw.email as string | undefined,
    };
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      const user = (usersData as UserRecord[]).find((u) => u.user_id === userId);
      if (user) {
        resolve({
          id: user.user_id!,
          name: user.ad_soyad || null,
          avatar: user.profil_fotografi || null,
          phone: user.telefon,
          email: user.email,
        });
      } else {
        resolve({
          id: userId,
          name: null,
          avatar: null,
        });
      }
    }, 50);
  });
};

/**
 * İlan bilgisini getir
 * API: GET /api/v1/listings/{listingId}
 */
export const getListingById = async (listingId: number | string): Promise<ListingInfo> => {
  console.log(`[Messages API] Hedef path: GET ${API_BASE_URL}/listings/${listingId}`);
  if (!USE_MOCK) {
    const res = await fetch(`${API_BASE_URL}/listings/${listingId}`, { headers: getAuthHeaders() });
    if (!res.ok) {
      return { id: listingId, title: null, price: null, image: null };
    }
    const raw = unwrapData<ListingRecord & { title?: string; price?: number; images?: string[] }>(
      await res.json()
    );
    const images = raw.resimler || raw.images || [];
    const priceNum = raw.fiyat ?? raw.price;
    return {
      id: (raw.ilan_id as number | string) || listingId,
      title: raw.baslik || raw.title || null,
      price:
        priceNum !== undefined && priceNum !== null
          ? `${Number(priceNum).toLocaleString('tr-TR')} ${raw.para_birimi || ''}`.trim()
          : null,
      image: Array.isArray(images) && images.length > 0 ? images[0] : null,
      location: raw.konum?.il || null,
      category: raw.category_id,
    };
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      const listing = (listingsData as ListingDataType).ilanlari?.find(
        (l) => l.ilan_id === listingId
      );
      if (listing) {
        const firstImage =
          listing.resimler && listing.resimler.length > 0 ? listing.resimler[0] : null;

        resolve({
          id: listing.ilan_id!,
          title: listing.baslik || null,
          price: listing.fiyat
            ? `${listing.fiyat.toLocaleString('tr-TR')} ${listing.para_birimi || ''}`
            : null,
          image: firstImage,
          location: listing.konum?.il || null,
          category: listing.category_id,
        });
      } else {
        resolve({
          id: listingId,
          title: null,
          price: null,
          image: null,
        });
      }
    }, 50);
  });
};
