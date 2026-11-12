'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    // Yeni deployment veya chunk uyumsuzluğu durumunda sayfayı otomatik yenileyerek son sürüme geçir
    const msg = error?.message || '';
    if (
      msg.includes('Failed to find Server Action') ||
      msg.includes('ChunkLoadError') ||
      msg.includes('Loading chunk') ||
      msg.includes('deployment')
    ) {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      }}
    >
      <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#1e293b' }}>
        Bir şeyler ters gitti
      </h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem', maxWidth: '28rem', lineHeight: 1.5 }}>
        Sayfa yüklenirken geçici bir sorun oluştu. Lütfen sayfayı yenilemeyi deneyin veya ana sayfaya dönün.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.location.reload();
            } else {
              reset();
            }
          }}
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
        <Link
          href="/"
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            color: '#1e293b',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Ana sayfa
        </Link>
      </div>
    </div>
  );
}
