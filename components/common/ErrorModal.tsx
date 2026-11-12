"use client";

import React from "react";
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from "react-icons/fa";
import "./ErrorModal.css";

interface ErrorModalProps {
  show: boolean;
  title?: string;
  errors: string | string[];
  variant?: "info" | "success" | "warning" | "error";
  onClose: () => void;
}

function detectVariant(msg: string, explicit?: ErrorModalProps["variant"]): "info" | "success" | "warning" | "error" {
  if (explicit) return explicit;
  const lower = msg.toLowerCase();
  if (
    lower.includes("hata") ||
    lower.includes("başarısız") ||
    lower.includes("yapılamadı") ||
    lower.includes("edilemedi") ||
    lower.includes("alınamadı") ||
    lower.includes("açılamadı") ||
    lower.includes("yüklenemedi") ||
    lower.includes("kaydedilemedi") ||
    lower.includes("güncellenemedi") ||
    lower.includes("oluşturulamadı") ||
    lower.includes("doğrulanamadı") ||
    lower.includes("bağlanılamadı") ||
    lower.includes("ulaşılamadı") ||
    lower.includes("tamamlanamadı") ||
    lower.includes("eklenemedi") ||
    lower.includes("bulunamadı") ||
    lower.includes("silinemedi") ||
    lower.includes("gönderilemedi") ||
    lower.includes("onaylanamadı") ||
    lower.includes("reddedilemedi") ||
    lower.includes("geçersiz") ||
    lower.includes("yanlış") ||
    lower.includes("sorun oluştu") ||
    lower.includes("uyuşmuyor") ||
    lower.includes("eşleşmiyor") ||
    lower.includes("engellendi")
  ) {
    return "error";
  }
  if (
    lower.includes("iletildi") ||
    lower.includes("başarıyla") ||
    lower.includes("onaylandı") ||
    lower.includes("kopyalandı") ||
    lower.includes("bildirildi") ||
    lower.includes("güncellendi") ||
    lower.includes("kaydedildi") ||
    lower.includes("oluşturuldu")
  ) {
    return "success";
  }
  if (
    lower.includes("lütfen") ||
    lower.includes("en fazla") ||
    lower.includes("en az") ||
    lower.includes("zorunludur") ||
    lower.includes("zaten") ||
    lower.includes("eksik") ||
    lower.includes("bekleniyor")
  ) {
    return "warning";
  }
  return "info";
}

const ErrorModal: React.FC<ErrorModalProps> = ({ show, title, errors, variant, onClose }) => {
  if (!show) return null;

  const messageText = Array.isArray(errors) ? errors[0] || "" : String(errors || "");
  const resolvedVariant = detectVariant(messageText, variant);

  const defaultTitle =
    resolvedVariant === "success"
      ? "İşlem Bilgilendirmesi"
      : resolvedVariant === "error"
        ? "İşlem Tamamlanamadı"
        : resolvedVariant === "warning"
          ? "Bilgilendirme & Uyarı"
          : "Sistem Bilgilendirmesi";

  const defaultKicker =
    resolvedVariant === "success"
      ? "Durum Güncellemesi"
      : resolvedVariant === "error"
        ? "Sistem Uyarısı"
        : resolvedVariant === "warning"
          ? "Dikkat"
          : "Acillazım Bildirimi";

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if ((e.target as HTMLElement).className === "modal-overlay") onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className={`modal-content modal-content--${resolvedVariant}`} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="sys-modal-close" onClick={onClose} aria-label="Kapat">
          <FaTimes />
        </button>

        <div className={`modal-icon modal-icon--${resolvedVariant}`}>
          {resolvedVariant === "success" ? (
            <FaCheckCircle />
          ) : resolvedVariant === "error" || resolvedVariant === "warning" ? (
            <FaExclamationTriangle />
          ) : (
            <FaInfoCircle />
          )}
        </div>

        <span className={`sys-modal-kicker sys-modal-kicker--${resolvedVariant}`}>{defaultKicker}</span>

        <div className="modal-title">{title || defaultTitle}</div>

        <div className="modal-message">{messageText}</div>

        <button type="button" className={`modal-button modal-button--${resolvedVariant}`} onClick={onClose}>
          Tamam, Anlaşıldı
        </button>
      </div>
    </div>
  );
};

export default ErrorModal;
