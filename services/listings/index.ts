/**
 * Listings Services Index
 * Tüm listing servislerini tek bir noktadan dışa aktarır
 */
import nearbyListingsService from '@/services/listings/nearby-listings';
import featuredListingsService from '@/services/listings/featured-listings';
import vitrinListingsService from '@/services/listings/vitrin-listings';
import categoryService from '@/services/category/categoryService';
import popularLocationsService from '@/services/listings/popular-locations/popularLocationsService';

// Tüm servisler birlikte dışa aktarılır
export {
  nearbyListingsService,
  featuredListingsService,
  vitrinListingsService,
  categoryService,
  popularLocationsService
};

// Geriye dönük uyumluluk ve tek noktadan erişim için tüm servisleri içeren objeyi dışa aktar
export default {
  nearbyListingsService,
  featuredListingsService,
  vitrinListingsService,
  categoryService,
  popularLocationsService
};
