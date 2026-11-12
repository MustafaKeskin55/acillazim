"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import './DashboardMessages.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPhone, 
  faLocationDot, 
  faEllipsisVertical, 
  faArrowLeft,
  faPaperPlane,
  faSearch,
  faCheckDouble,
  faArrowUpRightFromSquare,
  faComments,
  faTrash,
  faFlag,
  faTag,
  faCircleCheck,
  faShieldHalved
} from '@fortawesome/free-solid-svg-icons';
import * as messageService from '@/services/message/messageService';
import authService from '@/services/auth/authService';
import toast from 'react-hot-toast';

interface Conversation {
  conversation_id: number;
  from_user_id: unknown;
  to_user_id: unknown;
  listing_id?: unknown;
  timestamp?: string;
  isRead?: boolean;
  sender?: string | null;
  senderId?: unknown;
  title?: string | null;
  image?: string | null;
  price?: string | null;
  lastMessage?: string | null;
  date?: string;
  phone?: string;
}

interface ChatMessage {
  id: unknown;
  content: string;
  timestamp: string;
  sender: 'buyer' | 'seller';
  type: 'text' | 'price';
}

type MsgSvc = {
  getConversations: () => Promise<Conversation[]>;
  getUserById: (id: unknown) => Promise<{ name?: string; avatar?: string; phone?: string } | null>;
  getListingById: (id: unknown) => Promise<{ title?: string; image?: string; price?: string; id?: unknown } | null>;
  getMessagesByConversationId: (id: number) => Promise<Array<{ message_id: unknown; content: string; timestamp: string; sender_id: unknown }>>;
  markConversationAsRead: (id: number) => Promise<void>;
  markAllConversationsAsRead?: (conversationIds?: Array<number | string>) => Promise<boolean>;
  sendMessage: (id: number, content: string) => Promise<{ message_id: unknown; content: string; timestamp: string }>;
  deleteConversation: (id: number) => Promise<void>;
  reportMessage: (id: number, reason: string) => Promise<void>;
};

type AuthSvc = { getCurrentUser: () => { id?: unknown; user_id?: unknown; userId?: unknown } | null };

/**
 * Türkçe karakter bozulmalarını (ör. Bak??m?? -> Bakımı) temizler
 */
