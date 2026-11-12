"use client";

import React, { useState } from "react";
import { FaStar, FaArrowRight, FaBriefcase } from "react-icons/fa";
import type { MyDashboardService } from "@/services/serviceAreas/myServicesDashboardService";
import ServiceModal from "./ServiceModal/ServiceModal";
import "../Styles/ServiceCard.css";

interface ServiceCardProps {
  service: MyDashboardService;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const { title, description, image, rating, reviews, category } = service;

  return (
    <>
      <div
        className="service-card"
        role="button"
        tabIndex={0}
        onClick={() => setIsModalOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsModalOpen(true);
          }
        }}
      >
        <div className="service-card__image">
          {image && !imgFailed ? (
            <img src={image} alt={title} onError={() => setImgFailed(true)} />
          ) : (
            <div className="service-card__image-fallback" role="presentation" aria-hidden="true">
              <FaBriefcase />
            </div>
          )}
          <span className="service-card__status">Aktif Hizmet</span>
          {category ? <span className="service-card__category">{category}</span> : null}
        </div>

        <div className="service-card__content">
          <div className="service-card__body">
            <h2 className="service-card__title">{title}</h2>
            {description ? <p className="service-card__description">{description}</p> : null}
          </div>

          <div className="service-card__stats">
            <div className="service-card__meta">
              <div className="service-card__rating">
                <FaStar className="star-icon" />
                <span>{rating}</span>
              </div>
              <span className="service-card__reviews">({reviews} Yorum)</span>
            </div>
            <span className="service-card__cta">
              <span>Detaylar</span>
              <FaArrowRight className="service-card__cta-icon" />
            </span>
          </div>
        </div>
      </div>

      <ServiceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} service={service} />
    </>
  );
};

export default ServiceCard;
