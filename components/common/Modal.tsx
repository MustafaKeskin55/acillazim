"use client";

import React from 'react';
import './Modal.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay">
      <div className="error-modal">
        <div className="modal-content">{children}</div>
        <button className="modal-button" onClick={onClose}>Tamam</button>
      </div>
    </div>
  );
};

export default Modal;
