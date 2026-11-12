/**
 * Mesajlaşma Sistemi Mock Data
 * =============================
 * 
 * Gerçek API'den gelecek veri yapısını simüle eden geçici mock data.
 * API entegrasyonu tamamlandığında bu dosya silinecek.
 */

// ==========================================
// CONVERSATIONS TABLOSU
// ==========================================
export const conversationsData = [
  {
    id: 1,
    conversation_id: 20001,
    from_user_id: 5421,
    to_user_id: 1001,
    listing_id: 1001,
    isRead: true,
    timestamp: "2024-02-15T10:30:00Z"
  },
  {
    id: 2,
    conversation_id: 20002,
    from_user_id: 1001,
    to_user_id: 6234,
    listing_id: 1002,
    isRead: false,
    timestamp: "2024-02-16T14:20:00Z"
  },
  {
    id: 3,
    conversation_id: 20003,
    from_user_id: 7845,
    to_user_id: 1001,
    listing_id: 1003,
    isRead: true,
    timestamp: "2024-02-17T09:15:00Z"
  },
  {
    id: 4,
    conversation_id: 20004,
    from_user_id: 1001,
    to_user_id: 3256,
    listing_id: 1004,
    isRead: false,
    timestamp: "2024-02-18T16:45:00Z"
  },
  {
    id: 5,
    conversation_id: 20005,
    from_user_id: 8234,
    to_user_id: 1001,
    listing_id: 1005,
    isRead: true,
    timestamp: "2024-02-19T11:30:00Z"
  },
  {
    id: 6,
    conversation_id: 20006,
    from_user_id: 1001,
    to_user_id: 9456,
    listing_id: 1006,
    isRead: false,
    timestamp: "2024-02-20T13:20:00Z"
  },
  {
    id: 7,
    conversation_id: 20007,
    from_user_id: 2134,
    to_user_id: 1001,
    listing_id: 1007,
    isRead: true,
    timestamp: "2024-02-21T08:45:00Z"
  },
  {
    id: 8,
    conversation_id: 20008,
    from_user_id: 1001,
    to_user_id: 4567,
    listing_id: 1008,
    isRead: false,
    timestamp: "2024-02-22T15:10:00Z"
  },
  {
    id: 9,
    conversation_id: 20009,
    from_user_id: 7234,
    to_user_id: 1001,
    listing_id: 1009,
    isRead: true,
    timestamp: "2024-02-23T10:25:00Z"
  },
  {
    id: 10,
    conversation_id: 20010,
    from_user_id: 1001,
    to_user_id: 5421,
    listing_id: 1010,
    isRead: false,
    timestamp: "2024-02-24T12:40:00Z"
  }
];

