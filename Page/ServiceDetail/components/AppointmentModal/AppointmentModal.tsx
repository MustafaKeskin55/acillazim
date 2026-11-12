"use client";

import React, { useState, useEffect } from 'react';
import { 
  FaTimes, 
  FaCalendarAlt, 
  FaClock, 
  FaCheck,
  FaArrowRight,
  FaArrowLeft,
  FaCheckCircle,
  FaGift,
  FaStar,
  FaClipboardList,
  FaShieldAlt
} from 'react-icons/fa';
import './AppointmentModal.css';
import { getWorkingHoursByIlanId } from '@/services/productDetail/productDetailService';
import { getAvailableTimeSlots } from '@/services/appointment/appointmentService';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceData?: Record<string, unknown>;
  selectedPackage?: Record<string, unknown> | null;
  onAppointmentSubmit?: (data: unknown) => Promise<unknown>;
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  serviceData,
  selectedPackage = null,
  onAppointmentSubmit,
}) => {
  // State'ler
  const [currentStep, setCurrentStep] = useState(selectedPackage ? 2 : 1); // 1: Paket Seçimi, 2: Randevu Detayları, 3: Başarı
  const [appointmentType, setAppointmentType] = useState(selectedPackage ? 'package' : 'regular');
  const [chosenPackage, setChosenPackage] = useState(selectedPackage);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Dinamik veriler için state'ler
  const [workingHours, setWorkingHours] = useState(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);

  // Modal açıldığında state'leri reset et
  useEffect(() => {
    if (isOpen) {
      // Eğer selectedPackage varsa direkt randevu detayına git
      if (selectedPackage) {
        setCurrentStep(2);
        setAppointmentType('package');
        setChosenPackage(selectedPackage);
      } else {
        setCurrentStep(1);
        setAppointmentType('regular');
        setChosenPackage(null);
      }
      
      // Diğer state'leri temizle
      setSelectedDate('');
      setSelectedTime('');
      setNotes('');
      setIsSubmitting(false);
    }
  }, [isOpen, selectedPackage]);

  // Modal açıldığında scroll'u engelle
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Çalışma saatlerini getir
  useEffect(() => {
    if (isOpen && serviceData) {
      const wh = (serviceData as any).workingHours || (serviceData as any).working_hours;
      if (wh && typeof wh === 'object') {
        setWorkingHours(wh);
      } else if (serviceData.ilan_id) {
        try {
          const hours = getWorkingHoursByIlanId(Number(serviceData.ilan_id));
          setWorkingHours(hours);
        } catch {
          setWorkingHours(null);
        }
      }
    }
  }, [isOpen, serviceData]);

  // Seçilen tarihe göre müsait saatleri getir
  useEffect(() => {
    const listingId = serviceData?.ilan_id ?? (serviceData as any)?.id;
    if (selectedDate && listingId) {
      fetchAvailableTimeSlots(selectedDate);
    } else {
      setAvailableTimeSlots([]);
    }
  }, [selectedDate, serviceData]);

  // Müsait saatleri API'den getir
  const fetchAvailableTimeSlots = async (date: string) => {
    setLoadingTimeSlots(true);
    try {
      const listingId = (serviceData?.ilan_id ?? (serviceData as any)?.id) as number;
      const slots = await getAvailableTimeSlots(listingId, date);
      setAvailableTimeSlots(slots || []);
      console.log('Müsait saatler yüklendi:', {
        date,
        availableSlots: slots,
        totalAvailable: (slots || []).length
      });
    } catch (error) {
      console.error('Müsait saatler alınamadı:', error);
      setAvailableTimeSlots([]);
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  // Bugünden itibaren 30 gün sonrasına kadar tarih seçenekleri (bugün dahil)
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  };

  // Form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTime) {
      alert('Lütfen tarih ve saat seçiniz.');
      return;
    }

    setIsSubmitting(true);

    try {
      const appointmentData = {
        serviceId: serviceData.ilan_id,
        serviceName: serviceData.baslik,
        type: appointmentType,
        date: selectedDate,
        time: selectedTime,
        notes: notes,
        ...(chosenPackage && {
          packageId: chosenPackage.id,
          packageName: chosenPackage.title,
          price: chosenPackage.price
        })
      };

      if (onAppointmentSubmit) {
        await onAppointmentSubmit(appointmentData);
      }

      setCurrentStep(3); // Başarı sayfasına geç
      
      // 3 saniye sonra modal'ı kapat ve sayfayı yenile
      setTimeout(() => {
        handleClose();
        window.location.reload();
      }, 3000);

    } catch (error) {
      console.error('Randevu talebi gönderilirken hata:', error);
      alert('Randevu talebi gönderilirken bir hata oluştu. Lütfen tekrar deneyiniz.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Modal kapatma
  const handleClose = () => {
    if (isSubmitting) return;
    
    setCurrentStep(selectedPackage ? 2 : 1);
    setChosenPackage(selectedPackage);
    setAppointmentType(selectedPackage ? 'package' : 'regular');
    setSelectedDate('');
    setSelectedTime('');
    setNotes('');
    setWorkingHours(null);
    setAvailableTimeSlots([]);
    onClose();
  };

  // Paket seçimi
  const handlePackageSelect = (pkg) => {
    setChosenPackage(pkg);
    setAppointmentType('package');
    setCurrentStep(2);
  };

  // Paketsiz devam
  const handleWithoutPackage = () => {
    setChosenPackage(null);
    setAppointmentType('regular');
    setCurrentStep(2);
  };

  // Geri dön
  const handleBackToPackages = () => {
    setCurrentStep(1);
  };

  // Tarih değiştiğinde saati sıfırla
  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    setSelectedTime(''); // Tarih değiştiğinde saati sıfırla
  };

  if (!isOpen) return null;

  return (
    <div className="appointment-modal-overlay" onClick={handleClose}>
      <div className="appointment-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="appointment-modal-header">
          <div className="appointment-modal-header-content">
            <h3>
              <FaCalendarAlt />
              {currentStep === 1 && 'Randevu Seçenekleri'}
              {currentStep === 2 && 'Randevu Detayları'}
              {currentStep === 3 && 'Tamamlandı!'}
            </h3>
            <div className="appointment-modal-steps">
              {/* Paket seçilmemişse 3 adım, seçilmişse 2 adım göster */}
              {!selectedPackage ? (
                <>
                  <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>1</div>
                  <div className={`step-line ${currentStep >= 2 ? 'active' : ''}`}></div>
                  <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>2</div>
                  <div className={`step-line ${currentStep >= 3 ? 'active' : ''}`}></div>
                  <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>3</div>
                </>
              ) : (
                <>
                  <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>1</div>
                  <div className={`step-line ${currentStep >= 3 ? 'active' : ''}`}></div>
                  <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>2</div>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            className="appointment-modal-close"
            onClick={handleClose}
            aria-label="Kapat"
          >
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <div className="appointment-modal-body">
          
          {/* Step 1: Paket Seçimi */}
          {currentStep === 1 && (
            <div className="appointment-step package-selection">
              <div className="service-info">
                <div className="service-avatar">
                  <FaStar />
                </div>
                <div className="service-details">
                  <h4>{serviceData.baslik}</h4>
                  <p>Nasıl randevu almak istiyorsunuz?</p>
                </div>
              </div>

              <div className="appointment-type-selection">
                
                {/* Paket Seç Butonu */}
                {serviceData.packages && serviceData.packages.length > 0 && (
                  <button 
                    className="appointment-type-btn package-btn"
                    onClick={() => {
                      // İlk paketi otomatik seç veya paket seçme sayfasına git
                      if (serviceData.packages.length === 1) {
                        handlePackageSelect(serviceData.packages[0]);
                      } else {
                        // Çoklu paket varsa paket seçim sayfasına git
                        setCurrentStep(1.5); // Ara adım
                      }
                    }}
                  >
                    <div className="btn-icon">
                      <FaGift />
                    </div>
                    <div className="btn-content">
                      <h5>Paket Seç</h5>
                      <p>Hazır paketlerden birini seçin</p>
                      <span className="package-count">
                        {serviceData.packages.length} paket mevcut
                      </span>
                    </div>
                    <FaArrowRight className="btn-arrow" />
                  </button>
                )}

                {/* Paketsiz Devam Et Butonu */}
                <button 
                  className="appointment-type-btn regular-btn"
                  onClick={handleWithoutPackage}
                >
                  <div className="btn-icon">
                    <FaClipboardList />
                  </div>
                  <div className="btn-content">
                    <h5>Paket Seçmeden Devam Et</h5>
                    <p>Standart randevu alın, detayları görüşmede belirleyin</p>
                  </div>
                  <FaArrowRight className="btn-arrow" />
                </button>
              </div>
            </div>
          )}

          {/* Step 1.5: Paket Listesi (sadece çoklu paket varsa) */}
          {currentStep === 1.5 && (
            <div className="appointment-step package-list">
              <div className="package-list-header">
                <button className="back-btn" onClick={() => setCurrentStep(1)}>
                  <FaArrowLeft size={14} />
                  Geri
                </button>
                <h4>Paket Seçin</h4>
              </div>

              <div className="packages-grid">
                {serviceData.packages.map((pkg, index) => (
                  <div 
                    key={index} 
                    className={`package-card ${pkg.popular ? 'popular' : ''}`}
                    onClick={() => handlePackageSelect(pkg)}
                  >
                    {pkg.popular && <div className="popular-badge">En Popüler</div>}
                    
                    <div className="package-header">
                      <h6>{pkg.title}</h6>
                      <div className="package-price">₺{pkg.price}</div>
                      {pkg.deliveryDays && (
                        <p className="delivery-time">
                          <FaClock size={14} />
                          {pkg.deliveryDays} gün
                        </p>
                      )}
                    </div>

                    <div className="package-features">
                      {pkg.features && pkg.features.slice(0, 3).map((feature, fIndex) => (
                        <div key={fIndex} className="feature-item">
                          <FaCheckCircle size={12} />
                          <span>{feature}</span>
                        </div>
                      ))}
                      {pkg.features && pkg.features.length > 3 && (
                        <div className="more-features">
                          +{pkg.features.length - 3} özellik daha
                        </div>
                      )}
                    </div>

                    <button className="select-package-btn">
                      Seç <FaArrowRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Randevu Detayları */}
          {currentStep === 2 && (
            <div className="appointment-step appointment-details">
              
              {/* Seçim Özeti */}
              <div className="selection-summary">
                {/* Geri butonu sadece paket seçilmemişse görünsün */}
                {!selectedPackage && (
                  <button className="back-btn" onClick={handleBackToPackages}>
                    <FaArrowLeft size={14} />
                    Geri
                  </button>
                )}
                
                <div className="selected-option">
                  {chosenPackage ? (
                    <div className="selected-package">
                      <div className="package-info">
                        <h5>{chosenPackage.title}</h5>
                        <div className="package-price-display">
                          <span className="current-price">₺{chosenPackage.price}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="no-package-selected">
                      <h5>Standart Randevu</h5>
                      <p>Detaylar görüşmede belirlenecek</p>
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="appointment-form">
                {/* Tarih Seçimi */}
                <div className="form-section">
                  <label className="form-label">
                    <FaCalendarAlt size={16} />
                    Randevu Tarihi
                  </label>
                  <select
                    value={selectedDate}
                    onChange={handleDateChange}
                    required
                    className="date-select"
                  >
                    <option value="">Tarih seçiniz</option>
                    {getAvailableDates().map(date => (
                      <option key={date.toISOString()} value={date.toISOString().split('T')[0]}>
                        {date.toLocaleDateString('tr-TR', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Saat Seçimi - Dinamik */}
                <div className="form-section">
                  <label className="form-label">
                    <FaClock size={16} />
                    Randevu Saati
                    {selectedDate && workingHours && (
                      <span className="working-hours-info">
                        (Çalışma saatleri içinde seçiniz)
                      </span>
                    )}
                  </label>
                  
                  {!selectedDate && (
                    <div className="no-date-selected">
                      <p>Önce tarih seçiniz</p>
                    </div>
                  )}
                  
                  {selectedDate && loadingTimeSlots && (
                    <div className="loading-time-slots">
                      <p>Müsait saatler yükleniyor...</p>
                    </div>
                  )}
                  
                  {selectedDate && !loadingTimeSlots && availableTimeSlots.length === 0 && (
                    <div className="no-time-slots">
                      <p>Bu tarih için müsait saat bulunmamaktadır.</p>
                      <p className="working-hours-note">
                        Hizmet sağlayıcı bu tarihte çalışmıyor olabilir veya tüm randevu saatleri doludur.
                      </p>
                    </div>
                  )}
                  
                  {selectedDate && !loadingTimeSlots && availableTimeSlots.length > 0 && (
                    <div className="time-grid">
                      {availableTimeSlots.map(time => (
                        <button
                          key={time}
                          type="button"
                          className={`time-slot ${selectedTime === time ? 'selected' : ''}`}
                          onClick={() => setSelectedTime(time)}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notlar */}
                <div className="form-section">
                  <label className="form-label">Ek Notlar (İsteğe Bağlı)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Randevu ile ilgili özel isteklerinizi yazabilirsiniz..."
                    rows={3}
                    className="notes-textarea"
                  />
                </div>

                {/* 48 Saat İtiraz ve Şikayet Güvencesi Bilgilendirmesi */}
                <div className="appointment-guarantee-notice">
                  <div className="guarantee-notice-icon">
                    <FaShieldAlt size={18} />
                  </div>
                  <div className="guarantee-notice-content">
                    <strong>İki Taraflı Onay &amp; 48 Saat Şikayet / İtiraz Güvencesi</strong>
                    <p>
                      Hizmet tamamlandığında sistem üzerinden onayınız istenir. İşiniz <strong>yarım, eksik veya sorunlu</strong> biterse ya da tamamlandı aşamasına geçmezse, <strong>48 saat içinde &ldquo;Randevularım&rdquo; sayfasından itiraz ve şikayet oluşturabilirsiniz.</strong> 48 saat içinde itiraz edilmeyen randevular otomatik olarak tamamlandı kabul edilir.
                    </p>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="form-actions">
                  <button
                    type="submit"
                    className="submit-appointment-btn"
                    disabled={isSubmitting || !selectedDate || !selectedTime || loadingTimeSlots}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="loading-spinner"></div>
                        Gönderiliyor...
                      </>
                    ) : (
                      <>
                        <FaCalendarAlt size={16} />
                        Randevu Talebini Gönder
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Step 3: Başarı */}
          {currentStep === 3 && (
            <div className="appointment-step success-step">
              <div className="success-content">
                <div className="success-icon">
                  <FaCheck />
                </div>
                <h4>Talebiniz Gönderildi!</h4>
                <p>
                  Randevu talebiniz başarıyla iletildi. 
                  Hizmet sağlayıcı en kısa sürede size dönüş yapacaktır.
                </p>
                <div className="success-details">
                  <div className="detail-item">
                    <strong>Hizmet:</strong> {String(serviceData?.baslik || '')}
                  </div>
                  {chosenPackage && (
                    <div className="detail-item">
                      <strong>Paket:</strong> {String((chosenPackage as any).title || '')}
                    </div>
                  )}
                  <div className="detail-item">
                    <strong>Tarih:</strong> {selectedDate && new Date(selectedDate).toLocaleDateString('tr-TR')}
                  </div>
                  <div className="detail-item">
                    <strong>Saat:</strong> {selectedTime}
                  </div>
                </div>
                <div className="appointment-guarantee-notice appointment-guarantee-notice--compact">
                  <div className="guarantee-notice-icon">
                    <FaShieldAlt size={16} />
                  </div>
                  <div className="guarantee-notice-content">
                    <p>
                      <strong>Hatırlatma:</strong> Hizmet yarım, eksik veya sorunlu tamamlanırsa <strong>48 saat içinde</strong> Randevularım sayfasından şikayet / itiraz oluşturabilirsiniz.
                    </p>
                  </div>
                </div>
                <div className="auto-close-info">
                  <div className="progress-bar">
                    <div className="progress-fill"></div>
                  </div>
                  <p>Bu pencere otomatik olarak kapanacak...</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppointmentModal; 