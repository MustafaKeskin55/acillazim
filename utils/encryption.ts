/**
 * Veri Şifreleme Yardımcı Sınıfı
 * errorHandler.ts tarafından log verilerini şifrelemek/çözmek için kullanılır
 */

export class DataEncryption {
  /**
   * Veriyi şifreler (basit base64 encoding - geliştirme amaçlı)
   * @param data - Şifrelenecek veri
   * @returns Şifrelenmiş veri string'i
   */
  static encrypt(data: any): string {
    try {
      const jsonString = JSON.stringify(data);
      if (typeof window !== 'undefined') {
        return window.btoa(encodeURIComponent(jsonString));
      }
      return Buffer.from(jsonString).toString('base64');
    } catch (error) {
      console.error('Şifreleme hatası:', error);
      return JSON.stringify(data);
    }
  }

  /**
   * Şifreli veriyi çözer
   * @param encryptedData - Şifreli veri string'i
   * @returns Çözülmüş veri
   */
  static decrypt(encryptedData: string): any {
    try {
      let jsonString: string;
      if (typeof window !== 'undefined') {
        jsonString = decodeURIComponent(window.atob(encryptedData));
      } else {
        jsonString = Buffer.from(encryptedData, 'base64').toString('utf-8');
      }
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Şifre çözme hatası:', error);
      // Fallback: direkt parse dene
      try {
        return JSON.parse(encryptedData);
      } catch {
        return null;
      }
    }
  }
}

export default DataEncryption;
