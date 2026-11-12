'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="tr">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.25rem', color: '#1e293b' }}>Uygulama yüklenemedi</h1>
          <p style={{ color: '#64748b', marginBottom: '1.5rem', maxWidth: '26rem', lineHeight: 1.5 }}>
            Kök düzeyde bir hata oluştu. Geliştirme ortamında{' '}
            <code style={{ fontSize: '0.85em' }}>.next</code> klasörünü silip sunucuyu yeniden başlatın.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: '#003466',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Yeniden dene
          </button>
        </div>
      </body>
    </html>
  );
}
