"use client";

import React, { useEffect } from "react";
import { FaTrashAlt, FaTimes } from "react-icons/fa";
import "./DsDeleteConfirmModal.css";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}

const DsDeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Listeyi sil",
  message = "Bu listeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="delete-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="delete-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="delete-modal-close"
          onClick={onClose}
          aria-label="Kapat"
        >
          <FaTimes size={13} />
        </button>

        <div className="delete-modal-body">
          <div className="delete-modal-icon-wrap">
            <FaTrashAlt size={18} />
          </div>
          <h3 className="delete-modal-title">{title}</h3>
          <p className="delete-modal-text">{message}</p>
        </div>

        <div className="delete-modal-buttons">
          <button type="button" className="cancel-button" onClick={onClose}>
            İptal
          </button>
          <button
            type="button"
            className="confirm-button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Sil
          </button>
        </div>
      </div>
    </div>
  );
};

export default DsDeleteConfirmModal;
