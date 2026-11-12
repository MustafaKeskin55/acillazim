// Bu index.js dosyası, tüm bileşenleri tek bir yerden dışa aktarmak için kullanılıyor
// Böylece ana sayfada tekil import'lar yerine tek bir import kullanılabilir

// Ürün Bilgileri
import ProductInfo from './ProductInfo/ProductInfo';
import ProductDescription from './ProductInfo/ProductDescription';
import ProductFeatures from './ProductInfo/ProductFeatures';
import AdditionalInfo from './PropertyDetails/AdditionalInfo/AdditionalInfo';
import PropertyFeatureTags from './PropertyDetails/PropertyFeatureTags';

// Fiyat ve Özellikler
import ListingPriceCard from './PriceCard/ListingPriceCard';

// Galeri
import ProductGallery from './Gallery/ProductGallery';

// Konum
import MapSection from './Location/MapSection';

// Satıcı
import SellerInfo from './Seller/SellerInfo';

// Aksiyonlar
import ShareSection from './Actions/ShareSection';
import FavoriteButton from './Actions/FavoriteButton';

// Benzer İlanlar
import SimilarProducts from './Related/SimilarProducts';

// Tüm bileşenleri tek bir export ile dışa aktar
export {
  ProductInfo,
  ProductDescription,
  ProductFeatures,
  AdditionalInfo,
  ListingPriceCard,
  ProductGallery,
  MapSection,
  SellerInfo,
  ShareSection,
  FavoriteButton,
  SimilarProducts,
  PropertyFeatureTags
}; 