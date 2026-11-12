"use client";

import React from "react";
import { FaTimes, FaExclamationTriangle } from "react-icons/fa";
import "./Modal.css";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="modal__overlay">
      <div className="modal__content">
        <div className="modal__header">
          <h2 className="modal__title">
            <FaExclamationTriangle /> Şifre Doğrulama Hatası
          </h2>
          <button type="button" className="modal__close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
