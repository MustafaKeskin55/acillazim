"use client";

import React, { useEffect, useState } from 'react';
import authService from '@/services/auth/authService';

interface UserDatabase {
  [key: string]: unknown;
}

const AuthStatus: React.FC = () => {
  const [userDatabase, setUserDatabase] = useState<UserDatabase | null>(null);
  const [refreshCounter, setRefreshCounter] = useState<number>(0);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = () => {
      try {
        // authService üzerinden kullanıcı verisi al
        const user = authService.getCurrentUser() as Record<string, string> | null;
        setCurrentUser(user);
        setIsAuthenticated(!!user);

        // localStorage'dan ham veri
        const raw = typeof window !== 'undefined' ? localStorage.getItem('users') : null;
        if (raw) setUserDatabase(JSON.parse(raw) as UserDatabase);
      } catch (error) {
        console.error('Veritabanı okuma hatası:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const unsubscribe = authService.subscribe
      ? authService.subscribe(() => fetchData())
      : undefined;
    return () => { if (unsubscribe) unsubscribe(); };
  }, [refreshCounter]);

  const handleRefresh = () => setRefreshCounter((prev) => prev + 1);

  const handleAddSampleUser = async () => {
    try {
      const sampleUser = {
        name: `Test Kullanıcı ${Date.now()}`,
        email: `test${Date.now()}@acillazim.com`,
        username: `testuser${Date.now()}`,
        password: 'Password123!',
        phone: '+90 555 123 4567',
      };
      // authService.register varsa çağır
      if (typeof (authService as unknown as Record<string, unknown>).register === 'function') {
        const result = await (authService as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>).register(sampleUser);
        console.log('Örnek kullanıcı kaydedildi:', result);
      }
      handleRefresh();
    } catch (error) {
      console.error('Örnek kullanıcı ekleme hatası:', error);
    }
  };

  const formatJSON = (data: unknown): string => {
    try { return JSON.stringify(data, null, 2); }
    catch (error) { return 'JSON dönüştürme hatası: ' + (error as Error).message; }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'monospace' }}>
      <h1 style={{ color: '#333', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>Oturum Durumu</h1>
      {loading ? (
        <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '5px' }}>Yükleniyor...</div>
      ) : (
        <div>
          <div style={{ marginBottom: '20px', padding: '15px', background: isAuthenticated ? '#e6ffe6' : '#ffe6e6', borderRadius: '5px' }}>
            <h2>Oturum Durumu: {isAuthenticated ? 'Giriş Yapılmış ✅' : 'Giriş Yapılmamış ❌'}</h2>
            {isAuthenticated && (
              <>
                <p><strong>Kullanıcı:</strong> {currentUser?.name} ({currentUser?.email})</p>
              </>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <button onClick={handleRefresh} style={{ padding: '8px 15px', background: '#4a90e2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '10px' }}>
              Verileri Yenile
            </button>
            <button onClick={handleAddSampleUser} style={{ padding: '8px 15px', background: '#50c878', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Örnek Kullanıcı Ekle
            </button>
          </div>

          <div style={{ marginTop: '30px' }}>
            <h2 style={{ color: '#333', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>Veritabanı İçeriği</h2>
            {userDatabase ? (
              <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                <pre style={{ background: '#f8f8f8', padding: '15px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '14px' }}>
                  {formatJSON(userDatabase)}
                </pre>
              </div>
            ) : (
              <p>Veritabanı okunamadı</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthStatus;
