/**
 * Tarih formatlama ve manipülasyon işlemleri için yardımcı fonksiyonlar.
 */

/**
 * Tarihi Türkçe formatta gösterir (Gün Ay Yıl)
 */
export const formatDate = (date: string | Date): string => {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return 'Geçersiz Tarih';

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };

  try {
    return dateObj.toLocaleDateString('tr-TR', options);
  } catch {
    const day = dateObj.getDate();
    const month = getMonthName(dateObj.getMonth());
    const year = dateObj.getFullYear();
    return `${day} ${month} ${year}`;
  }
};

/**
 * Milisaniyeyi zaman formatına çevirir (5 gün önce, 2 saat önce vb.)
 */
export const timeAgo = (date: string | Date): string => {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return 'Geçersiz Tarih';

  const now = new Date();
  const secondsAgo = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  const minute = 60;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;
  const month = day * 30;
  const year = day * 365;

  if (secondsAgo < minute) return 'Az önce';
  if (secondsAgo < hour) return `${Math.floor(secondsAgo / minute)} dakika önce`;
  if (secondsAgo < day) return `${Math.floor(secondsAgo / hour)} saat önce`;
  if (secondsAgo < week) return `${Math.floor(secondsAgo / day)} gün önce`;
  if (secondsAgo < month) return `${Math.floor(secondsAgo / week)} hafta önce`;
  if (secondsAgo < year) return `${Math.floor(secondsAgo / month)} ay önce`;
  return `${Math.floor(secondsAgo / year)} yıl önce`;
};

/**
 * Ayın Türkçe adını döndürür
 */
const getMonthName = (monthIndex: number): string => {
  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];
  return months[monthIndex];
};

/**
 * İki tarih arasındaki farkı gün cinsinden hesaplar
 */
export const daysBetween = (date1: string | Date, date2: string | Date = new Date()): number => {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;

  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;

  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

export default {
  formatDate,
  timeAgo,
  daysBetween
};