// ==========================================
// MESSAGES TABLOSU (Karşılıklı Konuşmalar)
// ==========================================
export const messagesData = [
  // Conversation 20001 mesajları (5421 -> 1001 hakkında 1001 ilanı)
  {
    message_id: 50101,
    conversation_id: 20001,
    sender_id: 5421,
    receiver_id: 1001,
    content: "Merhaba, ilanınız hala geçerli mi?",
    timestamp: "2024-02-15T10:00:00Z",
    status: "read"
  },
  {
    message_id: 50102,
    conversation_id: 20001,
    sender_id: 1001,
    receiver_id: 5421,
    content: "Evet, hala satılık. Ne tür bilgilere ihtiyacınız var?",
    timestamp: "2024-02-15T10:05:00Z",
    status: "read"
  },
  {
    message_id: 50103,
    conversation_id: 20001,
    sender_id: 5421,
    receiver_id: 1001,
    content: "Pazarlık payı var mı?",
    timestamp: "2024-02-15T10:10:00Z",
    status: "read"
  },
  {
    message_id: 50104,
    conversation_id: 20001,
    sender_id: 1001,
    receiver_id: 5421,
    content: "Evet, makul tekliflere açığım.",
    timestamp: "2024-02-15T10:30:00Z",
    status: "read"
  },
  
  // Conversation 20002 mesajları (1001 -> 6234 hakkında 1002 ilanı)
  {
    message_id: 50201,
    conversation_id: 20002,
    sender_id: 1001,
    receiver_id: 6234,
    content: "Merhaba, ilanınızı gördüm. Detaylı bilgi alabilir miyim?",
    timestamp: "2024-02-16T14:00:00Z",
    status: "sent"
  },
  {
    message_id: 50202,
    conversation_id: 20002,
    sender_id: 6234,
    receiver_id: 1001,
    content: "Tabii ki. Hangi konuda bilgi istersiniz?",
    timestamp: "2024-02-16T14:05:00Z",
    status: "sent"
  },
  {
    message_id: 50203,
    conversation_id: 20002,
    sender_id: 1001,
    receiver_id: 6234,
    content: "Ne zaman görüşebiliriz?",
    timestamp: "2024-02-16T14:20:00Z",
    status: "sent"
  },
  
  // Conversation 20003 mesajları (7845 -> 1001 hakkında 1003 ilanı)
  {
    message_id: 50301,
    conversation_id: 20003,
    sender_id: 7845,
    receiver_id: 1001,
    content: "İlanınız çok güzel. Fiyat konusunda görüşebilir miyiz?",
    timestamp: "2024-02-17T09:00:00Z",
    status: "read"
  },
  {
    message_id: 50302,
    conversation_id: 20003,
    sender_id: 1001,
    receiver_id: 7845,
    content: "Evet, ne düşünüyorsunuz?",
    timestamp: "2024-02-17T09:05:00Z",
    status: "read"
  },
  {
    message_id: 50303,
    conversation_id: 20003,
    sender_id: 7845,
    receiver_id: 1001,
    content: "İlan fiyatından biraz indirim yapabilir misiniz?",
    timestamp: "2024-02-17T09:15:00Z",
    status: "read"
  },
  
  // Conversation 20004 mesajları (1001 -> 3256 hakkında 1004 ilanı)
  {
    message_id: 50401,
    conversation_id: 20004,
    sender_id: 1001,
    receiver_id: 3256,
    content: "Merhaba, ürününüz hakkında bilgi alabilir miyim?",
    timestamp: "2024-02-18T16:30:00Z",
    status: "sent"
  },
  {
    message_id: 50402,
    conversation_id: 20004,
    sender_id: 3256,
    receiver_id: 1001,
    content: "Elbette, ne öğrenmek istersiniz?",
    timestamp: "2024-02-18T16:35:00Z",
    status: "sent"
  },
  {
    message_id: 50403,
    conversation_id: 20004,
    sender_id: 1001,
    receiver_id: 3256,
    content: "Ürünün durumu nasıl? Kullanılmış mı?",
    timestamp: "2024-02-18T16:40:00Z",
    status: "sent"
  },
  {
    message_id: 50404,
    conversation_id: 20004,
    sender_id: 3256,
    receiver_id: 1001,
    content: "Sıfır ayarında, hiç kullanılmadı.",
    timestamp: "2024-02-18T16:45:00Z",
    status: "sent"
  },
  
  // Conversation 20005 mesajları (8234 -> 1001 hakkında 1005 ilanı)
  {
    message_id: 50501,
    conversation_id: 20005,
    sender_id: 8234,
    receiver_id: 1001,
    content: "İlanınız hala aktif mi?",
    timestamp: "2024-02-19T11:00:00Z",
    status: "read"
  },
  {
    message_id: 50502,
    conversation_id: 20005,
    sender_id: 1001,
    receiver_id: 8234,
    content: "Evet, aktif. İlgilendiğiniz için teşekkürler.",
    timestamp: "2024-02-19T11:10:00Z",
    status: "read"
  },
  {
    message_id: 50503,
    conversation_id: 20005,
    sender_id: 8234,
    receiver_id: 1001,
    content: "Yarın görüşebilir miyiz?",
    timestamp: "2024-02-19T11:30:00Z",
    status: "read"
  },
  
  // Conversation 20006 mesajları (1001 -> 9456 hakkında 1006 ilanı)
  {
    message_id: 50601,
    conversation_id: 20006,
    sender_id: 1001,
    receiver_id: 9456,
    content: "Merhaba, ürününüzle ilgileniyorum.",
    timestamp: "2024-02-20T13:00:00Z",
    status: "sent"
  },
  {
    message_id: 50602,
    conversation_id: 20006,
    sender_id: 9456,
    receiver_id: 1001,
    content: "Hoş geldiniz. Nasıl yardımcı olabilirim?",
    timestamp: "2024-02-20T13:10:00Z",
    status: "sent"
  },
  {
    message_id: 50603,
    conversation_id: 20006,
    sender_id: 1001,
    receiver_id: 9456,
    content: "Son fiyat nedir?",
    timestamp: "2024-02-20T13:20:00Z",
    status: "sent"
  },
  
  // Conversation 20007 mesajları (2134 -> 1001 hakkında 1007 ilanı)
  {
    message_id: 50701,
    conversation_id: 20007,
    sender_id: 2134,
    receiver_id: 1001,
    content: "İlan çok güzel görünüyor. Yerinde görebilir miyim?",
    timestamp: "2024-02-21T08:30:00Z",
    status: "read"
  },
  {
    message_id: 50702,
    conversation_id: 20007,
    sender_id: 1001,
    receiver_id: 2134,
    content: "Tabii ki, size uygun bir zaman ayarlayalım.",
    timestamp: "2024-02-21T08:35:00Z",
    status: "read"
  },
  {
    message_id: 50703,
    conversation_id: 20007,
    sender_id: 2134,
    receiver_id: 1001,
    content: "Yarın saat 14:00 uygun mu?",
    timestamp: "2024-02-21T08:45:00Z",
    status: "read"
  },
  
  // Conversation 20008 mesajları (1001 -> 4567 hakkında 1008 ilanı)
  {
    message_id: 50801,
    conversation_id: 20008,
    sender_id: 1001,
    receiver_id: 4567,
    content: "Merhaba, ilanınızı merak ettim.",
    timestamp: "2024-02-22T15:00:00Z",
    status: "sent"
  },
  {
    message_id: 50802,
    conversation_id: 20008,
    sender_id: 4567,
    receiver_id: 1001,
    content: "Merhaba, sormak istediğiniz bir şey var mı?",
    timestamp: "2024-02-22T15:05:00Z",
    status: "sent"
  },
  {
    message_id: 50803,
    conversation_id: 20008,
    sender_id: 1001,
    receiver_id: 4567,
    content: "Ürün garantili mi?",
    timestamp: "2024-02-22T15:10:00Z",
    status: "sent"
  },
  
  // Conversation 20009 mesajları (7234 -> 1001 hakkında 1009 ilanı)
  {
    message_id: 50901,
    conversation_id: 20009,
    sender_id: 7234,
    receiver_id: 1001,
    content: "İlanınız için fiyat teklifi yapabilir miyim?",
    timestamp: "2024-02-23T10:00:00Z",
    status: "read"
  },
  {
    message_id: 50902,
    conversation_id: 20009,
    sender_id: 1001,
    receiver_id: 7234,
    content: "Evet, teklifinizi dinlemek isterim.",
    timestamp: "2024-02-23T10:10:00Z",
    status: "read"
  },
  {
    message_id: 50903,
    conversation_id: 20009,
    sender_id: 7234,
    receiver_id: 1001,
    content: "İlan fiyatının %10 altında teklif edebilir miyim?",
    timestamp: "2024-02-23T10:25:00Z",
    status: "read"
  },
  
  // Conversation 20010 mesajları (1001 -> 5421 hakkında 1010 ilanı)
  {
    message_id: 51001,
    conversation_id: 20010,
    sender_id: 1001,
    receiver_id: 5421,
    content: "Merhaba, ilanınız ilgimi çekti.",
    timestamp: "2024-02-24T12:30:00Z",
    status: "sent"
  },
  {
    message_id: 51002,
    conversation_id: 20010,
    sender_id: 5421,
    receiver_id: 1001,
    content: "Hoş geldiniz. Daha fazla bilgi ister misiniz?",
    timestamp: "2024-02-24T12:35:00Z",
    status: "sent"
  },
  {
    message_id: 51003,
    conversation_id: 20010,
    sender_id: 1001,
    receiver_id: 5421,
    content: "Evet, takas düşünür müsünüz?",
    timestamp: "2024-02-24T12:40:00Z",
    status: "sent"
  }
];

