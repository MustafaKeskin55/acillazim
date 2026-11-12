'use client';

import { toast } from 'react-toastify';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * Metni panoya kopyalar
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      showNotification('Bağlantı panoya kopyalandı', 'success');
      return true;
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (ok) {
      showNotification('Bağlantı panoya kopyalandı', 'success');
      return true;
    }
    throw new Error('execCommand copy failed');
  } catch (error) {
    console.error('Panoya kopyalama hatası:', error);
    showNotification('Panoya kopyalama başarısız', 'error');
    return false;
  }
};

/**
 * Toast notification gösterir
 */
export const showNotification = (message: string, type: NotificationType = 'success'): void => {
  const toastOptions = {
    position: 'top-center' as const,
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    closeButton: true
  };

  switch (type) {
    case 'success':
      toast.success(message, toastOptions);
      break;
    case 'error':
      toast.error(message, toastOptions);
      break;
    case 'warning':
      toast.warning(message, toastOptions);
      break;
    case 'info':
      toast.info(message, toastOptions);
      break;
    default:
      toast(message, toastOptions);
  }
};

/**
 * Onay dialogu gösterir
 */
export const confirmDialog = (message: string): boolean => {
  return window.confirm(message);
};

/**
 * Favori işlemi sonrası bildirim gösterir
 */
export const showFavoriteNotification = (isAdded: boolean, itemName = ''): void => {
  const message = isAdded
    ? `Favorilere eklendi${itemName ? `: ${itemName}` : ''}`
    : `Favorilerden çıkarıldı${itemName ? `: ${itemName}` : ''}`;
  showNotification(message, isAdded ? 'success' : 'info');
};

/**
 * Liste işlemi sonrası bildirim gösterir
 */
export const showListNotification = (action: 'created' | 'updated' | 'deleted', listName: string): void => {
  const messages: Record<string, string> = {
    created: `"${listName}" listesi oluşturuldu`,
    updated: `"${listName}" listesi güncellendi`,
    deleted: `"${listName}" listesi silindi`
  };
  showNotification(messages[action] || 'Liste işlemi tamamlandı', 'success');
};

/**
 * Hata bildirimi gösterir
 */
export const showErrorNotification = (operation: string, error: Error): void => {
  const message = `${operation} sırasında hata oluştu: ${error.message || 'Bilinmeyen hata'}`;
  showNotification(message, 'error');
  console.error(`${operation} hatası:`, error);
};
