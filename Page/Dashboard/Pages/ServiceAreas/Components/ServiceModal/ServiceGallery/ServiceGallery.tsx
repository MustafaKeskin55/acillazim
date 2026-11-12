"use client";

import React, { useState } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import type { DashboardGalleryImage } from "@/services/serviceAreas/myServicesDashboardService";
import "./ServiceGallery.css";

interface ServiceGalleryProps {
  images?: DashboardGalleryImage[];
}

const ServiceGallery: React.FC<ServiceGalleryProps> = ({ images = [] }) => {
  const [selectedImage, setSelectedImage] = useState<DashboardGalleryImage | null>(null);
  const displayImages = images;

  if (displayImages.length === 0) {
    return (
      <div className="service-gallery service-gallery--empty">
        <p>Henüz galeri görseli eklenmemiş.</p>
      </div>
    );
  }

  return (
    <div className="service-gallery">
      <div className="service-gallery__grid">
        {displayImages.map((image) => (
          <div
            key={String(image.id)}
            className="service-gallery__item"
            role="button"
            tabIndex={0}
            onClick={() => setSelectedImage(image)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSelectedImage(image);
              }
            }}
          >
            <img src={image.url} alt={image.title || ""} />
            <div className="service-gallery__item-overlay">
              <FaSearch />
              <span>Görüntüle</span>
            </div>
          </div>
        ))}
      </div>

      {selectedImage ? (
        <div className="service-gallery__modal" role="presentation" onClick={() => setSelectedImage(null)}>
          <div className="service-gallery__modal-content" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="service-gallery__modal-close" onClick={() => setSelectedImage(null)}>
              <FaTimes />
            </button>
            <img src={selectedImage.url} alt={selectedImage.title || ""} />
            {selectedImage.title ? <div className="service-gallery__modal-title">{selectedImage.title}</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ServiceGallery;
