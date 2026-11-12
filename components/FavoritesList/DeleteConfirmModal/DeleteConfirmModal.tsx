"use client";

import React from 'react';
import { FaTrashAlt, FaTimes } from 'react-icons/fa';
import './DeleteConfirmModal.css';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="delete-modal-overlay" onClick={onClose} role="presentation">
      <div className="delete-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className="delete-modal-close" onClick={onClose} aria-label="Kapat">
          <FaTimes size={13} />
        </button>

        <div className="delete-modal-body">
          <div className="delete-modal-icon-wrap">
            <FaTrashAlt size={18} />
          </div>
          <h3 className="delete-modal-title">Listeyi Sil</h3>
          <p className="delete-modal-text">Bu favori listesini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
        </div>

        <div className="delete-modal-buttons">
          <button type="button" className="cancel-button" onClick={onClose}>
            İptal
          </button>
          <button type="button" className="confirm-button" onClick={onConfirm}>
            Sil
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
