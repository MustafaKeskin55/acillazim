"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  FaTimes,
  FaCamera,
  FaImage,
  FaShieldAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSpinner,
  FaUser
} from "react-icons/fa";
import toast from "react-hot-toast";
import api from "@/services/api/ürapi";
import authService from "@/services/auth/authService";
import "./ProfilePhotoModal.css";

const MAX_FILE_SIZE_BYTES = 2.5 * 1024 * 1024; // 2.5 MB
const MAX_TOTAL_SIZE_BYTES = 5.0 * 1024 * 1024; // 5.0 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface ProfilePhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfileImage?: string | null;
  currentCoverImage?: string | null;
  onSuccess: (newAvatarUrl?: string, newCoverUrl?: string) => void;
}

export const ProfilePhotoModal: React.FC<ProfilePhotoModalProps> = ({
  isOpen,
  onClose,
  currentProfileImage,
  currentCoverImage,
  onSuccess
}) => {
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState<boolean>(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAvatarPreview(currentProfileImage || null);
      setCoverPreview(currentCoverImage || null);
      setAvatarFile(null);
      setCoverFile(null);
      setAvatarError(null);
      setCoverError(null);
    }
  }, [isOpen, currentProfileImage, currentCoverImage]);

  if (!isOpen) return null;

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return "Yalnızca JPG, PNG ve WEBP formatları kabul edilir.";
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return "Seçilen görsel boyutu çok yüksek, lütfen daha küçük bir görsel seçin.";
    }
    return null;
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      setAvatarError(error);
      setAvatarFile(null);
      return;
    }

    setAvatarError(null);
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      setCoverError(error);
      setCoverFile(null);
      return;
    }

    setCoverError(null);
    setCoverFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Toplam boyut kontrolü (arka plan doğrulaması için korunur)
  const totalSizeBytes = (avatarFile?.size || 0) + (coverFile?.size || 0);
  const isTotalExceeded = totalSizeBytes > MAX_TOTAL_SIZE_BYTES;
  const hasErrors = Boolean(avatarError || coverError || isTotalExceeded);
  const hasFilesSelected = Boolean(avatarFile || coverFile);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasFilesSelected || hasErrors || isUploading) return;

    setIsUploading(true);
    let uploadedAvatarUrl: string | undefined;
    let uploadedCoverUrl: string | undefined;

    try {
      // 1. Profil Resmi Yükleme
      if (avatarFile) {
        const res = await api.uploadAvatar(avatarFile);
        if (res?.url) {
          uploadedAvatarUrl = res.url;
        }
      }

      // 2. Kapak Resmi Yükleme
      if (coverFile) {
        const res = await api.uploadCover(coverFile);
        if (res?.url) {
          uploadedCoverUrl = res.url;
        }
      }

      authService.updateCurrentUserProfile({
        ...(uploadedAvatarUrl ? { profilePicture: uploadedAvatarUrl, picture: uploadedAvatarUrl, profilePic: uploadedAvatarUrl } : {}),
        ...(uploadedCoverUrl ? { coverImage: uploadedCoverUrl } : {})
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("userProfileUpdated", {
            detail: {
              ...(uploadedAvatarUrl ? { profilePicture: uploadedAvatarUrl, picture: uploadedAvatarUrl, profilePic: uploadedAvatarUrl, profileImage: uploadedAvatarUrl } : {}),
              ...(uploadedCoverUrl ? { coverImage: uploadedCoverUrl } : {}),
            },
          })
        );
      }
      toast.success("Profil görselleriniz başarıyla kaydedildi.");
      onSuccess(uploadedAvatarUrl, uploadedCoverUrl);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Görsel yüklenirken bir hata oluştu";
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="ppm-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="ppm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Başlık */}
        <div className="ppm-header">
          <div className="ppm-header-title-group">
            <div className="ppm-header-icon-badge" aria-hidden="true">
              <FaCamera />
            </div>
            <div>
              <h2>Profil ve Kapak Görseli</h2>
              <p>Hesabınızı profesyonelleştirecek görselleri yükleyin</p>
            </div>
          </div>
          <button
            type="button"
            className="ppm-close-btn"
            onClick={onClose}
            aria-label="Kapat"
            disabled={isUploading}
          >
            <FaTimes />
          </button>
        </div>

        {/* Modal Gövdesi */}
        <form onSubmit={handleSubmit} className="ppm-body">
          {/* Kart 1: Profil Fotoğrafı */}
          <div className={`ppm-card ${avatarError ? "has-error" : ""}`}>
            <div className="ppm-card-header">
              <span className="ppm-card-title">
                <FaUser size={13} style={{ color: "#003466" }} />
                Profil Fotoğrafı
              </span>
              {avatarFile && (
                <span className="ppm-card-pill">Hazır</span>
              )}
            </div>

            <div className="ppm-avatar-layout">
              <div className="ppm-avatar-preview">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profil Önizleme" />
                ) : (
                  <div className="ppm-avatar-placeholder">
                    <FaUser />
                  </div>
                )}
              </div>

              <div className="ppm-file-info">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleAvatarChange}
                  style={{ display: "none" }}
                  id="ppm-avatar-input"
                  disabled={isUploading}
                />
                <button
                  type="button"
                  className="ppm-upload-trigger-btn"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <FaCamera size={12} />
                  <span>{avatarFile ? "Farklı Fotoğraf Seç" : "Profil Fotoğrafı Seç"}</span>
                </button>

                {avatarError ? (
                  <span className="ppm-file-meta-text error">
                    <FaExclamationTriangle size={11} style={{ marginRight: 4 }} />
                    {avatarError}
                  </span>
                ) : avatarFile ? (
                  <span className="ppm-file-meta-text success">
                    <FaCheckCircle size={11} style={{ marginRight: 4 }} />
                    {avatarFile.name} seçildi
                  </span>
                ) : (
                  <span className="ppm-file-meta-text">
                    Önerilen: 400x400 px kare görsel (JPG, PNG, WEBP)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Kart 2: Kapak Fotoğrafı */}
          <div className={`ppm-card ${coverError ? "has-error" : ""}`}>
            <div className="ppm-card-header">
              <span className="ppm-card-title">
                <FaImage size={13} style={{ color: "#FF6B00" }} />
                Kapak Fotoğrafı (Banner)
              </span>
              {coverFile && (
                <span className="ppm-card-pill">Hazır</span>
              )}
            </div>

            <div className="ppm-cover-layout">
              <div className={`ppm-cover-preview ${coverPreview ? "has-image" : ""}`}>
                {coverPreview ? (
                  <img src={coverPreview} alt="Kapak Önizleme" />
                ) : (
                  <div className="ppm-cover-placeholder">
                    <FaImage size={28} />
                    <span>Henüz bir kapak fotoğrafı seçilmedi</span>
                  </div>
                )}
              </div>

              <div className="ppm-file-info">
                <input
                  ref={coverInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleCoverChange}
                  style={{ display: "none" }}
                  id="ppm-cover-input"
                  disabled={isUploading}
                />
                <button
                  type="button"
                  className="ppm-upload-trigger-btn"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <FaImage size={12} />
                  <span>{coverFile ? "Farklı Kapak Seç" : "Kapak Fotoğrafı Seç"}</span>
                </button>

                {coverError ? (
                  <span className="ppm-file-meta-text error">
                    <FaExclamationTriangle size={11} style={{ marginRight: 4 }} />
                    {coverError}
                  </span>
                ) : coverFile ? (
                  <span className="ppm-file-meta-text success">
                    <FaCheckCircle size={11} style={{ marginRight: 4 }} />
                    {coverFile.name} seçildi
                  </span>
                ) : (
                  <span className="ppm-file-meta-text">
                    Önerilen: 1200x320 px yatay banner görseli (JPG, PNG, WEBP)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Güvenlik Dipnotu */}
          <div className="ppm-security-note">
            <FaShieldAlt />
            <span>
              Görselleriniz güvenlik ve kalite doğrulamasından geçirilerek profilinize uygulanır.
            </span>
          </div>

          {/* Modal Alt Bilgi ve Aksiyonlar */}
          <div className="ppm-footer">
            <div className="ppm-actions">
              <button
                type="button"
                className="ppm-cancel-btn"
                onClick={onClose}
                disabled={isUploading}
              >
                Vazgeç
              </button>
              <button
                type="submit"
                className="ppm-submit-btn"
                disabled={!hasFilesSelected || hasErrors || isUploading}
              >
                {isUploading ? (
                  <>
                    <FaSpinner className="spin" size={15} />
                    <span>Kaydediliyor...</span>
                  </>
                ) : (
                  <>
                    <FaCheckCircle size={15} />
                    <span>Güncelle</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePhotoModal;
