import React from 'react';
import { FaBullhorn, FaRegCalendarCheck } from 'react-icons/fa';
import type { EmptyStateOnboardingProps } from './EmptyStateOnboarding';

/**
 * Sayfalara özel onboarding içerikleri.
 * Yalnızca metin/yönlendirme içerir; hiçbir iş verisi (ilan, randevu vb.) barındırmaz.
 */
export const NO_LISTING_PRESET: EmptyStateOnboardingProps = {
  icon: <FaBullhorn />,
  eyebrow: 'HİZMET VERENLER İÇİN',
  title: 'Uzmanlığınızı kazanca dönüştürmeye başlayın',
  description:
    'Şu anda yayında bir ilanınız yok. İlk ilanınızı oluşturun, bölgenizdeki müşteriler sizi bulsun ve doğrudan randevu alsın.',
  steps: [
    { title: 'İlanınızı oluşturun', description: 'Hizmetinizi, fiyatınızı ve bölgenizi girin.' },
    { title: 'Çalışma saatlerinizi seçin', description: 'Hangi gün ve saatlerde müsait olduğunuzu belirleyin.' },
    { title: 'Randevuları yönetin', description: 'Gelen talepleri onaylayın, takviminizi tek yerden izleyin.' },
  ],
  benefits: [
    'Müşterilerle doğrudan iletişim',
    'Otomatik randevu ve takvim yönetimi',
    'İl ve ilçe bazlı müşteri eşleşmesi',
    'İlan performansınızı istatistiklerle takip edin',
  ],
  ctaLabel: 'İlk ilanımı oluştur',
  ctaHref: '/ilan-ver',
};

export const NO_SERVICE_FOR_HOURS_PRESET: EmptyStateOnboardingProps = {
  icon: <FaRegCalendarCheck />,
  eyebrow: 'MÜSAİT SAATLER',
  title: 'Müsait saatleriniz için önce bir hizmet ilanı gerekli',
  description:
    'Çalışma gün ve saatleriniz hizmet ilanınıza bağlıdır. Bir ilan yayınladığınızda müşteriler yalnızca sizin belirlediğiniz saatlerde randevu alabilir.',
  steps: [
    { title: 'Hizmet ilanı açın', description: 'Uzmanlık alanınızı ve fiyatınızı belirleyin.' },
    { title: 'Haftalık planı yapın', description: 'Açık günleri ve mesai saatlerini seçin.' },
    { title: 'Doluluğu takip edin', description: 'Randevular ve yoğun saatler bu ekranda görünür.' },
  ],
  ctaLabel: 'Hizmet ilanı oluştur',
  ctaHref: '/ilan-ver',
  secondaryLabel: 'Randevularım',
  secondaryHref: '/dashboard/randevular',
};

