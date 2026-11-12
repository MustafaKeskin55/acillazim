"use client";

import React from 'react';
import './NotMemberModal.css';

interface NotMemberModalProps {
  show: boolean;
  onClose: () => void;
}

const NotMemberModal: React.FC<NotMemberModalProps> = ({ show, onClose }) => {
  if (!show) return null;
  const handleClose = () => {
    onClose();
    window.location.href = '/uyelik-sec';
  };
  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-emoji">😊</div>
        <div className="modal-message">Henüz üye değilsin. Ama hemen üye olabilirsin!</div>
        <button className="modal-button" onClick={handleClose}>Tamam</button>
      </div>
    </div>
  );
};

export default NotMemberModal;
