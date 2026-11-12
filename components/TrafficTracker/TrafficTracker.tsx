"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { safeRandomUUID } from "@/utils/uuid";

/**
 * Sayfa gorunumlerini (page view) backend'e (TrafficController -> POST /api/v1/traffic/visit)
 * bildiren, gorunmez, sessiz calisan izleyici. Admin panelindeki "Canli Trafik" grafigini
 * gercek veriyle besler.
 *
 * - Herkese acik, kimlik dogrulama gerektirmeyen bir uc noktaya "fire and forget" istek atar;
 *   istek basarisiz olsa bile kullaniciyi ETKILEMEZ (navigasyonu bloklamaz, hata firlatmaz).
 * - Anonim ziyaretciyi ayirt edebilmek icin localStorage'da kalici, kisisel veri ICERMEYEN
 *   rastgele bir oturum kimligi tutulur (PII degildir, sadece ayni tarayicidan gelen ardisik
 *   sayfa gorunumlerini gruplamak icindir).
 */
const SESSION_KEY = "acillazim_traffic_session_id";

function resolveApiBase(): string {
  const raw = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ""
  ).replace(/\/$/, "");
  if (!raw) return "/api/v1";
  if (/\/api\/v1$/i.test(raw)) return raw;
  const host = raw
    .replace(/\/api\/v1\/?$/i, "")
    .replace(/\/api\/?$/i, "")
    .replace(/\/v1\/?$/i, "");
  return `${host}/api/v1`;
}

function getOrCreateSessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = safeRandomUUID();
    localStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    // localStorage kapaliysa (gizli sekme vb.) sorun degil, sadece gruplama olmaz
    return safeRandomUUID();
  }
}

export default function TrafficTracker() {
  const pathname = usePathname() ?? "/";
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === lastTrackedPath.current) return;
    lastTrackedPath.current = pathname;

    fetch(`${resolveApiBase()}/traffic/visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: "WEB",
        path: pathname,
        sessionId: getOrCreateSessionId(),
      }),
      keepalive: true,
    }).catch(() => {
      // Sessizce yut: trafik izleme asla kullanici deneyimini bozmamali
    });
  }, [pathname]);

  return null;
}
