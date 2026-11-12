"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * SiteHead bileşeni - Sayfa başlıklarını (document.title) yönetir
 * Next.js'de metadata API kullanılması önerilir ama dinamik client-side
 * title güncelleme için bu bileşen korundu.
 */
function SiteHead() {
  const pathname = usePathname();

  useEffect(() => {
    const path = pathname;

    if (path === '/' || path === '') {
      document.title = 'Acillazım.com';
      return;
    }

    if (!path.includes('/ilan/')) {
      const pageName = path.split('/').pop()?.split('-').join(' ') || '';
      if (pageName) {
        const formattedPageName = pageName
          .split(' ')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        document.title = formattedPageName;
      } else {
        document.title = 'sayfa başlığı';
      }
    }
  }, [pathname]);

  return null;
}

export default SiteHead;
