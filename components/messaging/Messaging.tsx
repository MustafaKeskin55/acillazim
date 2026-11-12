"use client";

import React, { useState, useEffect } from 'react';
import './Messaging.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone, faLocationDot, faEllipsisVertical, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import Navbar from '@/components/Navbar/Navbar';
import * as messageService from '@/services/message/messageService';
import authService from '@/services/auth/authService';

// ---- Types ----
interface ConversationMessage {
  id?: string | number;
  message_id?: string | number;
  content: string;
  timestamp?: string;
  sender?: 'buyer' | 'seller' | string;
  type?: 'text' | 'price';
  sender_id?: string | number;
  [key: string]: unknown;
}

interface Conversation {
  conversation_id: number;
  from_user_id?: string | number;
  to_user_id?: string | number;
  listing_id?: string | number | null;
  timestamp?: string;
  isRead?: boolean;
  sender?: string | null;
  senderId?: string | number;
  title?: string | null;
  image?: string | null;
  price?: string | number | null;
  lastMessage?: string | null;
  date?: string;
  phone?: string;
  [key: string]: unknown;
}

interface ListingInfo {
  title?: string;
  image?: string;
  price?: string | number;
}

interface ConversationData {
  conversation_id: number;
  seller_id: string | number;
  listing_id?: string | number;
  listingInfo?: ListingInfo;
}

// ---- Sub-components ----
interface DesktopChatHeaderProps {
  selectedChat: Conversation;
  handlePhoneCall: (phone: string) => void;
  handleLocation: (coords: { latitude: number; longitude: number }) => void;
  handleMoreOptions: () => void;
}

const DesktopChatHeader: React.FC<DesktopChatHeaderProps> = ({
  selectedChat, handlePhoneCall, handleLocation, handleMoreOptions,
}) => (
  <div className="chat-header">
    <div className="chat-user-info">
      <img src={selectedChat.image || ''} alt="User" />
      <div>
        <h2>{selectedChat.title}</h2>
        <p>{selectedChat.sender}</p>
      </div>
    </div>
    <div className="chat-actions">
      <button onClick={() => handlePhoneCall(selectedChat.phone || '+905555555555')} title="Ara">
        <FontAwesomeIcon icon={faPhone} />
      </button>
      <button onClick={() => handleLocation({ latitude: 41.0082, longitude: 28.9784 })} title="Konum">
        <FontAwesomeIcon icon={faLocationDot} />
      </button>
      <button onClick={handleMoreOptions} title="Diğer">
        <FontAwesomeIcon icon={faEllipsisVertical} />
      </button>
    </div>
  </div>
);

interface MobileHeaderProps extends DesktopChatHeaderProps {
  handleBack: () => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  selectedChat, handleBack, handlePhoneCall, handleLocation, handleMoreOptions,
}) => (
  <>
    <div className="chat-header">
      <div className="chat-header-top">
        <button className="btn-back" onClick={handleBack}>
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <div className="chat-header-user-info">
          <span className="chat-header-user">{selectedChat.title}</span>
          <span className="chat-header-sender">{selectedChat.sender}</span>
        </div>
      </div>
      <div className="header-actions">
        <button className="btn-icon" title="Ara" onClick={() => handlePhoneCall(selectedChat.phone || '+905555555555')}>
          <FontAwesomeIcon icon={faPhone} />
        </button>
        <button className="btn-icon" title="Konum" onClick={() => handleLocation({ latitude: 41.0082, longitude: 28.9784 })}>
          <FontAwesomeIcon icon={faLocationDot} />
        </button>
        <button className="btn-icon" title="Diğer" onClick={handleMoreOptions}>
          <FontAwesomeIcon icon={faEllipsisVertical} />
        </button>
      </div>
    </div>
    <div className="chat-header-bottom">
      <div className="chat-header-image">
        <img src={selectedChat.image || ''} alt={selectedChat.title || ''} />
      </div>
      <div className="chat-header-info">
        <div className="chat-header-title">{selectedChat.title}</div>
        <div className="chat-header-price">{selectedChat.price ? `${selectedChat.price} TL` : '2.425.000 TL'}</div>
      </div>
    </div>
  </>
);

