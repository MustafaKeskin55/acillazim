"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  FaArrowLeft,
  FaCheck,
  FaCheckCircle,
  FaExternalLinkAlt,
  FaList,
  FaMapMarkerAlt,
  FaHeart,
  FaChartLine,
  FaArrowRight,
  FaUser,
  FaRegClock,
  FaCalendarAlt,
  FaComments,
  FaBullhorn,
  FaTag,
  FaStar,
  FaCog,
  FaExclamationTriangle,
  FaInfoCircle,
  FaBriefcase,
  FaBolt,
  FaShieldAlt,
  FaTimesCircle,
  FaEye,
  FaPhoneAlt,
  FaRegStar,
} from 'react-icons/fa';
import {
  normalizeNotificationType,
  getNotificationTypeLabel,
  toTrLower,
} from '@/utils/notificationUtils';
import notificationService from '@/services/notification/notificationService';
import * as messageService from '@/services/message/messageService';
import authService from '@/services/auth/authService';
import './DashboardNotificationDetailPage.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DynamicDetails = Record<string, any>;

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt?: string;
  date?: string;
  actionLink?: string;
  actionText?: string;
  link?: string;
  conversationId?: number | string;
  conversation_id?: number | string;
  chatId?: number | string;
  senderId?: number | string;
  sender_id?: number | string;
  fromUserId?: number | string;
  from_user_id?: number | string;
  details?: DynamicDetails;
}

interface MatchedConversationInfo {
  conversationId: number | string | null;
  senderName: string | null;
  listingTitle: string | null;
  lastMessage: string | null;
}

/**
 * Bildirim tipine göre kurumsal vektör ikon döndürür
 */
const renderTypeVectorIcon = (normType: string): React.ReactNode => {
  switch (normType) {
    case 'appointment-request':
      return <FaCalendarAlt />;
    case 'new-message':
      return <FaComments />;
    case 'new-favorite':
      return <FaHeart />;
    case 'price-drop':
      return <FaTag />;
    case 'seller-review':
      return <FaStar />;
    case 'listing-published':
      return <FaBullhorn />;
    case 'expiring-soon':
    case 'listing-expired':
      return <FaExclamationTriangle />;
    case 'system-update':
      return <FaCog />;
    default:
      return <FaBriefcase />;
  }
};

/**
 * Sade randevu bildirim mesajlarından müşteri adı, tarih, saat ve iptal/red sebebini ayrıştırır.
 */
function parseAppointmentFromMessage(message: string): {
  customerName: string | null;
  formattedDate: string | null;
  rawDate: string | null;
  time: string | null;
  reason: string | null;
} {
  if (!message) {
    return { customerName: null, formattedDate: null, rawDate: null, time: null, reason: null };
  }

  const customerMatch =
    message.match(/^(.+?)\s+adlı\s+(?:müşteri\w*|kullanıcı\w*)/i) ||
    message.match(/müşteri\s+([A-ZÇĞİÖŞÜa-zçğıöşü\s]+?)\s+tarafından/i);
  const customerName = customerMatch?.[1]?.trim() || null;

  const isoDateMatch = message.match(/(\d{4}-\d{2}-\d{2})/);
  const trDateMatch = message.match(/(\d{1,2}[./]\d{1,2}[./]\d{4})/);
  const rawDate = isoDateMatch?.[1] || trDateMatch?.[1] || null;

  let formattedDate: string | null = rawDate;
  if (isoDateMatch?.[1]) {
    const parsed = new Date(`${isoDateMatch[1]}T00:00:00`);
    if (!isNaN(parsed.getTime())) {
      formattedDate = parsed.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        weekday: 'long',
      });
    }
  }

  const timeMatch =
    message.match(/(\d{1,2}:\d{2})\s*saatinde/i) ||
    message.match(/saat\s*(\d{1,2}:\d{2})/i) ||
    message.match(/\b(\d{1,2}:\d{2})\b/);
  const time = timeMatch?.[1] || null;

  const reasonMatch = message.match(/(?:Sebep|Neden|Açıklama)\s*:\s*(.+?)(?:$|\.\s)/i);
  const reason = reasonMatch?.[1]?.trim() || null;

  return { customerName, formattedDate, rawDate, time, reason };
}

/**
 * Sade mesaj bildirimlerinden gönderen adını ayrıştırır.
 */
function parseSenderFromMessageNotification(title?: string, message?: string): string | null {
  const text = (message || '').trim();
  if (!text) return null;

  const patterns = [
    /^(.+?)\s+adlı\s+(?:kullanıcıdan|müşteriden|üyeden)/i,
    /^(.+?)\s+size\s+(?:yeni\s+bir\s+)?mesaj\s+gönderdi/i,
    /^(.+?)\s+tarafından\s+(?:yeni\s+bir\s+)?mesaj/i,
    /^([A-ZÇĞİÖŞÜa-zçğıöşü]{2,}(?:\s+[A-ZÇĞİÖŞÜa-zçğıöşü]{2,}){0,3})\s*:/,
  ];

  for (const regex of patterns) {
    const m = text.match(regex);
    if (m?.[1]) {
      const candidate = m[1].trim();
      if (
        candidate.length >= 2 &&
        candidate.length <= 45 &&
        !candidate.toLowerCase().includes('bildirim') &&
        !candidate.toLowerCase().includes('yeni mesaj')
      ) {
        return candidate;
      }
    }
  }

  if (title) {
    const titleMatch = title.match(/^(.+?)\s+(?:mesaj\s+gönderdi|size\s+yazdı)/i);
    if (titleMatch?.[1]) return titleMatch[1].trim();
  }

  return null;
}

/**
 * Bildirim mesajı içindeki kişi adı, tarih (YYYY-MM-DD) ve saat (HH:MM) ifadelerini
 * canlı kurumsal rozetlerle (inline chip) zenginleştirir.
 */
function renderHighlightedMessage(message: string): React.ReactNode {
  if (!message) return null;

  const tokenRegex =
    /([A-ZÇĞİÖŞÜa-zçğıöşü]{2,}(?:\s+[A-ZÇĞİÖŞÜa-zçğıöşü]{2,}){0,3})(?=\s+adlı\s+(?:müşteri\w*|kullanıcı\w*|üye\w*)|\s+size\s+(?:yeni\s+bir\s+)?mesaj)|(\d{4}-\d{2}-\d{2})|(\b\d{1,2}:\d{2}\b)/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(message)) !== null) {
    if (match.index > lastIndex) {
      parts.push(message.slice(lastIndex, match.index));
    }

    const [fullMatch, personGroup, dateGroup, timeGroup] = match;

    if (personGroup) {
      parts.push(
        <span key={`p-${match.index}`} className="nd-inline-chip nd-inline-chip--user">
          <FaUser />
          <span>{personGroup}</span>
        </span>
      );
    } else if (dateGroup) {
      const parsed = new Date(`${dateGroup}T00:00:00`);
      const readableDate = !isNaN(parsed.getTime())
        ? parsed.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : dateGroup;
      parts.push(
        <span key={`d-${match.index}`} className="nd-inline-chip nd-inline-chip--date">
          <FaCalendarAlt />
          <span>{readableDate}</span>
        </span>
      );
    } else if (timeGroup) {
      parts.push(
        <span key={`t-${match.index}`} className="nd-inline-chip nd-inline-chip--time">
          <FaRegClock />
          <span>{timeGroup}</span>
        </span>
      );
    } else {
      parts.push(fullMatch);
    }

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < message.length) {
    parts.push(message.slice(lastIndex));
  }

  return parts.length > 0 ? parts : message;
}

/**
 * Bildirim objesinden doğrudan conversation ID varsa çıkarır.
 */
