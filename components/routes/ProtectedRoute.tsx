"use client";

import React, { useEffect, useState } from 'react';
import authService from '@/services/auth/authService';

interface ProtectedRouteProps {
    requiredRoles?: string | string[];
    redirectPath?: string;
    children?: React.ReactNode;
}

/**
 * Korumalı rota bileşeni
 * Sadece oturum açmış kullanıcıların erişebileceği rotaları korur
 * Oturum açılmamışsa giriş sayfasına yönlendirir
 *
 * @param {ProtectedRouteProps} props - Props
 * @param {string|string[]} [props.requiredRoles] - Gerekli rol veya roller (opsiyonel)
 * @param {string} [props.redirectPath="/giris"] - Yönlendirilecek yol
 * @returns {JSX.Element | null} - Korumalı içerik veya yönlendirme
 */
const ProtectedRoute = ({
    requiredRoles,
    redirectPath = '/giris',
    children
}: ProtectedRouteProps) => {
    const [authState, setAuthState] = useState({
        isAuthenticated: authService.isUserLoggedIn(),
        isLoading: true
    });

    useEffect(() => {
        // AuthService'den oturum durumu değişikliklerini dinle
        const unsubscribe = authService.subscribe((state: { isAuthenticated: boolean }) => {
            setAuthState({
                isAuthenticated: state.isAuthenticated,
                isLoading: false
            });
        });

        // İlk yükleme kontrolü
        const checkInitialAuth = () => {
            setAuthState({
                isAuthenticated: authService.isUserLoggedIn(),
                isLoading: false
            });
        };

        checkInitialAuth();

        // Temizleme fonksiyonu
        return () => {
            unsubscribe();
        };
    }, []);

    // Yükleme sırasında null döndür
    if (authState.isLoading) {
        return null; // Veya bir yükleme göstergesi
    }

    // Rol kontrolü
    if (requiredRoles && authState.isAuthenticated) {
        const hasRequiredRole = authService.hasRole(requiredRoles);
        if (!hasRequiredRole) {
            // Kullanıcı giriş yapmış ama gerekli rollere sahip değil
            window.location.replace('/erisim-yok');
            return null;
        }
    }

    // Oturum kontrolü
    if (!authState.isAuthenticated) {
        // Oturum açmamışsa, mevcut yolu redirect_after parametresi olarak ekleyerek giriş sayfasına yönlendir
        const fullPath = typeof window !== 'undefined' ? (window.location.pathname + window.location.search) : '';
        const returnUrl = encodeURIComponent(fullPath || '/');
        const loginUrl = `${redirectPath}?redirect_after=${returnUrl}`;

        // Tam sayfa yenilemesi kullan - önbelleği bypass et
        const noCache = new Date().getTime();
        window.location.replace(`${loginUrl}&nocache=${noCache}`);
        return null;
    }

    // Children render et
    return <>{children}</>;
};

export default ProtectedRoute;
