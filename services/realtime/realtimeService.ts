/**
 * Realtime WebSocket Servisi
 * ==========================
 * RabbitMQ üzerinden gelen anlık mesaj ve bildirim sayılarını
 * /realtime WebSocket ucu üzerinden dinler.
 * Periyodik HTTP polling (setInterval) ihtiyacını ortadan kaldırır.
 */

import authService from '@/services/auth/authService';

export interface RealtimePayload {
  type: 'unread_counts' | 'message_count' | 'notification_count' | 'new_message' | 'new_notification' | string;
  messageCount?: number;
  notificationCount?: number;
  count?: number;
  [key: string]: unknown;
}

type RealtimeListener = (payload: RealtimePayload) => void;

class RealtimeService {
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 2000;
  private maxReconnectDelay = 30000;
  private isConnecting = false;
  private isExplicitlyClosed = false;
  private listeners: Set<RealtimeListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      // Sekme tekrar aktif olduğunda kopmuş bağlantıyı hızlıca tazele
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && (!this.socket || this.socket.readyState !== WebSocket.OPEN)) {
          this.connect();
        }
      });

      // Oturum durumunu dinle (giriş yapınca bağlan, çıkış yapınca kapat)
      authService.subscribe((state) => {
        if (state.isAuthenticated) {
          this.connect();
        } else {
          this.disconnect();
        }
      });
    }
  }

  /**
   * WebSocket bağlantısını başlat
   */
  connect(): void {
    if (typeof window === 'undefined') return;

    const token = authService.getToken();
    if (!token) {
      this.disconnect();
      return;
    }

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.isExplicitlyClosed = false;
    this.isConnecting = true;

    try {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${window.location.host}/realtime?token=${encodeURIComponent(token)}`;

      const ws = new WebSocket(wsUrl);
      this.socket = ws;

      ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectDelay = 2000;
        console.log('[RealtimeService] WebSocket bağlantısı kuruldu.');
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const payload: RealtimePayload = JSON.parse(event.data);
          this.handlePayload(payload);
        } catch (e) {
          console.warn('[RealtimeService] JSON parse hatası:', e);
        }
      };

      ws.onerror = (err) => {
        console.warn('[RealtimeService] WebSocket hatası:', err);
      };

      ws.onclose = () => {
        this.socket = null;
        this.isConnecting = false;
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };
    } catch (err) {
      console.error('[RealtimeService] Bağlantı başlatılamadı:', err);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Gelen soket mesajını işle ve ilgili CustomEvent'leri tetikle
   */
  private handlePayload(payload: RealtimePayload): void {
    // 1. Abonelere bildir
    this.listeners.forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        console.error('[RealtimeService] Listener hatası:', err);
      }
    });

    // 2. Global CustomEvent'leri fırlat (Navbar ve diğer bileşenler için)
    if (typeof window === 'undefined') return;

    if (payload.type === 'unread_counts') {
      if (typeof payload.messageCount === 'number') {
        window.dispatchEvent(
          new CustomEvent('messagesUpdated', { detail: { count: payload.messageCount } })
        );
      }
      if (typeof payload.notificationCount === 'number') {
        window.dispatchEvent(
          new CustomEvent('notificationsUpdated', { detail: { count: payload.notificationCount } })
        );
      }
    } else if (payload.type === 'message_count' && typeof payload.count === 'number') {
      window.dispatchEvent(
        new CustomEvent('messagesUpdated', { detail: { count: payload.count } })
      );
    } else if (payload.type === 'notification_count' && typeof payload.count === 'number') {
      window.dispatchEvent(
        new CustomEvent('notificationsUpdated', { detail: { count: payload.count } })
      );
    } else if (payload.type === 'new_message') {
      window.dispatchEvent(new CustomEvent('messagesUpdated'));
      window.dispatchEvent(new CustomEvent('newMessageReceived', { detail: payload }));
    } else if (payload.type === 'new_notification') {
      window.dispatchEvent(new CustomEvent('notificationsUpdated'));
      window.dispatchEvent(new CustomEvent('newNotificationReceived', { detail: payload }));
    }
  }

  /**
   * Yeniden bağlanmayı planla
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.isExplicitlyClosed) return;
    if (typeof window === 'undefined') return;
    if (!authService.isUserLoggedIn()) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectDelay);

    this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay);
  }

  /**
   * Bağlantıyı temiz kapat
   */
  disconnect(): void {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      try {
        this.socket.close();
      } catch {}
      this.socket = null;
    }
  }

  /**
   * Gelen realtime olaylarına abone ol
   */
  subscribe(listener: RealtimeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

const realtimeService = new RealtimeService();
export default realtimeService;
