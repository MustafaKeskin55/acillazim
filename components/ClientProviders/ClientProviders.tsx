"use client";

import { useEffect, useState } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/AuthContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { LocationProvider } from "@/context/LocationContext";
import { ServiceAreasProvider } from "@/context/ServiceAreasContext";
import AppShell from "@/components/AppShell/AppShell";
import TrafficTracker from "@/components/TrafficTracker/TrafficTracker";
import ErrorModal from "@/components/common/ErrorModal";
import { initApiInterceptors } from '@/services/utils/apiInterceptors';
import realtimeService from '@/services/realtime/realtimeService';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Uygulama genelinde 401 (kimlik doğrulama gerekli) yanıtlarını yakalayıp
  // kullanıcıyı otomatik olarak /giris'e yönlendiren merkezi interceptor
  // ve tarayıcının yerel window.alert penceresi yerine kurumsal modalımızı açan köprü.
  useEffect(() => {
    initApiInterceptors();
    realtimeService.connect();

    const originalAlert = window.alert;
    window.alert = (msg?: unknown) => {
      setAlertMessage(msg != null ? String(msg) : "");
    };

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  return (
    <GoogleOAuthProvider clientId="985548020022-1vg3ua48u2ta9bskiufbh51b008hg93h.apps.googleusercontent.com">
      <AuthProvider>
        <FavoritesProvider>
          <LocationProvider>
            <ServiceAreasProvider>
              <SidebarProvider>
                <AppShell>{children}</AppShell>
                <TrafficTracker />
                <Toaster />
                <ErrorModal
                  show={alertMessage !== null}
                  errors={alertMessage || ""}
                  onClose={() => setAlertMessage(null)}
                />
              </SidebarProvider>
            </ServiceAreasProvider>
          </LocationProvider>
        </FavoritesProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

