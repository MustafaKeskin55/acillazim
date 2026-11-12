"use client";

import React from "react";
import { useRouter } from "next/navigation";
import ProductGallery from "../components/Gallery/ProductGallery";
import ProductDescription from "../components/ProductInfo/ProductDescription";
import ProductFeatures from "../components/ProductInfo/ProductFeatures";
import AdditionalInfo from "../components/PropertyDetails/AdditionalInfo/AdditionalInfo";
import MapSection from "../components/Location/MapSection";
import ListingPriceCard from "../components/PriceCard/ListingPriceCard";
import SellerInfo from "../components/Seller/SellerInfo";
import SimilarProducts from "../components/Related/SimilarProducts";
import PropertyFeatureTags from "../components/PropertyDetails/PropertyFeatureTags";
import VehicleDamageDisplay from "@/components/CarDamageView/VehicleDamageDisplay";
import NearbyListings from "@/components/NearbyListings/NearbyListings";
import * as messageService from "@/services/message/messageService";
import authService from "@/services/auth/authService";
import { decodeHtmlEntities } from "@/services/listings/util/listingUtils";
import "./MobileListingDetail.css";

export interface MobileListingDetailProps {
  product: Record<string, unknown>;
  seller?: Record<string, unknown> | null;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  userCity?: string;
  isAuthenticated?: boolean;
  onReportClick?: () => void;
}

