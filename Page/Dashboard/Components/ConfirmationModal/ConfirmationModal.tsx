"use client";

import React from "react";
import styles from "./ConfirmationModal.module.css";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.confirmationModalOverlay}>
      <div className={styles.confirmationModalContent}>
        <div className={styles.confirmationModalHeader}>{title}</div>
        <div className={styles.confirmationModalBody}>
          <p className={styles.confirmationModalText}>{message}</p>
        </div>
        <div className={styles.confirmationModalButtons}>
          <button type="button" className={`${styles.baseButton} ${styles.cancelButton}`} onClick={onClose}>
            İptal
          </button>
          <button type="button" className={`${styles.baseButton} ${styles.confirmButton}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