function extractDirectConversationId(notif: Notification): number | string | null {
  const details: DynamicDetails = notif.details || {};
  const conv: DynamicDetails = details.conversation || {};

  const direct =
    notif.conversationId ||
    notif.conversation_id ||
    notif.chatId ||
    conv.id ||
    conv.conversation_id ||
    details.conversationId ||
    details.conversation_id ||
    details.chatId;

  if (direct) return direct;

  const linkStr = notif.actionLink || notif.link || '';
  const match = linkStr.match(/\/mesajlar\/(\d+)/i) || linkStr.match(/\/conversations\/(\d+)/i);
  if (match?.[1]) return match[1];

  return null;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'M';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const DashboardNotificationDetailPage: React.FC = () => {
  const params = useParams();
  const slugWithId = params?.id as string | undefined;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [matchedConv, setMatchedConv] = useState<MatchedConversationInfo>({
    conversationId: null,
    senderName: null,
    listingTitle: null,
    lastMessage: null,
  });

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        setLoading(true);
        const userId = parseInt(localStorage.getItem('userId') || '123') || 123;
        const response = await (
          notificationService as unknown as {
            getNotifications: (p: { userId: number }) => Promise<{ notifications: Notification[] }>;
          }
        ).getNotifications({ userId });
        setNotifications(response.notifications || []);
      } catch (err) {
        console.error('Bildirimler yüklenirken hata:', err);
      } finally {
        setLoading(false);
      }
    };
    loadNotifications();
  }, []);

  useEffect(() => {
    if (loading || !slugWithId) {
      if (!loading && !slugWithId) {
        setNotification(null);
        document.title = 'Bildirim Bulunamadı - Acillazım';
      }
      return;
    }
    const match = slugWithId.match(/-(\d+)$/);
    let notificationId: number | null = null;
    if (match?.[1]) {
      notificationId = parseInt(match[1], 10);
    } else {
      const direct = parseInt(slugWithId, 10);
      if (!isNaN(direct) && direct > 0 && slugWithId === direct.toString()) notificationId = direct;
    }
    if (notificationId && !isNaN(notificationId)) {
      const found = notifications.find((n) => n.id === notificationId) || null;
      if (found) {
        setNotification(found);
        document.title = `${found.title} - Acillazım`;
      } else {
        (
          notificationService as unknown as {
            getNotificationById: (id: number) => Promise<Notification>;
          }
        )
          .getNotificationById(notificationId)
          .then((single) => {
            if (single) {
              setNotification(single);
              document.title = `${single.title} - Acillazım`;
            } else {
              setNotification(null);
            }
          })
          .catch(() => {
            setNotification(null);
            document.title = 'Bildirim Bulunamadı - Acillazım';
          });
      }
    } else {
      setNotification(null);
      document.title = 'Bildirim Bulunamadı - Acillazım';
    }
  }, [loading, notifications, slugWithId]);

  useEffect(() => {
    if (notification && !notification.read) {
      (notificationService as unknown as { markAsRead: (id: number) => Promise<unknown> })
        .markAsRead(notification.id)
        .then(() => {
          setNotifications((prev) =>
            prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
          );
          setNotification((prev) => (prev ? { ...prev, read: true } : null));
          window.dispatchEvent(new CustomEvent('notificationsUpdated'));
        })
        .catch((err) => console.error('Bildirim okundu işaretleme hatası:', err));
    }
  }, [notification]);

  /**
   * Mesaj veya randevu bildirimi görüntülendiğinde ilgili konuşmayı (conversation_id)
   * canlı konuşma listesinden otomatik eşleştirir.
   */
  useEffect(() => {
    if (!notification) return;
    let isMounted = true;

    const normType = normalizeNotificationType(
      notification.type,
      notification.title,
      notification.message
    );

    if (normType !== 'new-message' && normType !== 'appointment-request') {
      return;
    }

    const resolveRelevantConversation = async () => {
      const directId = extractDirectConversationId(notification);
      const parsedSender =
        normType === 'appointment-request'
          ? parseAppointmentFromMessage(notification.message).customerName
          : parseSenderFromMessageNotification(notification.title, notification.message);

      if (directId) {
        setMatchedConv((prev) => ({
          ...prev,
          conversationId: directId,
          senderName: prev.senderName || parsedSender,
        }));
      }

      try {
        const rawConvs = await messageService.getConversations();
        if (!isMounted || !rawConvs || rawConvs.length === 0) return;

        const currentUser = authService.getCurrentUser() as DynamicDetails | null;
        const currentUserId = currentUser?.id || currentUser?.user_id || currentUser?.userId;

        const details: DynamicDetails = notification.details || {};
        const notifSenderId =
          notification.senderId ||
          notification.sender_id ||
          notification.fromUserId ||
          notification.from_user_id ||
          details.senderId ||
          details.sender_id ||
          details.conversation?.sender?.id;

        const enriched = await Promise.all(
          rawConvs.slice(0, 15).map(async (c: DynamicDetails) => {
            const isSender = currentUserId && String(c.from_user_id) === String(currentUserId);
            const otherUserId = isSender ? c.to_user_id : c.from_user_id;
            let userName: string | null = (c.participantName as string) || null;
            let listingTitle: string | null = (c.listingTitle as string) || null;

            try {
              const [u, l] = await Promise.all([
                otherUserId ? messageService.getUserById(otherUserId) : Promise.resolve(null),
                c.listing_id ? messageService.getListingById(c.listing_id) : Promise.resolve(null),
              ]);
              if (u?.name) userName = u.name;
              if (l?.title) listingTitle = l.title;
            } catch {
              /* ignore */
            }

            return {
              conversationId: c.conversation_id,
              otherUserId,
              senderName: userName,
              listingTitle,
              lastMessage: (c.lastMessage as string) || null,
              timestamp: c.timestamp as string | undefined,
              isRead: Boolean(c.isRead),
            };
          })
        );

        if (!isMounted) return;

        let chosen =
          (directId &&
            enriched.find((item) => String(item.conversationId) === String(directId))) ||
          null;

        if (!chosen && notifSenderId) {
          chosen =
            enriched.find((item) => String(item.otherUserId) === String(notifSenderId)) || null;
        }

        if (!chosen && parsedSender) {
          const lowerSender = parsedSender.toLowerCase();
          chosen =
            enriched.find(
              (item) =>
                item.senderName &&
                (item.senderName.toLowerCase().includes(lowerSender) ||
                  lowerSender.includes(item.senderName.toLowerCase()))
            ) || null;
        }

        if (!chosen && normType === 'new-message') {
          const notifTime = new Date(
            notification.createdAt || notification.date || ''
          ).getTime();
          if (!isNaN(notifTime)) {
            const sortedByTimeDiff = [...enriched].sort((a, b) => {
              const tA = a.timestamp ? Math.abs(new Date(a.timestamp).getTime() - notifTime) : Infinity;
              const tB = b.timestamp ? Math.abs(new Date(b.timestamp).getTime() - notifTime) : Infinity;
              return tA - tB;
            });
            chosen = sortedByTimeDiff[0] || null;
          }
          if (!chosen) {
            chosen = enriched.find((item) => !item.isRead) || enriched[0] || null;
          }
        }

        if (chosen) {
          setMatchedConv({
            conversationId: chosen.conversationId,
            senderName: chosen.senderName || parsedSender,
            listingTitle: chosen.listingTitle || null,
            lastMessage: chosen.lastMessage || null,
          });
        } else if (parsedSender) {
          setMatchedConv((prev) => ({
            ...prev,
            senderName: parsedSender,
          }));
        }
      } catch {
        /* ignore */
      }
    };

    resolveRelevantConversation();
    return () => {
      isMounted = false;
    };
  }, [notification]);

  useEffect(() => {
    return () => {
      document.title = 'Acillazım';
    };
  }, []);

  const formatDate = (date: string | null, notif: Notification | null = null): string => {
    const dateStr = date || notif?.createdAt || notif?.date;
    if (!dateStr) return 'Tarih bilgisi yok';
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return 'Tarih bilgisi yok';
    return dateObj.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const maskReviewerName = (fullName: string): string => {
    if (!fullName) return '';
    return fullName
      .trim()
      .split(/\s+/)
      .map((p) => (p.length === 0 ? '' : p[0].toUpperCase() + '*'.repeat(Math.max(p.length - 1, 6))))
      .join(' ');
  };

  const getRelevantMessageHref = (notif: Notification, fallbackSender?: string | null): string => {
    const directId = matchedConv.conversationId || extractDirectConversationId(notif);
    if (directId) {
      return `/dashboard/mesajlar/${directId}`;
    }
    const sender = matchedConv.senderName || fallbackSender;
    if (sender) {
      return `/dashboard/mesajlar?sender=${encodeURIComponent(sender)}`;
    }
    return '/dashboard/mesajlar';
  };

  const handleOpenRelevantMessage = (senderName?: string | null) => {
    try {
      sessionStorage.setItem(
        'open_conversation_from_notification',
        JSON.stringify({
          conversationId: matchedConv.conversationId,
          senderName: senderName || matchedConv.senderName || null,
        })
      );
    } catch {
      /* ignore */
    }
  };

  /**
   * Mesaj kutusunu canlı, ikonlu ve vurgulu çiplerle render eder
   */
  const renderSpotlightMessageBox = (normType: string, message: string) => (
    <div className={`notification-message-text notification-message-text--${normType}`}>
      <div className="notification-message-text__top">
        <div className="notification-message-text__label">
          <span className="notification-message-text__label-icon">
            <FaBolt />
          </span>
          <span>Bildirim İçeriği & Detay Özeti</span>
        </div>
        <span className="notification-message-text__live-tag">
          <span className="notification-message-text__live-dot" />
          Canlı Sistem Kaydı
        </span>
      </div>
      <p className="notification-message-text__body">{renderHighlightedMessage(message)}</p>
      <div className="notification-message-text__watermark" aria-hidden="true">
        {renderTypeVectorIcon(normType)}
      </div>
    </div>
  );

  /**
   * Sade bildirimler için (details objesi boş olsa dahi) bildirim türüne özel
   * canlı kurumsal Bento özet kartları, işlem adımları (timeline) ve aksiyon çubuğu üretir.
   */
  const renderSmartBentoAndActions = (normType: string, notif: Notification) => {
    if (normType === 'appointment-request') {
      const parsed = parseAppointmentFromMessage(notif.message);
      const appt: DynamicDetails = (notif.details || {}).appointment || {};
      const req: DynamicDetails = appt.requester || {};
      const fullTextLower = toTrLower(`${notif.title || ''} ${notif.message || ''}`);
      const rawTypeLower = toTrLower(notif.type);

      const isCompleted =
        fullTextLower.includes('tamamland') || rawTypeLower.includes('complete');
      const isCancelled =
        !isCompleted &&
        (fullTextLower.includes('iptal') || rawTypeLower.includes('cancel'));
      const isRejectedOnly =
        !isCompleted &&
        !isCancelled &&
        (fullTextLower.includes('reddedildi') ||
          fullTextLower.includes('reddetti') ||
          fullTextLower.includes('red edildi') ||
          rawTypeLower.includes('reject'));
      const isRejected = isCancelled || isRejectedOnly;
      const isRescheduled =
        !isCompleted &&
        !isRejected &&
        (fullTextLower.includes('değiştirildi') ||
          fullTextLower.includes('yeni tarih') ||
          fullTextLower.includes('ertele') ||
          fullTextLower.includes('revize') ||
          rawTypeLower.includes('reschedule'));
      const isConfirmed =
        !isCompleted &&
        !isRejected &&
        !isRescheduled &&
        (fullTextLower.includes('onayland') ||
          fullTextLower.includes('kabul edildi') ||
          rawTypeLower.includes('confirm') ||
          rawTypeLower.includes('approve'));

      const customerName =
        (req.name as string) ||
        parsed.customerName ||
        matchedConv.senderName ||
        'Müşteri Talebi';
      const dateLabel =
        parsed.formattedDate ||
        (isCompleted || isRejected ? formatDate(null, notif) : 'Belirtilen Tarih');
      const timeLabel =
        parsed.time ||
        (isCompleted
          ? 'Hizmet Tamamlandı'
          : isCancelled
          ? 'Randevu İptal Edildi'
          : isRejectedOnly
          ? 'Randevu Reddedildi'
          : 'Belirtilen Saat');
      const targetHref = notif.actionLink || notif.link || '/dashboard/randevular';
      const messageHref = getRelevantMessageHref(notif, customerName);

      // Bildirim durumuna göre adım içeriklerini ve şu anki aktif adımı belirle
      const flowConfig = isCompleted
        ? {
            pillVariant: 'emerald' as const,
            currentStepSummary: 'Tüm Adımlar Tamamlandı (3/3)',
            subtitle: 'Randevu sürecinin tamamı başarıyla sonuçlandırıldı.',
            steps: [
              {
                stepNo: 1,
                state: 'is-done' as const,
                statusText: 'Tamamlandı',
                title: 'Randevu Talebi Alındı',
                desc: `${customerName} tarafından oluşturulan randevu kayda alındı.`,
              },
              {
                stepNo: 2,
                state: 'is-done' as const,
                statusText: 'Tamamlandı',
                title: 'Randevu Saati Onaylandı',
                desc: 'Taraflar arasında randevu günü ve saati kesinleştirildi.',
              },
              {
                stepNo: 3,
                state: 'is-done' as const,
                statusText: 'Tamamlandı',
                title: 'Hizmet Tamamlandı',
                desc: 'Randevu hizmeti sunularak süreç başarıyla kapatıldı.',
              },
            ],
          }
        : isConfirmed
        ? {
            pillVariant: 'emerald' as const,
            currentStepSummary: 'Şu An 3. Adımdasınız (3/3) • Randevu Günü Bekleniyor',
            subtitle: 'Randevu onaylandı; sırada planlanan gün ve saatte hizmetin gerçekleşmesi var.',
            steps: [
              {
                stepNo: 1,
                state: 'is-done' as const,
                statusText: 'Tamamlandı',
                title: 'Randevu Talebi Oluşturuldu',
                desc: `${customerName} ile randevu talebi başlatıldı.`,
              },
              {
                stepNo: 2,
                state: 'is-done' as const,
                statusText: 'Tamamlandı',
                title: 'Randevu Onaylandı',
                desc: `${dateLabel} • ${timeLabel} tarihi kesinleştirildi.`,
              },
              {
                stepNo: 3,
                state: 'is-active' as const,
                statusText: 'Şu Anki Adım',
                title: 'Randevu Günü Hizmet Verilir',
                desc: 'Belirlenen tarih ve saatte hizmet sunularak süreç tamamlanır.',
              },
            ],
          }
        : isRejected
        ? {
            pillVariant: 'rose' as const,
            currentStepSummary: isCancelled
              ? 'Süreç Sonlandı • Randevu İptal Edildi'
              : 'Süreç Sonlandı • Randevu Reddedildi',
            subtitle: isCancelled
              ? 'Müşteri randevu talebini iptal ettiği için süreç sonlandırılmıştır; onaylamanıza gerek yoktur.'
              : 'Bu randevu talebi reddedildiği için süreç sonlandırılmıştır.',
            steps: [
              {
                stepNo: 1,
                state: 'is-done' as const,
                statusText: 'Tamamlandı',
                title: 'Randevu Talebi Oluşturuldu',
                desc: `${customerName} tarafından oluşturulan randevu talebi kayda alındı.`,
              },
              {
                stepNo: 2,
                state: 'is-cancelled' as const,
                statusText: isCancelled ? 'İptal Edildi' : 'Reddedildi',
                title: isCancelled ? 'Randevu İptal Edildi' : 'Randevu Talebi Reddedildi',
                desc: parsed.reason
                  ? `${customerName} tarafından "${parsed.reason}" sebebiyle iptal edildi.`
                  : 'Randevu talebi onay aşamasında iptal edilerek geçersiz kılındı.',
              },
              {
                stepNo: 3,
                state: 'is-cancelled-end' as const,
                statusText: 'Süreç Kapandı',
                title: 'Randevu Süreci Sonlandı',
                desc: 'Bu randevu için onay veya işlem gerekmiyor. Dilerseniz mesaj gönderebilirsiniz.',
              },
            ],
          }
        : isRescheduled
        ? {
            pillVariant: 'amber' as const,
            currentStepSummary: 'Şu An 2. Adımdasınız (2/3) • Yeni Tarih Onayı Bekleniyor',
            subtitle:
              'Randevu tarihi güncellendi; yeni tarihin kesinleşmesi için onay aşamasındasınız.',
            steps: [
              {
                stepNo: 1,
                state: 'is-done' as const,
                statusText: 'Tamamlandı',
                title: 'Yeni Tarih Talebi İletildi',
                desc: `${customerName} için yeni tarih (${dateLabel}${
                  parsed.time ? ` - ${parsed.time}` : ''
                }) önerildi.`,
              },
              {
                stepNo: 2,
                state: 'is-active' as const,
                statusText: 'Şu Anki Adım • Sıra Sizde',
                title: 'Yeni Tarih Onayınız Bekleniyor',
                desc: 'Randevularım sayfasından yeni saati onaylayabilir veya farklı bir saat seçebilirsiniz.',
              },
              {
                stepNo: 3,
                state: 'is-upcoming' as const,
                statusText: 'Sıradaki Adım',
                title: 'Yeni Saat Kesinleşir',
                desc: 'Onaylandığında randevu takvimi güncellenir ve karşı tarafa bildirim gider.',
              },
            ],
          }
        : {
            pillVariant: 'amber' as const,
            currentStepSummary: 'Şu An 2. Adımdasınız (2/3) • Onayınız Bekleniyor',
            subtitle: 'Yeni randevu talebi alındı; sürecin ilerlemesi için yanıtınız bekleniyor.',
            steps: [
              {
                stepNo: 1,
                state: 'is-done' as const,
                statusText: 'Tamamlandı',
                title: 'Randevu Talebi Alındı',
                desc: `${customerName} tarafından yeni randevu talebi oluşturuldu.`,
              },
              {
                stepNo: 2,
                state: 'is-active' as const,
                statusText: 'Şu Anki Adım • Sıra Sizde',
                title: 'Sizin Onayınız Bekleniyor',
                desc: 'Uygunluk durumunuza göre randevuyu onaylayın veya yeni bir saat önerin.',
              },
              {
                stepNo: 3,
                state: 'is-upcoming' as const,
                statusText: 'Sıradaki Adım',
                title: 'Randevu Kesinleşir',
                desc: 'Onayınız sonrasında müşteriye anında onay bildirimi iletilir.',
              },
            ],
          };

      return (
        <div className="nd-smart-section">
          <div className="nd-bento-grid">
            <div className="nd-bento-card nd-bento-card--warm">
              <div className="nd-bento-avatar-wrap">
                <div className="nd-bento-avatar">{getInitials(customerName)}</div>
                <span className="nd-bento-online-dot" />
              </div>
              <div className="nd-bento-copy">
                <span className="nd-bento-label">
                  {isCompleted
                    ? 'Hizmet Alan Müşteri'
                    : isCancelled
                    ? 'İptal Eden Müşteri'
                    : isRejectedOnly
                    ? 'İlgili Müşteri'
                    : 'Talep Eden Müşteri'}
                </span>
                <strong className="nd-bento-value">{customerName}</strong>
                <span className="nd-bento-sub">
                  {isCompleted
                    ? 'Tamamlanan Randevu Kaydı'
                    : isCancelled
                    ? 'Randevu İptal Bildirimi'
                    : isRejectedOnly
                    ? 'Reddedilen Randevu Kaydı'
                    : isRescheduled
                    ? 'Tarih Değişikliği Talebi'
                    : 'Randevu & Hizmet Talebi'}
                </span>
              </div>
            </div>

            <div className="nd-bento-card nd-bento-card--amber">
              <div className="nd-bento-icon nd-bento-icon--amber">
                <FaCalendarAlt />
              </div>
              <div className="nd-bento-copy">
                <span className="nd-bento-label">
                  {isCompleted
                    ? 'İşlem Tarihi'
                    : isRejected
                    ? parsed.formattedDate
                      ? 'İptal Edilen Randevu Tarihi'
                      : 'İptal İşlem Tarihi'
                    : isRescheduled
                    ? 'Önerilen Yeni Tarih'
                    : 'Randevu Tarihi'}
                </span>
                <strong className="nd-bento-value">{dateLabel}</strong>
                <span className="nd-bento-sub">
                  {isCompleted
                    ? 'Tamamlanma Zamanı'
                    : isRejected
                    ? parsed.reason
                      ? `Sebep: ${parsed.reason}`
                      : 'İptal Kayıt Zamanı'
                    : 'Planlanan Ziyaret Günü'}
                </span>
              </div>
            </div>

            <div className={`nd-bento-card ${isRejected ? 'nd-bento-card--rose' : 'nd-bento-card--emerald'}`}>
              <div className={`nd-bento-icon ${isRejected ? 'nd-bento-icon--rose' : 'nd-bento-icon--emerald'}`}>
                {isCompleted || isConfirmed ? (
                  <FaCheckCircle />
                ) : isRejected ? (
                  <FaTimesCircle />
                ) : (
                  <FaRegClock />
                )}
              </div>
              <div className="nd-bento-copy">
                <span className="nd-bento-label">
                  {isRejected ? 'Randevu & Süreç Durumu' : 'Randevu Saati & Durum'}
                </span>
                <div className="nd-bento-row">
                  <strong className="nd-bento-value">{timeLabel}</strong>
                  <span
                    className={`nd-status-pill ${
                      isCompleted || isConfirmed
                        ? 'nd-status-pill--emerald'
                        : isRejected
                        ? 'nd-status-pill--rose'
                        : 'nd-status-pill--amber'
                    }`}
                  >
                    <span className="nd-status-pill__dot" />
                    {isCompleted
                      ? 'Tamamlandı'
                      : isConfirmed
                      ? 'Onaylandı'
                      : isCancelled
                      ? 'İptal Edildi'
                      : isRejectedOnly
                      ? 'Reddedildi'
                      : 'Onay Bekliyor'}
                  </span>
                </div>
                <span className="nd-bento-sub">
                  {isCompleted
                    ? 'Randevu başarıyla sonuçlandırıldı'
                    : isConfirmed
                    ? 'Randevu saati kesinleşti'
                    : isCancelled
                    ? 'Müşteri tarafından iptal edildi • Onay gerekmiyor'
                    : isRejectedOnly
                    ? 'Randevu talebi reddedildi • Süreç kapandı'
                    : 'Müşteri yanıtınızı bekliyor'}
                </span>
              </div>
            </div>
          </div>

          {/* Açıklayıcı 3 Adımlı Randevu Süreç Haritası */}
          <div className="nd-flow-card">
            <div className="nd-flow-header">
              <div className="nd-flow-header__left">
                <span className="nd-flow-header__eyebrow">
                  <FaCalendarAlt /> RANDEVU SÜREÇ ADIMLARI
                </span>
                <p className="nd-flow-header__sub">{flowConfig.subtitle}</p>
              </div>
              <div className={`nd-flow-current-pill nd-flow-current-pill--${flowConfig.pillVariant}`}>
                <span className="nd-flow-current-pill__dot" />
                <span>{flowConfig.currentStepSummary}</span>
              </div>
            </div>

            <div className="nd-flow-steps">
              {flowConfig.steps.map((step, idx) => (
                <React.Fragment key={step.stepNo}>
                  <div className={`nd-flow-step ${step.state}`}>
                    <div className="nd-flow-step__top">
                      <div className="nd-flow-step__badge">
                        {step.state === 'is-done' ? (
                          <FaCheck />
                        ) : step.state === 'is-cancelled' ? (
                          <FaTimesCircle />
                        ) : (
                          step.stepNo
                        )}
                      </div>
                      <span className="nd-flow-step__step-label">{step.stepNo}. ADIM</span>
                      <span className={`nd-flow-step__status nd-flow-step__status--${step.state}`}>
                        {(step.state === 'is-active' || step.state === 'is-cancelled') && (
                          <span className="nd-flow-step__status-dot" />
                        )}
                        {step.statusText}
                      </span>
                    </div>
                    <div className="nd-flow-step__text">
                      <strong>{step.title}</strong>
                      <span>{step.desc}</span>
                    </div>
                  </div>
                  {idx < flowConfig.steps.length - 1 && (
                    <div className="nd-flow-connector" aria-hidden="true">
                      <FaArrowRight />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="nd-action-banner">
            <div className="nd-action-banner__info">
              <span className="nd-action-banner__icon">
                {isCompleted ? (
                  <FaCheckCircle />
                ) : isRejected ? (
                  <FaTimesCircle />
                ) : (
                  <FaCalendarAlt />
                )}
              </span>
              <div>
                <h5>
                  {isCompleted
                    ? 'Randevu Başarıyla Tamamlandı'
                    : isCancelled
                    ? 'Randevu İptal Edildi — Onay İşlemi Gerekmiyor'
                    : isRejectedOnly
                    ? 'Randevu Talebi Sonlandırıldı'
                    : isRescheduled
                    ? 'Yeni Randevu Tarihini Onaylayın veya Düzenleyin'
                    : 'Randevu Talebini Hemen Yönetin'}
                </h5>
                <p>
                  {isCompleted
                    ? 'Tamamlanan randevu kaydınızı randevularım sayfasından inceleyebilir veya müşterinizle mesajlaşabilirsiniz.'
                    : isRejected
                    ? 'Bu randevu talebi iptal edildiği için takviminizden düşürülmüştür. Dilerseniz randevu geçmişinizi inceleyebilir veya müşteriyle mesajlaşabilirsiniz.'
                    : 'Müşterinin talep ettiği tarih ve saat sizin için uygunsa randevularım sayfasından onaylayabilir veya doğrudan mesaj gönderebilirsiniz.'}
                </p>
              </div>
            </div>
            <div className="nd-action-banner__buttons">
              <a href={targetHref} className="btn-primary">
                <span>{notif.actionText || 'Randevulara Git'}</span>
                <FaArrowRight />
              </a>
              <a
                href={messageHref}
                className="btn-secondary"
                onClick={() => handleOpenRelevantMessage(customerName)}
              >
                <FaComments />
                <span>İlgili Mesaja Git</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    if (normType === 'new-message') {
      const parsedSender = parseSenderFromMessageNotification(notif.title, notif.message);
      const senderDisplay = matchedConv.senderName || parsedSender || 'Müşteri Mesajı';
      const topicDisplay = matchedConv.listingTitle || 'Doğrudan Mesajlaşma';
      const messageHref = getRelevantMessageHref(notif, parsedSender);

      const msgSteps = [
        {
          stepNo: 1,
          state: 'is-done' as const,
          statusText: 'Tamamlandı',
          title: 'Yeni Mesaj Alındı',
          desc: `${senderDisplay} size yeni bir mesaj gönderdi.`,
        },
        {
          stepNo: 2,
          state: 'is-active' as const,
          statusText: 'Şu Anki Adım • Sıra Sizde',
          title: 'Sohbeti Görüntüleyin',
          desc: 'İlgili konuşma penceresine geçerek gelen mesajı okuyun.',
        },
        {
          stepNo: 3,
          state: 'is-upcoming' as const,
          statusText: 'Sıradaki Adım',
          title: 'Yanıt Gönderin',
          desc: 'Hızlı dönüş yapmak müşteri memnuniyetini ve anlaşma oranını artırır.',
        },
      ];

      return (
        <div className="nd-smart-section">
          <div className="nd-bento-grid">
            <div className="nd-bento-card nd-bento-card--warm">
              <div className="nd-bento-avatar-wrap">
                <div className="nd-bento-avatar">{getInitials(senderDisplay)}</div>
                <span className="nd-bento-online-dot" />
              </div>
              <div className="nd-bento-copy">
                <span className="nd-bento-label">Gönderen Kullanıcı</span>
                <strong className="nd-bento-value">{senderDisplay}</strong>
                <span className="nd-bento-sub">Sohbet & İlan İletişimi</span>
              </div>
            </div>
            <div className="nd-bento-card nd-bento-card--emerald">
              <div className="nd-bento-icon nd-bento-icon--emerald">
                <FaComments />
              </div>
              <div className="nd-bento-copy">
                <span className="nd-bento-label">İlgili Konuşma / İlan</span>
                <strong className="nd-bento-value">{topicDisplay}</strong>
                <span className="nd-bento-sub">Acillazım Güvenli Mesajlaşma</span>
              </div>
            </div>
            <div className="nd-bento-card nd-bento-card--amber">
              <div className="nd-bento-icon nd-bento-icon--amber">
                <FaRegClock />
              </div>
              <div className="nd-bento-copy">
                <span className="nd-bento-label">Mesaj Zamanı & Durum</span>
                <div className="nd-bento-row">
                  <strong className="nd-bento-value">{formatDate(null, notif)}</strong>
                  <span className="nd-status-pill nd-status-pill--amber">
                    <span className="nd-status-pill__dot" />
                    Yanıt Bekliyor
                  </span>
                </div>
                <span className="nd-bento-sub">Doğrudan sohbet ekranından yanıtlayın</span>
              </div>
            </div>
          </div>

          <div className="nd-flow-card">
            <div className="nd-flow-header">
              <div className="nd-flow-header__left">
                <span className="nd-flow-header__eyebrow">
                  <FaComments /> MESAJLAŞMA SÜREÇ ADIMLARI
                </span>
                <p className="nd-flow-header__sub">
                  Gelen mesajın durumunu ve yapmanız gereken sıradaki işlemi takip edebilirsiniz.
                </p>
              </div>
              <div className="nd-flow-current-pill">
                <span className="nd-flow-current-pill__dot" />
                <span>Şu An 2. Adımdasınız (2/3) • Yanıtınız Bekleniyor</span>
              </div>
            </div>

            <div className="nd-flow-steps">
              {msgSteps.map((step, idx) => (
                <React.Fragment key={step.stepNo}>
                  <div className={`nd-flow-step ${step.state}`}>
                    <div className="nd-flow-step__top">
                      <div className="nd-flow-step__badge">
                        {step.state === 'is-done' ? <FaCheck /> : step.stepNo}
                      </div>
                      <span className="nd-flow-step__step-label">{step.stepNo}. ADIM</span>
                      <span className={`nd-flow-step__status nd-flow-step__status--${step.state}`}>
                        {step.state === 'is-active' && (
                          <span className="nd-flow-step__status-dot" />
                        )}
                        {step.statusText}
                      </span>
                    </div>
                    <div className="nd-flow-step__text">
                      <strong>{step.title}</strong>
                      <span>{step.desc}</span>
                    </div>
                  </div>
                  {idx < msgSteps.length - 1 && (
                    <div className="nd-flow-connector" aria-hidden="true">
                      <FaArrowRight />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="nd-action-banner">
            <div className="nd-action-banner__info">
              <span className="nd-action-banner__icon">
                <FaComments />
              </span>
              <div>
                <h5>İlgili Mesajı Görüntüleyin ve Yanıtlayın</h5>
                <p>
                  Butona tıklayarak doğrudan bu bildirime ait konuşma penceresine geçiş
                  yapabilirsiniz.
                </p>
              </div>
            </div>
            <div className="nd-action-banner__buttons">
              <a
                href={messageHref}
                className="btn-primary"
                onClick={() => handleOpenRelevantMessage(senderDisplay)}
              >
                <span>{notif.actionText || 'İlgili Mesaja Git'}</span>
                <FaArrowRight />
              </a>
            </div>
          </div>
        </div>
      );
    }

    const defaultHref =
      notif.actionLink ||
      notif.link ||
      (normType === 'seller-review'
        ? '/dashboard/hizmet-alanlari'
        : normType === 'new-favorite'
        ? '/dashboard/ilan-istatistikleri'
        : '/dashboard/aktif-ilanlar');

    const defaultBtnText =
      notif.actionText ||
      (normType === 'seller-review'
        ? 'Hizmet Alanlarıma Git'
        : normType === 'new-favorite'
        ? 'İlan İstatistiklerini Gör'
        : 'İlanlarıma Git');

    return (
      <div className="nd-smart-section">
        <div className="nd-bento-grid">
          <div className="nd-bento-card nd-bento-card--warm">
            <div className="nd-bento-icon nd-bento-icon--amber">
              {renderTypeVectorIcon(normType)}
            </div>
            <div className="nd-bento-copy">
              <span className="nd-bento-label">Bildirim Kategorisi</span>
              <strong className="nd-bento-value">
                {getNotificationTypeLabel(notif.type, notif.title, notif.message)}
              </strong>
              <span className="nd-bento-sub">Kurumsal Sistem Bildirimi</span>
            </div>
          </div>

          <div className="nd-bento-card nd-bento-card--emerald">
            <div className="nd-bento-icon nd-bento-icon--emerald">
              <FaShieldAlt />
            </div>
            <div className="nd-bento-copy">
              <span className="nd-bento-label">Kayıt & Güvence Durumu</span>
              <div className="nd-bento-row">
                <strong className="nd-bento-value">Doğrulandı</strong>
                <span className="nd-status-pill nd-status-pill--emerald">
                  <span className="nd-status-pill__dot" />
                  Aktif
                </span>
              </div>
              <span className="nd-bento-sub">Hesap geçmişinize işlendi</span>
            </div>
          </div>

          <div className="nd-bento-card nd-bento-card--amber">
            <div className="nd-bento-icon nd-bento-icon--slate">
              <FaRegClock />
            </div>
            <div className="nd-bento-copy">
              <span className="nd-bento-label">Bildirim Zamanı</span>
              <strong className="nd-bento-value">{formatDate(null, notif)}</strong>
              <span className="nd-bento-sub">Acillazım Bildirim Merkezi</span>
            </div>
          </div>
        </div>

        <div className="nd-action-banner">
          <div className="nd-action-banner__info">
            <span className="nd-action-banner__icon">
              {renderTypeVectorIcon(normType)}
            </span>
            <div>
              <h5>İlgili İşlem Sayfasına Geçin</h5>
              <p>
                Bu bildirimle ilişkili ilan, hizmet veya istatistik detaylarını yönetim panelinden
                hemen görüntüleyebilirsiniz.
              </p>
            </div>
          </div>
          <div className="nd-action-banner__buttons">
            <a href={defaultHref} className="btn-primary">
              <span>{defaultBtnText}</span>
              <FaArrowRight />
            </a>
            <a href="/dashboard/bildirimler" className="btn-secondary">
              <FaList />
              <span>Tüm Bildirimler</span>
            </a>
          </div>
        </div>
      </div>
    );
  };

  const renderNotificationContent = () => {
    if (!notification) return null;
    const details: DynamicDetails = notification.details || {};
    const normType = normalizeNotificationType(
      notification.type,
      notification.title,
      notification.message
    );

    switch (normType) {
      case 'welcome': {
        const features = (
          (details.features as Array<{ title: string; icon: string; description: string }>) || []
        ).filter((f) => f.title !== 'Binlerce İlan');
        const ctaButtons =
          (details.ctaButtons as Array<{ link: string; primary: boolean; text: string }>) || [];
        return (
          <div className="welcome-notification">
            <div className="welcome-hero">
              <div className="welcome-hero-content">
                <div className="welcome-badge">Hoş Geldiniz</div>
                <h1 className="welcome-title">
                  {notification.title.replace(/Acillazim/g, 'Acillazım')}
                </h1>
                <p className="welcome-message">
                  {notification.message.replace(/Acillazim/g, 'Acillazım')}
                </p>
              </div>
            </div>
            {features.length > 0 && (
              <div className="welcome-features">
                {features.map((f, i) => (
                  <div key={i} className="welcome-feature-card">
                    <div className="welcome-feature-icon">{f.icon}</div>
                    <div className="welcome-feature-content">
                      <h3>{f.title}</h3>
                      <p>{f.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {ctaButtons.length > 0 ? (
              <div className="welcome-actions">
                {ctaButtons.map((btn, i) => (
                  <a
                    key={i}
                    href={btn.link}
                    className={btn.primary ? 'welcome-btn-primary' : 'welcome-btn-secondary'}
                  >
                    {btn.text}
                    {btn.primary && <FaArrowRight />}
                  </a>
                ))}
              </div>
            ) : (
              renderSmartBentoAndActions(normType, notification)
            )}
          </div>
        );
      }

      case 'appointment-request': {
        const appt: DynamicDetails = details.appointment || {};
        const req: DynamicDetails = appt.requester || {};
        const al: DynamicDetails = appt.listing || {};
        const rdates: DynamicDetails[] = appt.requestedDates || [];
        const hasRichDetails = Boolean(req.name || al.title || rdates.length > 0);

        return (
          <div className="notification-content compact-notification">
            {renderSpotlightMessageBox(normType, notification.message)}

            {hasRichDetails ? (
              <>
                {req.name && (
                  <div className="sender-info">
                    {req.avatar ? (
                      <img src={req.avatar} alt={req.name} className="sender-avatar" />
                    ) : (
                      <div className="nd-bento-avatar">{getInitials(req.name)}</div>
                    )}
                    <div className="sender-details">
                      <h4>
                        {req.name}
                        {req.verified && <span className="verified-icon">✓</span>}
                      </h4>
                      {req.phone && <p className="phone">{req.phone}</p>}
                    </div>
                  </div>
                )}
                {al.title && (
                  <div className="notification-listing-card">
                    <div className="listing-content">
                      <h4>{al.title}</h4>
                      {al.category && <p className="listing-category">{al.category}</p>}
                      {al.price && (
                        <p className="listing-price">
                          {Number(al.price).toLocaleString('tr-TR')} ₺
                        </p>
                      )}
                      {al.address && (
                        <div className="listing-location">
                          <FaMapMarkerAlt /> {al.address}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {rdates.length > 0 && (
                  <div className="requested-dates">
                    <h5>İstenen Tarihler</h5>
                    {rdates.map((d, i) => (
                      <div
                        key={i}
                        className={`date-item ${d.available ? 'available' : 'unavailable'}`}
                      >
                        <span>
                          {d.date} • {d.time}
                        </span>
                        {!d.available && <span className="status-badge">Müsait Değil</span>}
                      </div>
                    ))}
                  </div>
                )}
                {appt.message && (
                  <div className="message-preview">
                    <p>{appt.message}</p>
                  </div>
                )}
                <div className="notification-actions">
                  <a
                    href={notification.actionLink || notification.link || '/dashboard/randevular'}
                    className="btn-primary"
                  >
                    {notification.actionText || 'Randevuyu Görüntüle'}
                    <FaExternalLinkAlt />
                  </a>
                </div>
              </>
            ) : (
              renderSmartBentoAndActions(normType, notification)
            )}
          </div>
        );
      }

      case 'price-drop': {
        const listing: DynamicDetails = details.listing || {};
        const price: DynamicDetails = listing.price || {};
        const location: DynamicDetails = listing.location || {};
        return (
          <div className="notification-content">
            {renderSpotlightMessageBox(normType, notification.message)}
            {listing.title ? (
              <div className="notification-listing-card">
                {listing.image && (
                  <div className="listing-image">
                    <img src={listing.image} alt={listing.title} />
                  </div>
                )}
                <div className="listing-content">
                  <h4>{listing.title}</h4>
                  {listing.subtitle && <p className="listing-subtitle">{listing.subtitle}</p>}
                  {price.old && price.new && (
                    <div className="price-comparison">
                      <div className="old-price">
                        <span className="price-label">Eski Fiyat</span>
                        <span className="price-value">
                          {Number(price.old).toLocaleString('tr-TR')} {price.currency || 'TRY'}
                        </span>
                      </div>
                      <div className="price-arrow">→</div>
                      <div className="new-price">
                        <span className="price-label">Yeni Fiyat</span>
                        <span className="price-value highlight">
                          {Number(price.new).toLocaleString('tr-TR')} {price.currency || 'TRY'}
                        </span>
                      </div>
                    </div>
                  )}
                  {(location.city || location.district) && (
                    <div className="listing-location">
                      <FaMapMarkerAlt />{' '}
                      {[location.city, location.district, location.neighborhood]
                        .filter(Boolean)
                        .join(', ')}
                    </div>
                  )}
                  {notification.actionLink && (
                    <div className="notification-actions">
                      <a href={notification.actionLink} className="btn-primary">
                        {notification.actionText || 'İlanı Görüntüle'}
                        <FaExternalLinkAlt />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              renderSmartBentoAndActions(normType, notification)
            )}
          </div>
        );
      }

      case 'listing-published': {
        const pl: DynamicDetails = details.listing || {};
        const ploc: DynamicDetails = pl.location || {};
        return (
          <div className="notification-content">
            {renderSpotlightMessageBox(normType, notification.message)}
            {pl.title ? (
              <div className="notification-listing-card">
                {pl.image && (
                  <div className="listing-image">
                    <img src={pl.image} alt={pl.title} />
                  </div>
                )}
                <div className="listing-content">
                  <h4>{pl.title}</h4>
                  {pl.price && (
                    <div className="listing-price">
                      {Number(pl.price).toLocaleString('tr-TR')} {pl.currency || 'TRY'}
                    </div>
                  )}
                  {(ploc.city || ploc.district) && (
                    <div className="listing-location">
                      <FaMapMarkerAlt />{' '}
                      {[ploc.city, ploc.district, ploc.neighborhood].filter(Boolean).join(', ')}
                    </div>
                  )}
                  {details.tips && details.tips.length > 0 && (
                    <div className="notification-tips">
                      <h5>İpuçları</h5>
                      <ul>
                        {(details.tips as string[]).map((tip, i) => (
                          <li key={i}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {notification.actionLink && (
                    <div className="notification-actions">
                      <a href={notification.actionLink} className="btn-primary">
                        {notification.actionText || 'İlanı Görüntüle'}
                        <FaExternalLinkAlt />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              renderSmartBentoAndActions(normType, notification)
            )}
          </div>
        );
      }

      case 'expiring-soon': {
        const el: DynamicDetails = details.listing || {};
        const eloc: DynamicDetails = el.location || {};
        const ropt: DynamicDetails[] = details.renewalOptions || [];
        return (
          <div className="notification-content">
            {renderSpotlightMessageBox(normType, notification.message)}
            {el.title ? (
              <div className="notification-listing-card">
                <div className="listing-content">
                  <div className="listing-header-with-badge">
                    <h4>{el.title}</h4>
                    {el.daysRemaining !== undefined && (
                      <div className="expiry-badge">
                        <span className="expiry-value">{el.daysRemaining}</span>
                        <span className="expiry-label">GÜN</span>
                      </div>
                    )}
                  </div>
                  {el.subtitle && <p className="listing-subtitle">{el.subtitle}</p>}
                  {(eloc.city || eloc.district) && (
                    <div className="listing-location">
                      <FaMapMarkerAlt /> {[eloc.city, eloc.district].filter(Boolean).join(', ')}
                    </div>
                  )}
                  {ropt.length > 0 && (
                    <div className="renewal-options">
                      {ropt.map((o, i) => (
                        <div
                          key={i}
                          className={`renewal-option ${o.recommended ? 'recommended' : ''}`}
                        >
                          <div className="option-label">{o.label}</div>
                          <div className="option-price">
                            {Number(o.price) > 0 ? `${o.price} ₺` : 'Ücretsiz'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {notification.actionLink && (
                    <div className="notification-actions">
                      <a href={notification.actionLink} className="btn-primary">
                        {notification.actionText || 'İlanı Yenile'}
                        <FaCheck />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              renderSmartBentoAndActions(normType, notification)
            )}
          </div>
        );
      }

      case 'system-update': {
        const upd: DynamicDetails = details.updateInfo || {};
        const mw: DynamicDetails = upd.maintenanceWindow || {};
        return (
          <div className="notification-content">
            {renderSpotlightMessageBox(normType, notification.message)}
            {upd.title ? (
              <>
                <div className="update-info">
                  <h4>{upd.title}</h4>
                  {upd.description && <p>{upd.description}</p>}
                  {upd.version && <p className="version-info">Versiyon: {upd.version}</p>}
                </div>
                {mw.start && (
                  <div className="maintenance-window">
                    <h5>Bakım Zamanı</h5>
                    <p>
                      {new Date(mw.start).toLocaleString('tr-TR')} -{' '}
                      {new Date(mw.end).toLocaleString('tr-TR')}
                    </p>
                    <p className="duration">Süre: {mw.duration}</p>
                  </div>
                )}
                {upd.affectedServices && upd.affectedServices.length > 0 && (
                  <div className="affected-services">
                    <h5>Etkilenecek Hizmetler</h5>
                    <ul>
                      {(upd.affectedServices as string[]).map((s, i) => (
                        <li key={i}>• {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {upd.newFeatures && upd.newFeatures.length > 0 && (
                  <div className="new-features">
                    <h5>Yeni Özellikler</h5>
                    <ul>
                      {(upd.newFeatures as string[]).map((f, i) => (
                        <li key={i}>• {f}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {details.warningNote && (
                  <div className="warning-note">
                    <p>{details.warningNote}</p>
                  </div>
                )}
              </>
            ) : (
              renderSmartBentoAndActions(normType, notification)
            )}
          </div>
        );
      }

      case 'new-favorite': {
        const fl: DynamicDetails = details.listing || {};
        const st: DynamicDetails = details.stats || {};
        const perf: DynamicDetails = details.performance || {};
        return (
          <div className="notification-content compact-notification">
            {renderSpotlightMessageBox(normType, notification.message)}
            {fl.title ? (
              <>
                <div className="notification-listing-card">
                  <div className="listing-content">
                    <h4>{fl.title}</h4>
                    {fl.category && <p className="listing-category">{fl.category}</p>}
                    {fl.price && (
                      <p className="listing-price">
                        {Number(fl.price).toLocaleString('tr-TR')} {fl.currency || 'TRY'}
                      </p>
                    )}
                  </div>
                </div>
                {(st.totalFavorites !== undefined || st.viewCount !== undefined) && (
                  <div className="notification-stats">
                    {st.totalFavorites !== undefined && (
                      <div className="stat-item">
                        <FaHeart /> <span>Toplam Favori: {st.totalFavorites}</span>
                      </div>
                    )}
                    {st.weeklyIncrease !== undefined && (
                      <div className="stat-item">
                        <FaChartLine /> <span>Haftalık Artış: +{st.weeklyIncrease}</span>
                      </div>
                    )}
                    {st.viewCount !== undefined && (
                      <div className="stat-item">
                        <FaEye /> <span>Görüntülenme: {st.viewCount}</span>
                      </div>
                    )}
                  </div>
                )}
                {perf.ranking && (
                  <div className="performance-info">
                    <p>Kategori Sıralaması: #{perf.ranking}</p>
                    {perf.compareToAverage && (
                      <p>Ortalamaya göre: %{Number(perf.compareToAverage) * 100} daha iyi</p>
                    )}
                  </div>
                )}
                {details.tips && details.tips.length > 0 && (
                  <div className="notification-tips">
                    <h5>İpuçları</h5>
                    <ul>
                      {(details.tips as string[]).map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {notification.link && (
                  <div className="notification-actions">
                    <a href={notification.link} className="btn-primary">
                      İlanı Görüntüle
                      <FaExternalLinkAlt />
                    </a>
                  </div>
                )}
              </>
            ) : (
              renderSmartBentoAndActions(normType, notification)
            )}
          </div>
        );
      }

      case 'new-message': {
        const conv: DynamicDetails = details.conversation || {};
        const sender: DynamicDetails = conv.sender || {};
        const ml: DynamicDetails = conv.listing || {};
        const messageHref = getRelevantMessageHref(notification, sender.name);

        return (
          <div className="notification-content compact-notification">
            {renderSpotlightMessageBox(normType, notification.message)}
            {sender.name || ml.title ? (
              <>
                {sender.name && (
                  <div className="sender-info">
                    {sender.avatar ? (
                      <img src={sender.avatar} alt={sender.name} className="sender-avatar" />
                    ) : (
                      <div className="nd-bento-avatar">{getInitials(sender.name)}</div>
                    )}
                    <div className="sender-details">
                      <h4>
                        {sender.name}
                        {sender.verified && (
                          <span className="verified-icon" title="Doğrulanmış kullanıcı">
                            ✓
                          </span>
                        )}
                      </h4>
                      {sender.responseTime && <p className="response-time">{sender.responseTime}</p>}
                    </div>
                  </div>
                )}
                {ml.title && (
                  <div className="notification-listing-card">
                    {ml.image && (
                      <div className="listing-image">
                        <img src={ml.image} alt={ml.title} />
                      </div>
                    )}
                    <div className="listing-content">
                      <h4>{ml.title}</h4>
                      {ml.price && (
                        <p className="listing-price">
                          {Number(ml.price).toLocaleString('tr-TR')} ₺
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {conv.messagePreview && (
                  <div className="message-preview">
                    <p>{conv.messagePreview}</p>
                  </div>
                )}
                <div className="notification-actions">
                  <a
                    href={notification.actionLink || messageHref}
                    className="btn-primary"
                    onClick={() => handleOpenRelevantMessage(sender.name)}
                  >
                    <span>{notification.actionText || 'İlgili Mesaja Git'}</span>
                    <FaArrowRight />
                  </a>
                </div>
              </>
            ) : (
              renderSmartBentoAndActions(normType, notification)
            )}
          </div>
        );
      }

      case 'seller-review': {
        const rev: DynamicDetails = details.review || {};
        const reviewer: DynamicDetails = rev.reviewer || {};
        const txn: DynamicDetails = rev.transaction || {};
        const txnl: DynamicDetails = txn?.listing || {};
        const ss: DynamicDetails = details.sellerStats || {};
        return (
          <div className="notification-content compact-notification">
            {renderSpotlightMessageBox(normType, notification.message)}
            {reviewer.name || rev.rating ? (
              <>
                {reviewer.name && (
                  <div className="sender-info">
                    <div className="sender-avatar-default">
                      <FaUser />
                    </div>
                    <div className="sender-details">
                      <h4>{maskReviewerName(reviewer.name)}</h4>
                      {reviewer.memberSince && <p>Üye: {reviewer.memberSince}</p>}
                    </div>
                  </div>
                )}
                {rev.rating && (
                  <div className="rating-display">
                    <span className="rating-value">{rev.rating}/5</span>
                    <div className="rating-stars" aria-label={`${rev.rating} yıldız`}>
                      {Array.from({ length: 5 }).map((_, idx) =>
                        idx < Number(rev.rating) ? (
                          <FaStar key={idx} className="nd-star nd-star--filled" />
                        ) : (
                          <FaRegStar key={idx} className="nd-star nd-star--empty" />
                        )
                      )}
                    </div>
                  </div>
                )}
                {rev.comment && (
                  <div className="review-comment">
                    <p>{rev.comment}</p>
                  </div>
                )}
                {txnl.title && (
                  <div className="notification-listing-card">
                    <div className="listing-content">
                      <h4>{txnl.title}</h4>
                      {txnl.category && <p className="listing-category">{txnl.category}</p>}
                      {txnl.soldPrice && (
                        <p className="listing-price">
                          Satış Fiyatı: {Number(txnl.soldPrice).toLocaleString('tr-TR')} ₺
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {ss.averageRating && (
                  <div className="seller-stats">
                    <h5>Satıcı İstatistikleri</h5>
                    <p>Ortalama Puan: {ss.averageRating}/5</p>
                    <p>Toplam Değerlendirme: {ss.totalReviews}</p>
                  </div>
                )}
                {notification.link && (
                  <div className="notification-actions">
                    <a href={notification.link} className="btn-primary">
                      Tüm Değerlendirmeleri Görüntüle
                      <FaExternalLinkAlt />
                    </a>
                  </div>
                )}
              </>
            ) : (
              renderSmartBentoAndActions(normType, notification)
            )}
          </div>
        );
      }

      case 'listing-expired': {
        const expl: DynamicDetails = details.listing || {};
        const exps: DynamicDetails = expl.stats || {};
        const ropt2: DynamicDetails[] = details.renewalOptions || [];
        const perfr: DynamicDetails = details.performanceReport || {};
        return (
          <div className="notification-content">
            {renderSpotlightMessageBox(normType, notification.message)}
            {expl.title ? (
              <>
                <div className="notification-listing-card">
                  {expl.image && (
                    <div className="listing-image">
                      <img src={expl.image} alt={expl.title} />
                    </div>
                  )}
                  <div className="listing-content">
                    <h4>{expl.title}</h4>
                    {expl.category && <p className="listing-category">{expl.category}</p>}
                    {expl.price && (
                      <p className="listing-price">
                        {Number(expl.price).toLocaleString('tr-TR')} ₺
                      </p>
                    )}
                  </div>
                </div>
                {exps && (
                  <div className="listing-stats">
                    {exps.totalViews !== undefined && (
                      <span className="listing-stat-item">
                        <FaEye /> {exps.totalViews} görüntülenme
                      </span>
                    )}
                    {exps.totalFavorites !== undefined && (
                      <span className="listing-stat-item">
                        <FaHeart /> {exps.totalFavorites} favori
                      </span>
                    )}
                    {exps.totalContacts !== undefined && (
                      <span className="listing-stat-item">
                        <FaPhoneAlt /> {exps.totalContacts} iletişim
                      </span>
                    )}
                  </div>
                )}
                {ropt2.length > 0 && (
                  <div className="renewal-options">
                    {ropt2.map((o, i) => (
                      <div key={i} className={`renewal-option ${o.recommended ? 'recommended' : ''}`}>
                        <div className="option-label">{o.label}</div>
                        {o.description && (
                          <div className="option-description">{o.description}</div>
                        )}
                        <div className="option-price">
                          {Number(o.price) > 0 ? `${o.price} ₺` : 'Ücretsiz'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {perfr && (
                  <div className="performance-report">
                    <h5>Performans Raporu</h5>
                    {perfr.viewsPerDay && <p>Günlük görüntülenme: {perfr.viewsPerDay}</p>}
                    {perfr.conversionRate && <p>Dönüşüm oranı: %{perfr.conversionRate}</p>}
                    {perfr.compareToCategory && <p>{perfr.compareToCategory}</p>}
                  </div>
                )}
                {notification.actionLink && (
                  <div className="notification-actions">
                    <a href={notification.actionLink} className="btn-primary">
                      {notification.actionText || 'İlanı Yenile'}
                      <FaCheck />
                    </a>
                  </div>
                )}
              </>
            ) : (
              renderSmartBentoAndActions(normType, notification)
            )}
          </div>
        );
      }

      default:
        return (
          <div className="notification-content">
            {renderSpotlightMessageBox(normType, notification.message)}
            {renderSmartBentoAndActions(normType, notification)}
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="notification-detail">
        <div className="notification-detail-content">
          <div className="nd-loading-state">
            <div className="nd-spinner" />
            <p>Bildirim detayları yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!notification) {
    return (
      <div className="notification-error-page">
        <svg className="error-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.18" />
          <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <h1>Bildirim Bulunamadı</h1>
        <p>Aradığınız bildirim bulunamadı. Bildirim silinmiş olabilir veya bağlantı geçersiz olabilir.</p>
        <div className="error-actions">
          <button
            className="error-btn-primary"
            onClick={() => {
              window.location.href = '/dashboard/bildirimler';
            }}
          >
            <FaList /> Tüm Bildirimlere Dön
          </button>
          <button className="error-btn-secondary" onClick={() => history.back()}>
            Geri Git
          </button>
        </div>
      </div>
    );
  }

  const normType = normalizeNotificationType(
    notification.type,
    notification.title,
    notification.message
  );
  const fullHeaderLower = toTrLower(`${notification.title || ''} ${notification.message || ''}`);
  const isCompletedHeader =
    normType === 'appointment-request' && fullHeaderLower.includes('tamamland');
  const isCancelledHeader =
    normType === 'appointment-request' &&
    !isCompletedHeader &&
    (fullHeaderLower.includes('iptal') ||
      fullHeaderLower.includes('reddedildi') ||
      fullHeaderLower.includes('reddetti') ||
      fullHeaderLower.includes('red edildi'));
  const visualType = isCompletedHeader
    ? 'appointment-completed'
    : isCancelledHeader
    ? 'appointment-cancelled'
    : normType;

  return (
    <div className="notification-detail">
      {/* Üst Navigasyon Barı */}
      <div className="notification-detail-header">
        <div className="detail-actions">
          <button
            type="button"
            className="notifications-button"
            onClick={() => {
              window.location.href = '/dashboard/bildirimler';
            }}
          >
            <FaArrowLeft />
            <span>Bildirimlere Dön</span>
          </button>
        </div>

        <div className="nd-header-badges">
          <span className="nd-read-pill">
            <FaCheckCircle />
            <span>Okundu</span>
          </span>
        </div>
      </div>

      {/* Ana Bildirim Detay Kartı (Şeritsiz, Canlı Kurumsal Tasarım) */}
      <div className="notification-detail-content">
        <div className={`notification-detail-info notification-detail-info--${visualType}`}>
          <div className="nd-title-row">
            <div className={`title-icon title-icon--${visualType}`}>
              {isCompletedHeader ? (
                <FaCheckCircle />
              ) : isCancelledHeader ? (
                <FaTimesCircle />
              ) : (
                renderTypeVectorIcon(normType)
              )}
            </div>
            <div className="nd-title-copy">
              <div className="notification-meta">
                <span className={`notification-type ${visualType}`}>
                  {getNotificationTypeLabel(
                    notification.type,
                    notification.title,
                    notification.message
                  )}
                </span>
                <span className="notification-date">
                  <FaRegClock />
                  <span>{formatDate(null, notification)}</span>
                </span>
              </div>
              <h1>{notification.title}</h1>
            </div>
          </div>
        </div>

        <div className="notification-message">{renderNotificationContent()}</div>
      </div>
    </div>
  );
};

export default DashboardNotificationDetailPage;