const DeleteModal: React.FC<{ onConfirm: () => void; onCancel: () => void }> = ({ onConfirm, onCancel }) => (
  <div className="delete-modal-overlay" onClick={onCancel}>
    <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
      <div className="delete-modal-header"><h2>Silme Onayı</h2></div>
      <div className="delete-modal-content"><p>Bu mesajı silmek istediğinizden emin misiniz?</p></div>
      <div className="delete-modal-buttons">
        <button className="cancel-button" onClick={onCancel}>İptal</button>
        <button className="confirm-button" onClick={onConfirm}>Sil</button>
      </div>
    </div>
  </div>
);

const ReportModal: React.FC<{ onConfirm: () => void; onCancel: () => void }> = ({ onConfirm, onCancel }) => (
  <div className="delete-modal-overlay" onClick={onCancel}>
    <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
      <div className="delete-modal-header"><h2>Raporlama Onayı</h2></div>
      <div className="delete-modal-content"><p>Bu mesajı moderatörlere bildirmek istediğinizden emin misiniz?</p></div>
      <div className="delete-modal-buttons">
        <button className="cancel-button" onClick={onCancel}>İptal</button>
        <button className="confirm-button" onClick={onConfirm}>Raporla</button>
      </div>
    </div>
  </div>
);

// ---- Main Component ----
interface MessagingProps {
  chatId?: string;
  conversationData?: ConversationData;
}

