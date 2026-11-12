'use client';

import { useState, useEffect } from 'react';

/**
 * Bir değeri belirli bir gecikme süresi sonunda günceller
 */
const useDebouncedValue = <T>(value: T, delay = 300): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => { clearTimeout(timer); };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Kullanıcının arama girişlerini sınırlar (hız limiti uygular)
 */
const useThrottle = <T extends unknown[]>(callback: (...args: T) => void, limit = 2): ((...args: T) => void) => {
  const [lastCalled, setLastCalled] = useState(0);

  return (...args: T) => {
    const now = Date.now();
    const interval = 1000 / limit;

    if (now - lastCalled >= interval) {
      callback(...args);
      setLastCalled(now);
    } else {
      console.warn('Arama işlemi çok sık yapılıyor, sınırlandırıldı.');
    }
  };
};

export { useDebouncedValue, useThrottle };
