"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import Loader from "@/components/Loader/Loader";
import { useAuth } from "@/context/AuthContext";

/**
 * Panel (/dashboard/*) kendi layout'unu kullanır; site geneli navbar + footer
 * burada tekrar gösterilmez (web'de çift başlık / gereksiz footer olmaması için).
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isDashboard = pathname.startsWith("/dashboard");
  /* İlan oluşturma akışında (form/önizleme/başarı) global footer gizlenir */
  const isIlanForm =
    pathname.startsWith("/ilan-form") ||
    pathname.startsWith("/ilan-ver/onizleme") ||
    pathname.startsWith("/ilan-ver/basarili");
  const { loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden",
          background: "#ffffff",
          zIndex: 99999,
        }}
      >
        <Loader />
      </div>
    );
  }

  return (
    <div className={`app-container${isDashboard ? ' app-container--dashboard' : ''}${isIlanForm ? ' app-container--ilan-form' : ''}`}>
      {!isDashboard ? <Navbar /> : null}
      <div className="main-content">{children}</div>
      {!isDashboard && !isIlanForm ? <Footer /> : null}
    </div>
  );
}