const Messaging: React.FC<MessagingProps> = ({ chatId, conversationData }) => {
  const [activeTab, setActiveTab] = useState<'unread' | 'read'>('unread');
  const [messages, setMessages] = useState<Conversation[]>([]);
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ConversationMessage[]>([]);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [showChat, setShowChat] = useState<boolean>(true);
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [messageToDelete, setMessageToDelete] = useState<Conversation | null>(null);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [messageToReport, setMessageToReport] = useState<Conversation | null>(null);

  // SSR güvenli: window erişimi useEffect içinde
  useEffect(() => {
    const mobile = window.innerWidth <= 768;
    setIsMobile(mobile);
    setShowChat(!mobile);
  }, []);

  useEffect(() => {
    document.title = "Mesajlar";
  }, []);

  // Konuşmaları yükle
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const conversations = await messageService.getConversations() as Conversation[];
        const currentUser = authService.getCurrentUser() as Record<string, string | number> | null;
        const currentUserId = currentUser?.id || currentUser?.user_id || currentUser?.userId;
        if (!currentUserId) { setMessages([]); return; }

        const enrichedConversations = await Promise.all(
          conversations.map(async (conv) => {
            const otherUserId = conv.from_user_id === currentUserId ? conv.to_user_id : conv.from_user_id;
            const [user, listing, msgs] = await Promise.all([
              messageService.getUserById(otherUserId as string),
              conv.listing_id ? messageService.getListingById(conv.listing_id as string) : Promise.resolve(null),
              messageService.getMessagesByConversationId(conv.conversation_id),
            ]) as [Record<string, string> | null, Record<string, string> | null, ConversationMessage[]];
            const lastMessage = msgs.length > 0 ? msgs[msgs.length - 1] : null;
            return {
              ...conv,
              sender: user?.name || null,
              senderId: otherUserId,
              title: listing?.title || null,
              image: listing?.image || user?.avatar || null,
              price: listing?.price || null,
              lastMessage: lastMessage?.content || null,
              date: new Date(conv.timestamp || '').toLocaleDateString('tr-TR'),
            };
          })
        );
        setMessages(enrichedConversations);
      } catch (error) {
        console.error('Konuşmalar yüklenirken hata:', error);
        setMessages([]);
      }
    };
    loadConversations();
  }, []);

  // Seçili sohbetin mesajlarını yükle
  useEffect(() => {
    const loadChatMessages = async () => {
      if (!selectedChat) return;
      try {
        const msgs = await messageService.getMessagesByConversationId(selectedChat.conversation_id) as ConversationMessage[];
        const currentUser = authService.getCurrentUser() as Record<string, string | number> | null;
        const currentUserId = currentUser?.id || currentUser?.user_id || currentUser?.userId;
        if (!currentUserId) { setChatMessages([]); return; }
        const formattedMessages: ConversationMessage[] = msgs.map((msg) => ({
          id: msg.message_id,
          content: msg.content,
          timestamp: new Date(msg.timestamp || '').toLocaleString('tr-TR'),
          sender: msg.sender_id === currentUserId ? 'buyer' : 'seller',
          type: msg.content.includes('TL') ? 'price' : 'text',
        }));
        setChatMessages(formattedMessages);
      } catch (error) {
        console.error('Mesajlar yüklenirken hata:', error);
        setChatMessages([]);
      }
    };
    loadChatMessages();
  }, [selectedChat]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setShowChat(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // chatId prop'u üzerinden sohbet yükle
  useEffect(() => {
    if (!chatId) return;
    const conversationId = parseInt(chatId);
    const selectedMessage = messages.find((m) => m.conversation_id === conversationId);
    if (selectedMessage) {
      setSelectedChat(selectedMessage);
      setActiveChat(selectedMessage.conversation_id);
      if (isMobile) setShowChat(true);
    } else if (conversationData && conversationData.conversation_id === conversationId) {
      (async () => {
        try {
          const currentUser = authService.getCurrentUser() as Record<string, string | number> | null;
          const currentUserId = currentUser?.id || currentUser?.user_id || currentUser?.userId;
          if (!currentUserId) { window.location.href = '/messages'; return; }
          const [user, msgs] = await Promise.all([
            messageService.getUserById(conversationData.seller_id as string),
            messageService.getMessagesByConversationId(conversationId),
          ]) as [Record<string, string> | null, ConversationMessage[]];
          const lastMessage = msgs.length > 0 ? msgs[msgs.length - 1] : null;
          const enrichedConversation: Conversation = {
            conversation_id: conversationId,
            from_user_id: currentUserId,
            to_user_id: conversationData.seller_id,
            listing_id: conversationData.listing_id,
            timestamp: new Date().toISOString(),
            isRead: true,
            sender: (user as Record<string, string> | null)?.name || null,
            senderId: conversationData.seller_id,
            title: conversationData.listingInfo?.title || null,
            image: conversationData.listingInfo?.image || (user as Record<string, string> | null)?.avatar || null,
            price: conversationData.listingInfo?.price || null,
            lastMessage: lastMessage?.content || null,
            date: new Date().toLocaleDateString('tr-TR'),
          };
          setSelectedChat(enrichedConversation);
          setActiveChat(enrichedConversation.conversation_id);
          if (isMobile) setShowChat(true);
          setMessages((prev) => {
            const exists = prev.find((m) => m.conversation_id === conversationId);
            return exists ? prev : [enrichedConversation, ...prev];
          });
        } catch (error) {
          console.error('Conversation yüklenirken hata:', error);
        }
      })();
    }
  }, [chatId, messages, isMobile, conversationData]);

  const handleChatSelect = async (conversation: Conversation) => {
    setSelectedChat(conversation);
    setActiveChat(conversation.conversation_id);
    if (isMobile) setShowChat(true);
    if (!conversation.isRead) {
      try {
        await messageService.markConversationAsRead(conversation.conversation_id);
        setMessages((prev) => prev.map((msg) => msg.conversation_id === conversation.conversation_id ? { ...msg, isRead: true } : msg));
      } catch (error) {
        console.error('Konuşma okundu olarak işaretlenirken hata:', error);
      }
    }
    window.history.pushState(null, '', `/messages/${conversation.conversation_id}`);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const messageContent = newMessage.trim();
    if (!messageContent || !selectedChat) return;
    try {
      const sentMessage = await messageService.sendMessage(selectedChat.conversation_id, messageContent) as ConversationMessage;
      setChatMessages([...chatMessages, sentMessage]);
      setNewMessage('');
    } catch (error) {
      console.error('Mesaj gönderilirken hata:', error);
      alert('Mesaj gönderilemedi. Lütfen tekrar deneyin.');
    }
  };

  const handlePriceOffer = () => {
    const priceStr = prompt('Fiyat teklifinizi girin (TL):');
    if (priceStr && !isNaN(Number(priceStr)) && selectedChat) {
      const messageTemplate = `${priceStr} TL için fiyat teklifinde bulunuyorum. Değerlendirir misiniz?😊😊`;
      (async () => {
        try {
          const sentMessage = await messageService.sendMessage(selectedChat.conversation_id, messageTemplate) as ConversationMessage;
          setChatMessages([...chatMessages, sentMessage]);
        } catch (error) {
          console.error('Fiyat teklifi gönderilirken hata:', error);
          alert('Fiyat teklifi gönderilemedi.');
        }
      })();
    }
  };

  const handlePhoneCall = (phoneNumber: string) => { window.location.href = `tel:${phoneNumber}`; };
  const handleLocation = (coordinates: { latitude: number; longitude: number }) => {
    window.open(`https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`, '_blank');
  };

  const handleMoreOptions = () => {
    if (!selectedChat) return;
    const action = prompt('Seçenekler:\n1. Mesajı Sil\n2. Raporla\n3. Satıcının Tüm İlanları\n\nNumara girin:');
    if (action === '1') { setMessageToDelete(selectedChat); setShowDeleteModal(true); }
    else if (action === '2') { setMessageToReport(selectedChat); setShowReportModal(true); }
    else if (action === '3') { window.location.href = `/profile/${selectedChat.senderId}`; }
  };

  const handleBack = () => {
    setShowChat(false);
    setSelectedChat(null);
    setActiveChat(null);
    window.history.pushState(null, '', '/messages');
  };

  const getFilteredMessages = (): Conversation[] => {
    if (!messages || !Array.isArray(messages)) return [];
    return messages.filter((message) => activeTab === 'unread' ? !message.isRead : message.isRead);
  };

  const handleDeleteMessage = async () => {
    if (!messageToDelete) return;
    try {
      await messageService.deleteConversation(messageToDelete.conversation_id);
      const conversations = await messageService.getConversations() as Conversation[];
      setMessages(conversations || []);
      setSelectedChat(null);
      setActiveChat(null);
      setChatMessages([]);
      if (isMobile) setShowChat(false);
      window.history.pushState(null, '', '/messages');
      setShowDeleteModal(false);
      setMessageToDelete(null);
    } catch (error) {
      console.error('Konuşma silinirken hata:', error);
      alert('Konuşma silinemedi. Lütfen tekrar deneyin.');
    }
  };

  const handleReportMessage = async () => {
    if (!messageToReport) return;
    try {
      await messageService.reportMessage(messageToReport.conversation_id, 'Uygunsuz içerik');
      setShowReportModal(false);
      setMessageToReport(null);
      alert('Mesaj moderatörlere bildirildi.');
    } catch (error) {
      console.error('Mesaj raporlanırken hata:', error);
      alert('Mesaj raporlanırken bir hata oluştu.');
    }
  };

  return (
    <>
      <Navbar />
      <div className="messaging-super-container">
        <div className="messaging-tabs">
          <div className={`tab ${activeTab === 'unread' ? 'active' : ''}`} onClick={() => setActiveTab('unread')}>
            Okunmamış
            {messages && messages.filter((m) => !m.isRead).length > 0 && (
              <span className="badge">{messages.filter((m) => !m.isRead).length}</span>
            )}
          </div>
          <div className={`tab ${activeTab === 'read' ? 'active' : ''}`} onClick={() => setActiveTab('read')}>
            Okunmuş
          </div>
        </div>

        <div className="messaging-content">
          {(!isMobile || !showChat) && (
            <div className="messages-list">
              {getFilteredMessages().length > 0 ? (
                getFilteredMessages().map((message) => (
                  <div
                    key={message.conversation_id || Math.random()}
                    className={`message-card ${selectedChat?.conversation_id === message.conversation_id ? 'selected' : ''}`}
                    onClick={() => handleChatSelect(message)}
                  >
                    <div className="car-image">
                      <img src={message.image || 'https://via.placeholder.com/150'} alt="Car" />
                    </div>
                    <div className="message-info">
                      <div className="message-header">
                        <h3>{message.title || 'İlan'}</h3>
                        <span className="date">{message.date || ''}</span>
                      </div>
                      <p className="preview">{message.lastMessage || ''}</p>
                      <div className="sender">{message.sender || 'Bilinmeyen'}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-messages">
                  <p>{activeTab === 'unread' ? 'Okunmamış mesajınız yok' : 'Okunmuş mesajınız yok'}</p>
                </div>
              )}
            </div>
          )}

          {(!isMobile || showChat) && selectedChat && (
            <div className="chat-section">
              {isMobile ? (
                <MobileHeader
                  selectedChat={selectedChat}
                  handleBack={handleBack}
                  handlePhoneCall={handlePhoneCall}
                  handleLocation={handleLocation}
                  handleMoreOptions={handleMoreOptions}
                />
              ) : (
                <DesktopChatHeader
                  selectedChat={selectedChat}
                  handlePhoneCall={handlePhoneCall}
                  handleLocation={handleLocation}
                  handleMoreOptions={handleMoreOptions}
                />
              )}

              <div className="chat-subheader">
                <div className="chat-subheader-image">
                  <img src={selectedChat.image || ''} alt={selectedChat.title || ''} />
                </div>
                <div className="chat-subheader-content">
                  <h3 className="chat-subheader-title">{selectedChat.title}</h3>
                  <div className="chat-header-price">{selectedChat.price ? `${selectedChat.price} TL` : '2.425.000 TL'}</div>
                </div>
              </div>

              <div className="chat-messages">
                {chatMessages && chatMessages.length > 0 ? (
                  chatMessages.map((msg) => (
                    <div key={msg.id as string || String(Math.random())} className={`message ${msg.sender || 'buyer'}`}>
                      <div className={`message-content ${msg.type === 'price' ? 'price-offer' : ''}`}>
                        <p>{msg.content || ''}</p>
                      </div>
                      <span className="message-time">{msg.timestamp || ''}</span>
                    </div>
                  ))
                ) : (
                  <div className="no-messages-in-chat"><p>Henüz mesaj yok</p></div>
                )}
              </div>

              <div className="messaging-chat-scope">
                <div className="chat-input-container">
                  <form onSubmit={handleSendMessage} className="text-input-container">
                    <input
                      type="text"
                      className="form-control custom-input"
                      placeholder="Mesajınızı buraya yazın"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                    />
                  </form>
                  <div className="buttons-container">
                    <button type="button" className="btn-offer" onClick={handlePriceOffer}>
                      <i className="fas fa-tag"></i>
                    </button>
                    <button type="submit" className="btn-send" onClick={handleSendMessage}>
                      <i className="fas fa-paper-plane"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(!isMobile || showChat) && !selectedChat && (
            <div className="no-chat-selected">
              <i className="fas fa-comments"></i>
              <p>Lütfen bir mesaj seçin</p>
            </div>
          )}
        </div>
      </div>

      {showDeleteModal && (
        <DeleteModal
          onConfirm={handleDeleteMessage}
          onCancel={() => { setShowDeleteModal(false); setMessageToDelete(null); }}
        />
      )}
      {showReportModal && (
        <ReportModal
          onConfirm={handleReportMessage}
          onCancel={() => { setShowReportModal(false); setMessageToReport(null); }}
        />
      )}
    </>
  );
};

export default Messaging;
