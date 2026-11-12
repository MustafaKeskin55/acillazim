"use client";

import React, { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import authService from '@/services/auth/authService';

interface AuthOnlyRouteProps {
    redirectPath?: string;
    children?: React.ReactNode;
}

/**
 * Sadece oturum açmamış kullanıcılar için rota bileşeni
 * Giriş, kayıt gibi sayfalar için kullanılır
 * Zaten oturum açmışsa ana sayfaya veya başka bir yola yönlendirir
 *
 * @param {AuthOnlyRouteProps} props - Props
 * @param {string} [props.redirectPath="/"] - Yönlendirilecek yol
 * @returns {JSX.Element | null} - İçerik veya yönlendirme
 */
const AuthOnlyRoute = ({
    redirectPath = '/',
    children
}: AuthOnlyRouteProps) => {
    const searchParams = useSearchParams();

    const [authState, setAuthState] = useState({
        isAuthenticated: authService.isUserLoggedIn(),
        isLoading: true
    });

    // URL'den redirect_after parametresini al
    const getRedirectPath = () => {
        const redirectAfter = searchParams.get('redirect_after');
        return redirectAfter ? decodeURIComponent(redirectAfter) : redirectPath;
    };

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

    // Eğer oturum açılmışsa, redirect_after parametresine veya ana sayfaya yönlendir
    if (authState.isAuthenticated) {
        const finalRedirectPath = getRedirectPath();

        // Sayfa yenilemesi yerine tam sayfa yenilemesi yaparak yönlendirelim
        const noCache = new Date().getTime();
        window.location.replace(`${finalRedirectPath}?nocache=${noCache}`);
        return null;
    }

    // Children render et
    return <>{children}</>;
};

export default AuthOnlyRoute;
