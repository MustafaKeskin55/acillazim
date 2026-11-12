'use client';

/**
 * Ses algılama — Web Speech API (client-only)
 * Acıllazım BE endpoint yok. /api/speech, /api/utils kullanılmaz.
 */
interface SesAlgilamaCallbacks {
  onResult: ((sonuc: string) => void) | null;
  onStart: (() => void) | null;
  onEnd: (() => void) | null;
  onError: ((hata: string) => void) | null;
}

interface AudioConfig {
  sampleRate: number;
  channelCount: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

type SpeechRecognitionType = typeof window extends { SpeechRecognition: infer T } ? T : unknown;

class SesAlgilama {
  private recognition: SpeechRecognition | null;
  isListening: boolean;
  lastResult: string;
  callbacks: SesAlgilamaCallbacks;
  private audioConfig: AudioConfig;
  private turkceKelimeler: Set<string>;

  constructor() {
    // Temel değişkenler
    this.recognition = null;
    this.isListening = false;
    this.lastResult = '';
    this.callbacks = {
      onResult: null,
      onStart: null,
      onEnd: null,
      onError: null
    };

    // Ses kalitesi ayarları
    this.audioConfig = {
      sampleRate: 48000,
      channelCount: 2,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    };

    // Türkçe kelime listesi
    this.turkceKelimeler = new Set([
      'merhaba', 'selam', 'nasılsın', 'iyiyim',
      'öğrenme', 'modu', 'aç', 'kapat',
      'yardım', 'tamam', 'evet', 'hayır',
      'anladım', 'tekrar', 'söyle', 'dinle'
    ]);

    this.initialize();
  }

  initialize(): void {
    try {
      const SpeechRecognitionCls =
        (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition })
          .SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition })
          .webkitSpeechRecognition;

      if (!SpeechRecognitionCls) {
        throw new Error('Ses algılama sistemi bu tarayıcıda desteklenmiyor.');
      }

      this.recognition = new SpeechRecognitionCls();
      this.setupRecognition();
    } catch (error) {
      console.error('Ses algılama başlatılamadı:', error);
      throw error;
    }
  }

  setupRecognition(): void {
    if (!this.recognition) return;

    // Temel ayarlar
    this.recognition.lang = 'tr-TR';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 5;

    // Olay dinleyicileri
    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.callbacks.onStart) {
        this.callbacks.onStart();
      }
      console.log('Ses algılama başladı');
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.callbacks.onEnd) {
        this.callbacks.onEnd();
      }
      console.log('Ses algılama durdu');

      // Sürekli dinleme modundaysa tekrar başlat
      if (this.recognition && this.recognition.continuous) {
        this.recognition.start();
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const hataMesajlari: Record<string, string> = {
        'no-speech': 'Konuşma algılanamadı. Lütfen daha yüksek sesle konuşun.',
        'audio-capture': 'Mikrofon bulunamadı veya çalışmıyor.',
        'not-allowed': 'Mikrofon izni verilmedi. Lütfen izin verin.',
        'network': 'Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.',
        'aborted': 'Ses algılama işlemi iptal edildi.',
        'language-not-supported': 'Seçilen dil desteklenmiyor.',
        'service-not-allowed': 'Ses algılama servisi kullanılamıyor.'
      };

      const hataMesaji = hataMesajlari[event.error] || 'Bilinmeyen bir hata oluştu.';
      console.error('Ses algılama hatası:', hataMesaji);

      if (this.callbacks.onError) {
        this.callbacks.onError(hataMesaji);
      }

      // Hata durumunda yeniden başlatma
      this.handleError(event.error);
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const son = event.results.length - 1;
      const sonuc = event.results[son][0].transcript;

      // Sonucu düzelt ve işle
      const duzeltilmisSonuc = this.metniDuzelt(sonuc);
      this.lastResult = duzeltilmisSonuc;

      if (this.callbacks.onResult) {
        this.callbacks.onResult(duzeltilmisSonuc);
      }
    };
  }

  metniDuzelt(metin: string): string {
    if (!metin) return '';

    // Türkçe karakter düzeltmeleri
    const karakterDuzeltmeleri: Record<string, string> = {
      'i': 'i', 'ı': 'ı', 'o': 'o', 'ö': 'ö',
      'u': 'u', 'ü': 'ü', 'g': 'g', 'ğ': 'ğ',
      's': 's', 'ş': 'ş', 'c': 'c', 'ç': 'ç'
    };

    let duzeltilmisMetin = metin.toLowerCase();

    // Kelime bazlı düzeltmeler
    const kelimeDuzeltmeleri: Record<string, string> = {
      'ogrenme': 'öğrenme',
      'ogretme': 'öğretme',
      'merheba': 'merhaba',
      'nasilsin': 'nasılsın',
      'evet': 'evet',
      'hayir': 'hayır'
    };

    // Kelime düzeltmelerini uygula
    Object.entries(kelimeDuzeltmeleri).forEach(([hatali, dogru]) => {
      const regex = new RegExp(`\\b${hatali}\\b`, 'gi');
      duzeltilmisMetin = duzeltilmisMetin.replace(regex, dogru);
    });

    // Cümle başındaki harfi büyüt
    duzeltilmisMetin = duzeltilmisMetin.charAt(0).toUpperCase() + duzeltilmisMetin.slice(1);

    return duzeltilmisMetin;
  }

  handleError(errorType: string): void {
    switch (errorType) {
      case 'no-speech':
        setTimeout(() => this.restart(), 1000);
        break;
      case 'audio-capture':
      case 'not-allowed':
        this.requestMicrophonePermission();
        break;
      case 'network':
        setTimeout(() => {
          if (navigator.onLine) this.restart();
        }, 3000);
        break;
      default:
        setTimeout(() => this.restart(), 2000);
    }
  }

  async requestMicrophonePermission(): Promise<void> {
    try {
      await navigator.mediaDevices.getUserMedia({
        audio: this.audioConfig
      });
      this.restart();
    } catch (error) {
      console.error('Mikrofon izni alınamadı:', error);
      if (this.callbacks.onError) {
        this.callbacks.onError('Mikrofon izni gerekiyor');
      }
    }
  }

  start(): void {
    if (!this.isListening && this.recognition) {
      try {
        this.recognition.start();
      } catch (error) {
        console.error('Ses algılama başlatılamadı:', error);
        this.handleError('unknown');
      }
    }
  }

  stop(): void {
    if (this.isListening && this.recognition) {
      this.recognition.stop();
    }
  }

  restart(): void {
    this.stop();
    setTimeout(() => this.start(), 500);
  }

  // Callback fonksiyonlarını ayarlama
  setCallbacks({
    onResult = null,
    onStart = null,
    onEnd = null,
    onError = null
  }: Partial<SesAlgilamaCallbacks> = {}): void {
    this.callbacks = {
      onResult,
      onStart,
      onEnd,
      onError
    };
  }
}

// Dışa aktarma
export default SesAlgilama;