const MobileListingDetail: React.FC<MobileListingDetailProps> = ({
  product: p,
  seller,
  isFavorite,
  onToggleFavorite,
  userCity,
  isAuthenticated,
  onReportClick,
}) => {
  const router = useRouter();
  const konum = (p.konum || {}) as Record<string, string>;
  const konumRaw = (p.konum || {}) as Record<string, unknown>;
  const iletisim = (p.iletisim_bilgileri || {}) as Record<string, string>;
  const ilanSahibi = (p.ilan_sahibi || {}) as Record<string, unknown>;
  const phoneRaw =
    iletisim.telefon || (ilanSahibi.telefon as string) || "";
  const formattedPhoneForCall = String(phoneRaw).replace(/[-\s]/g, "");
  const sellerId =
    (seller as Record<string, unknown> | undefined)?.id ??
    ilanSahibi.user_id ??
    ilanSahibi.id;
  const listingId = p.ilan_id;

  const locationForCard = {
    ...konum,
    district: konum.ilce || konum.district,
    city: konum.il || konum.city,
    title: p.baslik,
    image: Array.isArray(p.resimler) ? (p.resimler as string[])[0] : undefined,
  };

  const handleMessageClick = async (e: React.MouseEvent) => {
    e.preventDefault();

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname + window.location.search;
        router.push(`/giris?redirect_after=${encodeURIComponent(currentPath)}`);
      } else {
        router.push('/giris');
      }
      return;
    }

    const currentUserId = (currentUser as any)?.id || (currentUser as any)?.user_id || (currentUser as any)?.userId;
    const sellerIdNum = parseInt(String(sellerId), 10);

    if (!sellerIdNum || isNaN(sellerIdNum)) {
      alert('İlan sahibinin kullanıcı bilgisi bulunamadı.');
      return;
    }

    if (currentUserId && String(currentUserId) === String(sellerIdNum)) {
      alert('Kendi ilanınıza mesaj gönderemezsiniz.');
      return;
    }

    try {
      let conversation = await messageService.getConversationWithUser(sellerIdNum);
      if (!conversation) {
        conversation = await messageService.createConversation(sellerIdNum, listingId as any);
      }

      if (!conversation || !conversation.conversation_id) {
        throw new Error('Konuşma başlatılamadı');
      }

      try {
        sessionStorage.setItem(
          'message_thread_context',
          JSON.stringify({
            conversation_id: conversation.conversation_id,
            listing_id: listingId,
            seller_id: sellerIdNum,
            listingInfo: {
              title: String(p.baslik || 'İlan'),
              price: p.fiyat ? `${new Intl.NumberFormat('tr-TR').format(Number(p.fiyat))} TL` : '',
              image: locationForCard.image || null,
              location: locationForCard,
            },
          })
        );
      } catch {
        /* ignore */
      }
      router.push(`/dashboard/mesajlar/${conversation.conversation_id}`);
    } catch (error) {
      console.error(error);
      alert('Mesaj sayfasına yönlendirilirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const shareListing = () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator
        .share({
          title: String(p.baslik || ""),
          text: `${String(p.baslik || "")} - Acillazım.net`,
          url: window.location.href,
        })
        .catch(() => {});
    }
  };

  const titleDecoded = decodeHtmlEntities(String(p.baslik || ""));
  const dateStr = p.ilan_tarihi
    ? (() => {
        try {
          const d = new Date(String(p.ilan_tarihi));
          if (!isNaN(d.getTime())) return d.toLocaleDateString("tr-TR");
        } catch {
          /* ignore */
        }
        return new Date().toLocaleDateString("tr-TR");
      })()
    : new Date().toLocaleDateString("tr-TR");

  const ozellikler = p.ozellikler as Record<string, unknown> | undefined;
  const propertyType =
    ozellikler?.mulk_tipi ||
    (typeof p.kategori === "string"
      ? p.kategori
      : (p.kategori as Record<string, string> | undefined)?.name || "");

  const mapCoordinates = {
    lat: konumRaw.lat ?? konumRaw.enlem ?? 41.0082,
    lng: konumRaw.lng ?? konumRaw.boylam ?? 28.9784,
  };
  const mapAddress =
    String(konumRaw.tam_adres || konumRaw.adres || "").trim() ||
    [konumRaw.mahalle, konum.ilce || konum.district, konum.il || konum.city].filter(Boolean).join(", ");

  const hasVehicleDamage =
    (ozellikler?.hasar_durumlari &&
      typeof ozellikler.hasar_durumlari === "object" &&
      Object.keys(ozellikler.hasar_durumlari as object).length > 0) ||
    (ozellikler?.parca_durumlari &&
      typeof ozellikler.parca_durumlari === "object" &&
      Object.keys(ozellikler.parca_durumlari as object).length > 0);

  return (
    <div className="mobile-listing-detail-root">
      <section className="mobile-listing-hero" aria-label="İlan görselleri">
        <ProductGallery product={p} />
      </section>

      <div className="mobile-listing-sheet">
        <div className="mobile-listing-price-block">
          <span className="mobile-listing-price-currency">₺</span>
          <span className="mobile-listing-price-value">
            {new Intl.NumberFormat("tr-TR").format(Number(p.fiyat || 0))}
          </span>
        </div>

        <h1 className="mobile-listing-title">{titleDecoded}</h1>

        <div className="mobile-listing-meta-toolbar">
          <div className="mobile-listing-meta-row">
            <span className="mobile-listing-id">İlan No: {String(p.ilan_id)}</span>
            <span className="mobile-listing-date">{dateStr}</span>
          </div>
          <div className="mobile-listing-actions">
            <button
              type="button"
              className={`mobile-listing-action-btn mobile-listing-action-btn--fav ${isFavorite ? "is-active" : ""}`}
              onClick={onToggleFavorite}
              aria-label="Favoriler"
            >
              <i className={`${isFavorite ? "fas" : "far"} fa-heart`} />
            </button>
            <button
              type="button"
              className="mobile-listing-action-btn"
              onClick={shareListing}
              aria-label="Paylaş"
            >
              <i className="fas fa-share-alt" />
            </button>
            <button
              type="button"
              className="mobile-listing-action-btn mobile-listing-action-btn--report"
              onClick={() => onReportClick?.()}
              aria-label="İlanı Şikayet Et"
              title="İlanı Şikayet Et"
            >
              <i className="fas fa-flag" />
            </button>
          </div>
        </div>

        <div className="mobile-listing-chips">
          {(konum.ilce || konum.district) && (konum.il || konum.city) && (
            <span className="mobile-listing-chip">
              <i className="fas fa-map-marker-alt" aria-hidden />
              {konum.ilce || konum.district}, {konum.il || konum.city}
            </span>
          )}
          {!!propertyType && (
            <span className="mobile-listing-chip mobile-listing-chip--muted">{String(propertyType)}</span>
          )}
        </div>

        <div className="mobile-listing-tags-wrap">
          <PropertyFeatureTags
            features={p.ozellikler}
            propertyType={String(propertyType || "")}
            category={p.kategori}
          />
        </div>

        <div className="mobile-listing-contact-card mobile-listing-contact-card--above-description">
          <ListingPriceCard
            price={p.fiyat}
            currency={p.para_birimi}
            location={locationForCard}
            features={p.ozellikler}
            phone={phoneRaw || "0555-915-55-48"}
            sellerId={sellerId != null ? String(sellerId) : "0"}
            listingId={listingId}
          />
        </div>

        <details className="mobile-listing-details-block" open>
          <summary>Açıklama</summary>
          <div className="mobile-listing-details-body">
            <ProductDescription description={String(p.aciklama || "")} />
          </div>
        </details>

        <details className="mobile-listing-details-block">
          <summary>İlan özellikleri</summary>
          <div className="mobile-listing-details-body">
            <ProductFeatures features={p.ozellikler} />
          </div>
        </details>

        <details className="mobile-listing-details-block">
          <summary>Konum</summary>
          <div className="mobile-listing-details-body">
            <p className="mobile-listing-address">
              {(konum.ilce || konum.district) && (konum.il || konum.city)
                ? `${konum.ilce || konum.district}, ${konum.il || konum.city}`
                : "Konum bilgisi"}
            </p>
            <MapSection coordinates={mapCoordinates} address={mapAddress || "Konum bilgisi"} />
          </div>
        </details>

        {seller ? <SellerInfo seller={seller} /> : null}
        <AdditionalInfo additionalInfo={p.ek_bilgiler} />

        {hasVehicleDamage ? (
          <div className="mobile-listing-damage">
            <VehicleDamageDisplay productData={p} showTitle titleText="Boyalı veya Değişen Parça" />
          </div>
        ) : null}

        <section className="mobile-listing-similar-wrap" aria-label="Benzer ilanlar">
          <SimilarProducts productId={p.ilan_id} categoryId={p.category_id} limit={50} />
        </section>

        {isAuthenticated ? (
          <div className="mobile-listing-nearby">
            <NearbyListings
              itemLimit={15}
              customTitle={`${(userCity || "istanbul").toLocaleUpperCase("tr-TR")} BÖLGESİNDEKİ İLANLAR`}
              onItemClick={(id: unknown) => {
                window.location.href = `/ilan/${id}`;
              }}
            />
          </div>
        ) : null}
      </div>

      <nav className="mobile-listing-sticky" aria-label="Hızlı işlemler">
        {formattedPhoneForCall ? (
          <a href={`tel:${formattedPhoneForCall}`} className="mobile-listing-sticky-btn mobile-listing-sticky-btn--call">
            <i className="fas fa-phone-alt" aria-hidden />
            Ara
          </a>
        ) : (
          <span className="mobile-listing-sticky-btn mobile-listing-sticky-btn--call mobile-listing-sticky-btn--disabled">
            <i className="fas fa-phone-alt" aria-hidden />
            Telefon yok
          </span>
        )}
        <button type="button" className="mobile-listing-sticky-btn mobile-listing-sticky-btn--msg" onClick={handleMessageClick}>
          <i className="fas fa-envelope" aria-hidden />
          Mesaj
        </button>
      </nav>
    </div>
  );
};

export default MobileListingDetail;
