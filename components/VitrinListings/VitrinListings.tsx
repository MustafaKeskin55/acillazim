"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import "./VitrinListings.css";
import ProductCard from "@/components/ProductCard/ProductCard";
import { IoNewspaperOutline } from "react-icons/io5";
import favoriteService from "@/services/favorites/favoriteService";
import { showFavoriteNotification, showErrorNotification } from "@/utils/favoriteUtils";

const FALLBACK_IMAGE = "https://picsum.photos/300/200?text=Acillazim.com";

interface Listing {
  ilan_id?: string | number;
  id?: string | number;
  [key: string]: unknown;
}

interface VitrinListingsProps {
  listings?: Listing[];
}

function VitrinListings({ listings }: VitrinListingsProps) {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // window erişimi client-side'da
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 880);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleFavoriteToggle = async (id: string | number, isFavorite: boolean) => {
    try {
      if (isFavorite) {
        const response = await favoriteService.removeFromFavorites(id);
        if (response.success) {
          showFavoriteNotification(false);
        } else {
          showErrorNotification("Favorilerden çıkarma", new Error(response.message));
        }
      } else {
        const response = await favoriteService.addToFavorites(id);
        if (response.success) {
          showFavoriteNotification(true);
        } else {
          showErrorNotification("Favorilere ekleme", new Error(response.message));
        }
      }
    } catch (error) {
      showErrorNotification("Favori işlemi", error as Error);
    }
  };

  const handleProductClick = (id: string | number) => {
    console.log(`Ürün tıklandı: ${id}`);
  };

  const getValidImageUrl = (url: string): string => {
    if (!url || url.includes("figma.com") || url.includes("Expires=")) {
      return FALLBACK_IMAGE;
    }
    return url;
  };

  const renderItems = () => {
    const items: React.ReactNode[] = [];
    let adCount = 0;
    const productList = listings || [];
    const limitedCards = productList.slice(0, 20);

    limitedCards.forEach((card, index) => {
      items.push(
        <ProductCard
          key={`card-${index}`}
          product={card}
          onFavoriteToggle={handleFavoriteToggle}
          onProductClick={handleProductClick}
        />
      );

      if (isMobile && (index + 1) % 6 === 0 && adCount < 2 && index !== limitedCards.length - 1) {
        adCount++;
      }
    });

    return items;
  };

  const handleVitrinButtonClick = () => {
    router.push("/filtrele/tum-ilanlar?vitrin_durumu=vitrin");
  };

  return (
    <div className="vitrin-listings">
      <div className="vitrin-listings-header">
        <h3 className="fw-bold">Vitrin İlanları</h3>
        <button onClick={handleVitrinButtonClick}>
          <IoNewspaperOutline className="button-icon" /> Tümünü Gör
        </button>
      </div>
      <div className="vitrin-listings-container">{renderItems()}</div>
    </div>
  );
}

export default VitrinListings;
