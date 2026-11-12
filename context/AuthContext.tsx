'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';
import { STORAGE_KEYS } from '@/config/constants';
import authService from '@/services/auth/authService';
import api from '@/services/api/ürapi';

interface UserData {
  name?: string;
  email?: string;
  [key: string]: unknown;
}

interface LoginResult {
  success: boolean;
  user?: UserData;
  error?: string;
}

interface LogoutResult {
  success: boolean;
  error?: string;
}

interface AuthContextType {
  user: UserData | null;
  currentUser: UserData | null;
  authToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => LogoutResult;
  updateAuthState: (isAuth: boolean, userData: UserData | null, authSource?: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        authService.checkAuth();
        const isLoggedIn = authService.isUserLoggedIn();
        const currentUserData = authService.getCurrentUser();
        const token = authService.getToken();

        if (isLoggedIn && currentUserData && token) {
          setAuthToken(token);
          setCurrentUser(currentUserData);
          setIsAuthenticated(true);
          console.log('[AuthContext] Kullanıcı giriş yapmış durumda:', currentUserData.name || currentUserData.email);

          // Arka planda DB profil senkronizasyonu (İsim, konum, telefon, avatar ve kapak)
          api.fetchBasicInfo().then((profile) => {
            if (profile) {
              const pic = profile.profileImage || (profile as unknown as Record<string, string>)?.profilePicture;
              const name = profile.fullName;
              authService.updateCurrentUserProfile({
                ...(name ? { name, fullName: name } : {}),
                ...(profile.phone ? { phone: profile.phone } : {}),
                ...(profile.address?.city ? { city: profile.address.city } : {}),
                ...(profile.address?.district ? { district: profile.address.district } : {}),
                ...(pic ? { profilePicture: pic, picture: pic, profilePic: pic } : {}),
                ...(profile.coverImage ? { coverImage: profile.coverImage } : {})
              });
              setCurrentUser(authService.getCurrentUser());
            }
          }).catch(() => {});
        } else {
          setAuthToken(null);
          setCurrentUser(null);
          setIsAuthenticated(false);
          console.log('[AuthContext] Kullanıcı giriş yapmamış');
        }
      } catch (err) {
        console.error('[AuthContext] Oturum başlatma hatası:', err);
        setError('Oturum başlatılırken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const unsubscribe = authService.subscribe(() => {
      setAuthToken(authService.getToken());
      setCurrentUser(authService.getCurrentUser());
      setIsAuthenticated(authService.isUserLoggedIn());
    });

    const handleProfileUpdate = () => {
      setCurrentUser(authService.getCurrentUser());
    };
    window.addEventListener('userProfileUpdated', handleProfileUpdate);

    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener('userProfileUpdated', handleProfileUpdate);
    };
  }, []);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      setLoading(true);
      setError(null);
      const result = await authService.login({ username: email, password });
      setAuthToken(authService.getToken());
      setCurrentUser(authService.getCurrentUser());
      setIsAuthenticated(authService.isUserLoggedIn());
      console.log('[Auth] Kullanıcı başarıyla giriş yaptı:', result.user.name || result.user.email);
      return { success: true, user: result.user };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Giriş yapılırken bir hata oluştu';
      console.error('[Auth] Giriş yapma hatası:', err);
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const logout = (): LogoutResult => {
    try {
      authService.logout();
      setAuthToken(null);
      setCurrentUser(null);
      setIsAuthenticated(false);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Çıkış yapılırken bir hata oluştu';
      console.error('[Auth] Çıkış yapma hatası:', err);
      return { success: false, error: message };
    }
  };

  const updateAuthState = (isAuth: boolean, userData: UserData | null, authSource?: string) => {
    try {
      console.log('🔄 updateAuthState çağrıldı:', { isAuth, userData, authSource });
      if (isAuth && userData) {
        const token = authService.getToken();
        const currentUserData = authService.getCurrentUser();
        const isLoggedIn = authService.isUserLoggedIn();
        console.log('📊 AuthService verileri:', { token, currentUserData, isLoggedIn });
        setAuthToken(token);
        setCurrentUser(currentUserData);
        setIsAuthenticated(isLoggedIn);
        console.log('✅ AuthContext state güncellendi:', currentUserData?.name || currentUserData?.email);
      } else {
        setCurrentUser(null);
        setIsAuthenticated(false);
        setAuthToken(null);
        console.log('❌ AuthContext state temizlendi');
      }
    } catch (err) {
      console.error('❌ [AuthContext] State güncellenirken hata:', err);
      setError('Oturum durumu güncellenirken bir hata oluştu');
    }
  };

  const values: AuthContextType = {
    user: currentUser,
    currentUser,
    authToken,
    isAuthenticated,
    loading,
    error,
    login,
    logout,
    updateAuthState
  };

  return (
    <AuthContext.Provider value={values}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth hook AuthProvider içinde kullanılmalıdır!');
  }
  return context;
};

export default AuthContext;
