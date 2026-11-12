'use client';

import React, { createContext, useState, useContext } from 'react';

interface ServiceAreas {
  map: unknown[];
  manual: unknown[];
}

interface ServiceAreasContextType {
  serviceAreas: ServiceAreas;
  loading: boolean;
  error: string | null;
  fetchServiceAreas: () => Promise<void>;
  saveAreas: (type: string, areas: unknown[]) => Promise<boolean>;
  deleteAreas: (type: string) => Promise<boolean>;
  deleteAllAreas: () => Promise<boolean>;
}

const ServiceAreasContext = createContext<ServiceAreasContextType | null>(null);

export const ServiceAreasProvider = ({ children }: { children: React.ReactNode }) => {
  const [serviceAreas, setServiceAreas] = useState<ServiceAreas>({ map: [], manual: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showNotification = (type: string, message: string): void => {
    console.log(`${type}: ${message}`);
  };

  // NOT: Bu context hiçbir bileşen tarafından tüketilmiyor (bkz. useServiceAreas
  // kullanım araması) ve gerçek bir listingId taşımıyor — app genelinde tek bir
  // (ilan bazlı olmayan) store varmış gibi davranıyordu. Gerçek özellik
  // (ServiceEdit.jsx → ServiceAreaSelector embedded=true) artık route'tan gelen
  // gerçek listingId ile doğrudan serviceAreasAPI'yi çağırıyor (bkz. ServiceEdit.jsx).
  // Bu context'in metodları listingId olmadan backend'e güvenle istek atamayacağı
  // için (serviceAreasAPI artık listingId'siz çağrıya izin vermiyor) burada
  // bilinçli olarak devre dışı bırakıldı; yanlışlıkla kullanılırsa anlaşılır bir
  // hata fırlatır.
  const NOT_WIRED_MESSAGE =
    'ServiceAreasContext bir listingId taşımıyor; hizmet bölgesi işlemleri için ' +
    'ServiceAreaSelector\'ı embedded modda gerçek listingId ile kullanın.';

  const fetchServiceAreas = async (): Promise<void> => {
    setError(NOT_WIRED_MESSAGE);
    showNotification('error', NOT_WIRED_MESSAGE);
  };

  const saveAreas = async (): Promise<boolean> => {
    showNotification('error', NOT_WIRED_MESSAGE);
    return false;
  };

  const deleteAreas = async (): Promise<boolean> => {
    showNotification('error', NOT_WIRED_MESSAGE);
    return false;
  };

  const deleteAllAreas = async (): Promise<boolean> => {
    showNotification('error', NOT_WIRED_MESSAGE);
    return false;
  };

  return (
    <ServiceAreasContext.Provider
      value={{ serviceAreas, loading, error, fetchServiceAreas, saveAreas, deleteAreas, deleteAllAreas }}
    >
      {children}
    </ServiceAreasContext.Provider>
  );
};

export const useServiceAreas = (): ServiceAreasContextType => {
  const context = useContext(ServiceAreasContext);
  if (!context) {
    throw new Error("useServiceAreas hook'u ServiceAreasProvider içinde kullanılmalıdır.");
  }
  return context;
};

export default ServiceAreasContext;
