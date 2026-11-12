"use client";

import React from "react";
import { FaMapMarkerAlt, FaCheckCircle } from "react-icons/fa";
import type { DashboardServiceLocation } from "@/services/serviceAreas/myServicesDashboardService";
import "./ServiceLocations.css";

interface ServiceLocationsProps {
  locations?: DashboardServiceLocation[];
}

const ServiceLocations: React.FC<ServiceLocationsProps> = ({ locations = [] }) => {
  if (locations.length === 0) {
    return (
      <div className="service-locations service-locations--empty">
        <div className="service-locations__header">
          <div className="service-locations__icon">
            <FaMapMarkerAlt />
          </div>
          <div className="service-locations__title">
            <h3>Hizmet Verilen Bölgeler</h3>
            <p>Kayıtlı bölge bilgisi bulunmuyor.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="service-locations">
      <div className="service-locations__header">
        <div className="service-locations__icon">
          <FaMapMarkerAlt />
        </div>
        <div className="service-locations__title">
          <h3>Hizmet Verilen Bölgeler</h3>
          <p>Aşağıdaki bölgelerde hizmet verilmektedir</p>
        </div>
      </div>

      <div className="service-locations__grid">
        {locations.map((location) => (
          <div
            key={String(location.id)}
            className={`service-locations__card ${!location.isActive ? "service-locations__card--inactive" : ""}`}
          >
            <div className="service-locations__card-header">
              <h4>{location.district}</h4>
              {location.isActive ? (
                <span className="service-locations__status service-locations__status--active">
                  <FaCheckCircle />
                  Aktif
                </span>
              ) : (
                <span className="service-locations__status service-locations__status--inactive">Yakında</span>
              )}
            </div>

            <div className="service-locations__neighborhoods">
              {location.neighborhoods.map((neighborhood, index) => (
                <div key={`${location.id}-${index}`} className="service-locations__neighborhood">
                  <FaMapMarkerAlt />
                  <span>{neighborhood}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServiceLocations;
