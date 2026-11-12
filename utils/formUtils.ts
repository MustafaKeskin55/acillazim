interface ListingFormData {
  baslik: string;
  aciklama: string;
  fiyat: number | string;
  il: string;
  ilce: string;
  mahalle: string;
  [key: string]: unknown;
}

/**
 * Form verilerini doğrulama fonksiyonu
 */
export const validateListingData = (formData: ListingFormData): boolean => {
  const requiredFields: (keyof ListingFormData)[] = [
    'baslik', 'aciklama', 'fiyat', 'il', 'ilce', 'mahalle'
  ];

  for (const field of requiredFields) {
    if (!formData[field] || formData[field].toString().trim() === '') {
      throw new Error(`${field} alanı zorunludur`);
    }
  }

  if (formData.baslik.length < 10 || formData.baslik.length > 70) {
    throw new Error('Başlık 10-70 karakter arasında olmalıdır');
  }

  if (formData.aciklama.length < 50 || formData.aciklama.length > 800) {
    throw new Error('Açıklama 50-800 karakter arasında olmalıdır');
  }

  const fiyatNum = Number(formData.fiyat);
  if (isNaN(fiyatNum) || fiyatNum <= 0) {
    throw new Error('Geçerli bir fiyat giriniz');
  }

  if (formData.aciklama.includes('telefon') || /\d{10,11}/.test(formData.aciklama)) {
    throw new Error('Açıklama alanına telefon numarası yazılamaz');
  }

  return true;
};