export const cleanTurkishText = (str?: string | null): string => {
  if (!str) return '';
  return str
    .replace(/\?\?/g, 'ı')
    .replace(/Bak\?m/g, 'Bakım')
    .replace(/Temizli\?i/g, 'Temizliği')
    .replace(/Sa\?l\?k/g, 'Sağlık')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Fiyat biçimlendirme
 */
export const formatPrice = (price?: string | null): string => {
  if (!price) return 'Fiyat Belirtilmemiş';
  const clean = String(price).trim();
  if (clean.includes('TL') || clean.includes('₺')) return clean;
  const num = parseFloat(clean.replace(/[^0-9.-]+/g, ''));
  if (!isNaN(num)) {
    return new Intl.NumberFormat('tr-TR').format(num) + ' TL';
  }
  return clean;
};

const QUICK_PROMPTS = [
  "👋 Merhaba, ilan hala güncel mi?",
  "💰 Son fiyatta pazarlık payı var mı?",
  "📍 Ürünü nereden teslim alabilirim?",
  "📞 Görüşmek için uygun bir zamanınız var mı?"
];

const Messaging: React.FC = () => {
  const params = useParams();
  const chatId = params?.chatId as string | undefined;

  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [messages, setMessages] = useState<Conversation[]>([]);
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isMobile, setIsMobile] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  const [showChat, setShowChat] = useState<boolean>(!isMobile || Boolean(chatId));
  const [showOptionsDropdown, setShowOptionsDropdown] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [messageToDelete, setMessageToDelete] = useState<Conversation | null>(null);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [messageToReport, setMessageToReport] = useState<Conversation | null>(null);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const svc = messageService as unknown as MsgSvc;
  const authSvc = authService as unknown as AuthSvc;

  useEffect(() => { 
    document.title = 'Mesajlar | AcilLazım'; 
  }, []);

  // Dropdown dışına tıklanınca kapat
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowOptionsDropdown(false);
      }
    };
    if (showOptionsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showOptionsDropdown]);

  // Konuşmaları yükle
  useEffect(() => {
    let isMounted = true;

    const loadConversations = async () => {
      try {
        const rawConversations = await svc.getConversations();
        const currentUser = authSvc.getCurrentUser();
        const currentUserId = currentUser?.id || currentUser?.user_id || currentUser?.userId;
        if (!currentUserId) { 
          if (isMounted) setMessages([]); 
          return; 
        }

        const enriched: Conversation[] = await Promise.all(
          (rawConversations || []).map(async (conv): Promise<Conversation> => {
            const isSender = String(conv.from_user_id) === String(currentUserId);
            const otherUserId = isSender ? conv.to_user_id : conv.from_user_id;

            let user: { name?: string; avatar?: string; phone?: string } | null = null;
            let listing: { title?: string; image?: string; price?: string; id?: unknown } | null = null;
            let lastMessageContent: string | null = null;

            try {
              const [u, l, msgs] = await Promise.all([
                svc.getUserById(otherUserId),
                conv.listing_id ? svc.getListingById(conv.listing_id) : Promise.resolve(null),
                svc.getMessagesByConversationId(conv.conversation_id),
              ]);
              user = u;
              listing = l;
              if (msgs && msgs.length > 0) {
                lastMessageContent = msgs[msgs.length - 1].content;
              }
            } catch {
              /* ignore individual enrich errors */
            }

            return {
              ...conv,
              sender: user?.name || (conv as any).participantName || 'Kullanıcı',
              senderId: otherUserId,
              phone: user?.phone || (conv as any).phone || '',
              title: listing?.title || (conv as any).listingTitle || 'İlan',
              image: listing?.image || user?.avatar || (conv as any).participantAvatar || null,
              price: listing?.price || null,
              lastMessage: lastMessageContent || (conv as any).lastMessage || null,
              date: conv.timestamp ? new Date(conv.timestamp).toLocaleDateString('tr-TR') : new Date().toLocaleDateString('tr-TR'),
            };
          })
        );

        if (!isMounted) return;

        // Context kontrolü: İlandan yönlenmişsek ve listede bu konuşma henüz yoksa
        let threadContext: any = null;
        try {
          const rawCtx = sessionStorage.getItem('message_thread_context');
          if (rawCtx) threadContext = JSON.parse(rawCtx);
        } catch {
          /* ignore */
        }

        let finalMessages: Conversation[] = [...enriched];
        let targetChatToSelect: Conversation | null = null;

        if (chatId) {
          const found = finalMessages.find((c) => String(c.conversation_id) === String(chatId));
          if (found) {
            targetChatToSelect = found;
          } else if (threadContext && String(threadContext.conversation_id) === String(chatId)) {
            // Henüz mesaj gönderilmemiş yeni konuşma taslağı
            const placeholder: Conversation = {
              conversation_id: Number(chatId),
              from_user_id: currentUserId,
              to_user_id: threadContext.seller_id,
              listing_id: threadContext.listing_id,
              title: threadContext.listingInfo?.title || 'İlan',
              price: threadContext.listingInfo?.price || '',
              image: threadContext.listingInfo?.image || null,
              sender: threadContext.sellerName || 'İlan Sahibi',
              phone: threadContext.sellerPhone || '',
              isRead: true,
              lastMessage: 'Sohbet başlatıldı',
              timestamp: new Date().toISOString(),
              date: new Date().toLocaleDateString('tr-TR'),
            };
            finalMessages = [placeholder, ...finalMessages];
            targetChatToSelect = placeholder;
          }
        }

        // Bildirim detayından yönlendirilmişse ilgili konuşmayı otomatik seç
        if (!targetChatToSelect && typeof window !== 'undefined' && finalMessages.length > 0) {
          try {
            const urlParams = new URLSearchParams(window.location.search);
            const senderParam = urlParams.get('sender');
            const rawNotifCtx = sessionStorage.getItem('open_conversation_from_notification');
            const notifCtx = rawNotifCtx ? JSON.parse(rawNotifCtx) : null;
            if (rawNotifCtx) {
              sessionStorage.removeItem('open_conversation_from_notification');
            }

            const targetConvId = notifCtx?.conversationId || urlParams.get('conv');
            const targetSender = (notifCtx?.senderName || senderParam || '').trim().toLowerCase();

            if (targetConvId) {
              targetChatToSelect =
                finalMessages.find((c) => String(c.conversation_id) === String(targetConvId)) || null;
            }
            if (!targetChatToSelect && targetSender) {
              targetChatToSelect =
                finalMessages.find((c) =>
                  (c.sender || '').toLowerCase().includes(targetSender)
                ) || null;
            }
            if (!targetChatToSelect && notifCtx) {
              targetChatToSelect =
                finalMessages.find((c) => !c.isRead) || finalMessages[0] || null;
            }
          } catch {
            /* ignore */
          }
        }

        setMessages(finalMessages);

        if (targetChatToSelect) {
          setSelectedChat(targetChatToSelect);
          setShowChat(true);
        }
      } catch (err) {
        console.error('Konuşmalar yüklenirken hata:', err);
        if (isMounted) setMessages([]);
      }
    };

    loadConversations();
    return () => { isMounted = false; };
  }, [chatId]);

  // Seçili konuşmanın mesajlarını yükle
  useEffect(() => {
    let isMounted = true;
    const loadChatMessages = async () => {
      if (!selectedChat) return;
      try {
        setLoadingMessages(true);
        const msgs = await svc.getMessagesByConversationId(selectedChat.conversation_id);
        const currentUser = authSvc.getCurrentUser();
        const currentUserId = currentUser?.id || currentUser?.user_id || currentUser?.userId;

        if (!isMounted) return;
        if (!currentUserId) { 
          setChatMessages([]); 
          return; 
        }

        const mapped: ChatMessage[] = (msgs || []).map((msg) => ({
          id: msg.message_id,
          content: msg.content,
          timestamp: msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '',
          sender: String(msg.sender_id) === String(currentUserId) ? 'buyer' : 'seller',
          type: (msg.content && msg.content.includes('TL')) ? 'price' : 'text',
        }));

        setChatMessages(mapped);
      } catch {
        if (isMounted) setChatMessages([]);
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    };

    loadChatMessages();
    return () => { isMounted = false; };
  }, [selectedChat]);

  // Yeni mesaj geldiğinde sadece mesaj alanını aşağı kaydır (sayfa gövdesini veya üst barı yukarı kaydırmaz)
  useEffect(() => {
    if (messagesScrollRef.current) {
      messagesScrollRef.current.scrollTop = messagesScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Responsive pencere boyutu dinleyicisi
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setShowChat(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleChatSelect = async (conversation: Conversation) => {
    setSelectedChat(conversation);
    if (isMobile) setShowChat(true);

    if (!conversation.isRead) {
      try {
        await svc.markConversationAsRead(conversation.conversation_id);
        setMessages((prev) =>
          prev.map((m) =>
            m.conversation_id === conversation.conversation_id ? { ...m, isRead: true } : m
          )
        );
      } catch {
        /* ignore */
      }
    }
    window.history.replaceState(null, '', `/dashboard/mesajlar/${conversation.conversation_id}`);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const messageText = newMessage.trim();
    if (!messageText || !selectedChat) return;

    try {
      const sent = await svc.sendMessage(selectedChat.conversation_id, messageText);
      const newMsgId = sent?.message_id || Date.now();
      const newMsgTimestamp = sent?.timestamp || new Date().toISOString();

      const newChatMessage: ChatMessage = {
        id: newMsgId,
        content: messageText,
        timestamp: new Date(newMsgTimestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        sender: 'buyer',
        type: 'text',
      };

      setChatMessages((prev) => [...prev, newChatMessage]);
      setNewMessage('');

      // Sol listedeki son mesajı güncelle
      setMessages((prev) =>
        prev.map((m) =>
          m.conversation_id === selectedChat.conversation_id
            ? { ...m, lastMessage: messageText, date: new Date().toLocaleDateString('tr-TR') }
            : m
        )
      );
    } catch (err) {
      console.error('Mesaj gönderilemedi:', err);
      alert('Mesaj gönderilemedi. Lütfen tekrar deneyin.');
    }
  };

  const handleQuickSend = (text: string) => {
    setNewMessage(text);
  };

  const handlePhoneCall = (phoneNumber?: string) => { 
    if (!phoneNumber) {
      alert('Telefon numarası bulunamadı.');
      return;
    }
    window.location.href = `tel:${phoneNumber}`; 
  };

  const handleLocation = () => { 
    window.open(`https://www.google.com/maps?q=41.0082,28.9784`, '_blank'); 
  };

  const handleBack = () => { 
    setShowChat(false); 
    setSelectedChat(null); 
    window.history.replaceState(null, '', '/dashboard/mesajlar'); 
  };

  const getFilteredMessages = () => {
    if (!messages || !Array.isArray(messages)) return [];
    let list = messages;
    if (activeTab === 'unread') {
      list = list.filter((m) => !m.isRead);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((m) => 
        (m.title && cleanTurkishText(m.title).toLowerCase().includes(q)) ||
        (m.sender && m.sender.toLowerCase().includes(q)) ||
        (m.lastMessage && m.lastMessage.toLowerCase().includes(q))
      );
    }
    return list;
  };

  const handleDeleteMessage = async () => {
    if (!messageToDelete) return;
    try {
      await svc.deleteConversation(messageToDelete.conversation_id);
      setMessages((prev) => prev.filter((m) => m.conversation_id !== messageToDelete.conversation_id));
      setSelectedChat(null); 
      setChatMessages([]);
      if (isMobile) setShowChat(false);
      setShowDeleteModal(false); 
      setMessageToDelete(null);
      window.history.replaceState(null, '', '/dashboard/mesajlar');
    } catch { 
      alert('Konuşma silinemedi. Lütfen tekrar deneyin.'); 
    }
  };

  const handleReportMessage = async () => {
    if (!messageToReport) return;
    try {
      await svc.reportMessage(messageToReport.conversation_id, 'Uygunsuz içerik');
      setShowReportModal(false); 
      setMessageToReport(null);
      alert('Mesaj moderatörlere bildirildi.');
    } catch { 
      alert('Mesaj raporlanırken bir hata oluştu.'); 
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadConvs = messages.filter((m) => !m.isRead);
    if (unreadConvs.length === 0) {
      toast.success('Okunmamış mesajınız bulunmuyor');
      return;
    }

    try {
      setIsMarkingAllRead(true);
      const unreadIds = unreadConvs.map((m) => m.conversation_id);

      // Optimistik güncelleme: UI anında tümünü okundu olarak yansıtsın
      setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
      if (selectedChat && !selectedChat.isRead) {
        setSelectedChat((prev) => (prev ? { ...prev, isRead: true } : null));
      }

      // Backend çağrısı
      if (svc.markAllConversationsAsRead) {
        await svc.markAllConversationsAsRead(unreadIds);
      } else {
        await Promise.allSettled(
          unreadIds.map((id) => svc.markConversationAsRead(Number(id)))
        );
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('messagesUpdated', { detail: { count: 0 } }));
      }

      toast.success('Tüm mesajlar okundu olarak işaretlendi');
    } catch (err) {
      console.error('Tümünü okundu işaretleme hatası:', err);
      toast.error('İşlem sırasında bir hata oluştu');
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const unreadCount = messages.filter((m) => !m.isRead).length;

  // İsimden baş harfleri türet
  const getInitials = (name?: string | null) => {
    if (!name) return 'K';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="modern-messenger-root">
      {/* SOL PANEL: Konuşmalar Listesi */}
      {(!isMobile || !showChat) && (
        <aside className="messenger-sidebar">
          {/* Sidebar Başlık */}
          <div className="sidebar-top-header">
            <div className="sidebar-title-row">
              <div className="sidebar-title-group">
                <h1 className="sidebar-main-title">Mesajlar</h1>
                {unreadCount > 0 && (
                  <span className="sidebar-unread-pill">{unreadCount} Okunmamış</span>
                )}
              </div>
              <button
                type="button"
                className="sidebar-mark-all-read-btn"
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0 || isMarkingAllRead}
                title={unreadCount > 0 ? "Tüm mesajları okundu olarak işaretle" : "Okunmamış mesaj yok"}
              >
                <FontAwesomeIcon icon={faCheckDouble} className="mark-read-icon" />
                <span className="mark-read-text">
                  {isMarkingAllRead ? 'İşleniyor...' : 'Tümünü Okundu Say'}
                </span>
              </button>
            </div>

            {/* Arama Barı */}
            <div className="sidebar-search-container">
              <FontAwesomeIcon icon={faSearch} className="search-icon" />
              <input
                type="text"
                placeholder="Konuşma veya ilan ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button className="search-clear-btn" onClick={() => setSearchQuery('')}>×</button>
              )}
            </div>

            {/* Sekmeler */}
            <div className="sidebar-tab-pills">
              <button
                type="button"
                className={`tab-pill-btn ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                Tümü ({messages.length})
              </button>
              <button
                type="button"
                className={`tab-pill-btn ${activeTab === 'unread' ? 'active' : ''}`}
                onClick={() => setActiveTab('unread')}
              >
                Okunmamış {unreadCount > 0 && `(${unreadCount})`}
              </button>
            </div>
          </div>

          {/* Konuşmalar Listesi */}
          <div className="conversations-list-container">
            {getFilteredMessages().length > 0 ? (
              getFilteredMessages().map((conv) => {
                const isSelected = selectedChat?.conversation_id === conv.conversation_id;
                const cleanListingTitle = cleanTurkishText(conv.title) || 'İlan Başlığı';
                return (
                  <div
                    key={String(conv.conversation_id)}
                    className={`conversation-card ${isSelected ? 'selected' : ''} ${!conv.isRead ? 'unread' : ''}`}
                    onClick={() => handleChatSelect(conv)}
                  >
                    {/* Profil / İlan Avatarı */}
                    <div className="conversation-avatar-box">
                      {conv.image ? (
                        <img 
                          src={conv.image} 
                          alt={conv.sender || 'Kullanıcı'} 
                          className="conv-avatar-img" 
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/100?text=İlan';
                          }}
                        />
                      ) : (
                        <div className="conv-avatar-fallback">
                          {getInitials(conv.sender)}
                        </div>
                      )}
                      {!conv.isRead && <span className="conv-unread-dot" />}
                    </div>

                    {/* Metin Bilgileri */}
                    <div className="conversation-text-box">
                      <div className="conv-header-row">
                        <span className="conv-sender-name">{conv.sender || 'Kullanıcı'}</span>
                        <span className="conv-date-text">{conv.date || ''}</span>
                      </div>

                      <div className="conv-listing-row">
                        <FontAwesomeIcon icon={faTag} className="listing-tag-icon" />
                        <span className="conv-listing-title">{cleanListingTitle}</span>
                      </div>

                      <div className="conv-preview-row">
                        <p className="conv-last-message">{conv.lastMessage || 'Henüz mesaj yok'}</p>
                        {Boolean(conv.price) && (
                          <span className="conv-price-badge">{formatPrice(conv.price)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="conversations-empty-box">
                <FontAwesomeIcon icon={faComments} className="empty-icon" />
                <p className="empty-title">
                  {searchQuery 
                    ? 'Aramanıza uygun mesaj bulunamadı' 
                    : activeTab === 'unread' 
                    ? 'Okunmamış mesajınız bulunmuyor' 
                    : 'Henüz mesajlaşmanız bulunmuyor'}
                </p>
                <span className="empty-subtext">
                  İlan detay sayfalarındaki &quot;Mesaj Gönder&quot; butonuna basarak ilan sahipleriyle sohbet başlatabilirsiniz.
                </span>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* SAĞ PANEL: Aktif Konuşma Alanı */}
      {(!isMobile || showChat) && (
        <main className="messenger-chat-pane">
          {selectedChat ? (
            <div className="chat-active-wrapper">
              {/* 1. ÜST BAŞLIK BAR: Kullanıcı Bilgisi ve Aksiyonlar */}
              <header className="chat-main-header">
                <div className="header-user-side">
                  {isMobile && (
                    <button className="chat-back-btn" onClick={handleBack} title="Geri">
                      <FontAwesomeIcon icon={faArrowLeft} />
                    </button>
                  )}
                  
                  <div className="header-avatar-circle">
                    {selectedChat.image ? (
                      <img 
                        src={selectedChat.image} 
                        alt={selectedChat.sender || 'Kullanıcı'} 
                        className="header-avatar-img"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/100?text=Kullanıcı';
                        }}
                      />
                    ) : (
                      <div className="header-avatar-fallback">
                        {getInitials(selectedChat.sender)}
                      </div>
                    )}
                    <span className="header-status-dot online" />
                  </div>

                  <div className="header-user-meta">
                    <div className="header-sender-name">
                      {selectedChat.sender || 'Kullanıcı'}
                      <span className="badge-verified" title="Doğrulanmış Üye">
                        <FontAwesomeIcon icon={faCircleCheck} />
                      </span>
                    </div>
                    <div className="header-user-sub">
                      <span className="status-text">İlan Sahibi • Çevrimiçi</span>
                    </div>
                  </div>
                </div>

                {/* Sağ Butonlar Grubu: Asla başlığın üstüne binmez */}
                <div className="header-actions-group" ref={dropdownRef}>
                  {Boolean(selectedChat.phone) && (
                    <button 
                      className="chat-action-btn phone" 
                      title="Telefonla Ara" 
                      onClick={() => handlePhoneCall(selectedChat.phone)}
                    >
                      <FontAwesomeIcon icon={faPhone} />
                      <span className="action-btn-label">Ara</span>
                    </button>
                  )}

                  <button 
                    className="chat-action-btn" 
                    title="Konumu Gör" 
                    onClick={handleLocation}
                  >
                    <FontAwesomeIcon icon={faLocationDot} />
                  </button>

                  <button 
                    className="chat-action-btn menu" 
                    title="Seçenekler" 
                    onClick={() => setShowOptionsDropdown(!showOptionsDropdown)}
                  >
                    <FontAwesomeIcon icon={faEllipsisVertical} />
                  </button>

                  {/* Dropdown Menü */}
                  {showOptionsDropdown && (
                    <div className="options-dropdown-menu">
                      {Boolean(selectedChat.listing_id) && (
                        <a 
                          href={'/ilan/' + String(selectedChat.listing_id)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="dropdown-item-link"
                          onClick={() => setShowOptionsDropdown(false)}
                        >
                          <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                          İlanı Görüntüle
                        </a>
                      )}
                      {unreadCount > 0 && (
                        <button 
                          type="button"
                          className="dropdown-item-btn" 
                          onClick={() => {
                            setShowOptionsDropdown(false);
                            handleMarkAllAsRead();
                          }}
                        >
                          <FontAwesomeIcon icon={faCheckDouble} />
                          Tümünü Okundu Say
                        </button>
                      )}
                      <button 
                        className="dropdown-item-btn" 
                        onClick={() => {
                          setShowOptionsDropdown(false);
                          setMessageToDelete(selectedChat);
                          setShowDeleteModal(true);
                        }}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                        Konuşmayı Sil
                      </button>
                      <button 
                        className="dropdown-item-btn danger" 
                        onClick={() => {
                          setShowOptionsDropdown(false);
                          setMessageToReport(selectedChat);
                          setShowReportModal(true);
                        }}
                      >
                        <FontAwesomeIcon icon={faFlag} />
                        Şikayet Et
                      </button>
                    </div>
                  )}
                </div>
              </header>

              {/* 2. SABİTLENMİŞ İLAN BİLGİ ŞERİDİ (Sahibinden Tarzı) */}
              <div className="chat-pinned-listing-bar">
                <div className="listing-bar-left">
                  <div className="listing-bar-img-box">
                    <img 
                      src={selectedChat.image || 'https://via.placeholder.com/80?text=İlan'} 
                      alt={cleanTurkishText(selectedChat.title)} 
                      className="listing-bar-thumb"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/80?text=İlan';
                      }}
                    />
                  </div>
                  <div className="listing-bar-details">
                    <h2 className="listing-bar-title" title={cleanTurkishText(selectedChat.title)}>
                      {cleanTurkishText(selectedChat.title) || 'İlan Başlığı'}
                    </h2>
                    <div className="listing-bar-price">
                      {formatPrice(selectedChat.price)}
                    </div>
                  </div>
                </div>

                {Boolean(selectedChat.listing_id) && (
                  <div className="listing-bar-right">
                    <a 
                      href={'/ilan/' + String(selectedChat.listing_id)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="listing-goto-btn"
                    >
                      <span>İlana Git</span>
                      <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                    </a>
                  </div>
                )}
              </div>

              {/* 3. MESAJLAR AKIŞI */}
              <div className="chat-messages-scroll-area" ref={messagesScrollRef}>
                <div className="chat-security-notice">
                  <FontAwesomeIcon icon={faShieldHalved} />
                  <span>Güvenliğiniz için ödemelerinizi ve kişisel bilgilerinizi koruyunuz. Şüpheli durumları bildirebilirsiniz.</span>
                </div>

                {loadingMessages ? (
                  <div className="messages-loading-state">
                    <div className="spinner-bubble" />
                    <span>Mesajlar yükleniyor...</span>
                  </div>
                ) : chatMessages.length > 0 ? (
                  <div className="messages-stream">
                    {chatMessages.map((msg) => {
                      const isMe = msg.sender === 'buyer';
                      return (
                        <div key={String(msg.id)} className={`message-row ${isMe ? 'sent' : 'received'}`}>
                          <div className={`message-bubble ${isMe ? 'bubble-sent' : 'bubble-received'}`}>
                            <p className="message-text">{msg.content}</p>
                            <div className="message-meta">
                              <span className="message-time">{msg.timestamp}</span>
                              {isMe && <FontAwesomeIcon icon={faCheckDouble} className="msg-check-icon" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  /* Henüz mesaj yok - Şık Karşılama ve Hızlı Çipler */
                  <div className="chat-welcome-empty">
                    <div className="welcome-icon-box">
                      <FontAwesomeIcon icon={faComments} />
                    </div>
                    <h3 className="welcome-title">
                      {selectedChat.sender ? `${selectedChat.sender} ile sohbeti başlatın` : 'Sohbeti Başlatın'}
                    </h3>
                    <p className="welcome-subtitle">
                      İlan hakkında soru sorabilir, pazarlık yapabilir veya teslimat detaylarını kararlaştırabilirsiniz.
                    </p>

                    {/* Hızlı Mesaj Önerileri */}
                    <div className="quick-suggestions-box">
                      <span className="suggestions-label">Hızlı Mesaj Gönder:</span>
                      <div className="chips-grid">
                        {QUICK_PROMPTS.map((prompt, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="suggestion-chip"
                            onClick={() => handleQuickSend(prompt)}
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* 4. MESAJ YAZMA FORMU */}
              <div className="chat-bottom-input-bar">
                <form onSubmit={handleSendMessage} className="chat-input-form">
                  <input
                    type="text"
                    className="chat-text-input"
                    placeholder="Mesajınızı buraya yazın..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    autoFocus={!isMobile}
                  />
                  <button
                    type="submit"
                    className="chat-send-btn"
                    disabled={!newMessage.trim()}
                    title="Gönder"
                  >
                    <FontAwesomeIcon icon={faPaperPlane} />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* Masaüstünde konuşma seçilmemiş hali */
            <div className="no-chat-selected-screen">
              <div className="empty-graphic-circle">
                <FontAwesomeIcon icon={faComments} />
              </div>
              <h2 className="empty-screen-title">Mesajlaşmaya Başlayın</h2>
              <p className="empty-screen-desc">
                Sol listeden bir sohbet seçerek konuşmaya devam edebilir ya da ilgilendiğiniz ilan üzerinden mesaj gönderebilirsiniz.
              </p>
            </div>
          )}
        </main>
      )}

      {/* Silme Onay Modalı */}
      {showDeleteModal && (
        <div className="modal-backdrop-blur" onClick={() => setShowDeleteModal(false)}>
          <div className="confirm-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-danger">
              <FontAwesomeIcon icon={faTrash} className="modal-top-icon" />
              <h3>Konuşmayı Sil</h3>
            </div>
            <div className="modal-body">
              <p>Bu konuşmayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
            </div>
            <div className="modal-footer-btns">
              <button 
                type="button" 
                className="btn-modal-cancel" 
                onClick={() => { setShowDeleteModal(false); setMessageToDelete(null); }}
              >
                İptal
              </button>
              <button 
                type="button" 
                className="btn-modal-confirm-delete" 
                onClick={handleDeleteMessage}
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raporlama Onay Modalı */}
      {showReportModal && (
        <div className="modal-backdrop-blur" onClick={() => setShowReportModal(false)}>
          <div className="confirm-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-warning">
              <FontAwesomeIcon icon={faFlag} className="modal-top-icon" />
              <h3>Şikayet Bildirimi</h3>
            </div>
            <div className="modal-body">
              <p>Bu mesajı veya kullanıcıyı uygunsuz içerik sebebiyle yöneticilere bildirmek istiyor musunuz?</p>
            </div>
            <div className="modal-footer-btns">
              <button 
                type="button" 
                className="btn-modal-cancel" 
                onClick={() => { setShowReportModal(false); setMessageToReport(null); }}
              >
                Vazgeç
              </button>
              <button 
                type="button" 
                className="btn-modal-confirm-report" 
                onClick={handleReportMessage}
              >
                Bildir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messaging;
