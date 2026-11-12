"use client";

import React from 'react';
import './ForgotPasswordModal.css';

interface ForgotPasswordModalProps {
  show: boolean;
  message: string;
  onClose: () => void;
  type?: 'success' | 'error';
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  show, message, onClose, type = 'success',
}) => {
  if (!show) return null;
  return (
    <div className="forgot-password-modal-overlay" onClick={onClose}>
      <div className="forgot-password-modal" onClick={(e) => e.stopPropagation()}>
        <div className={`forgot-password-modal-content ${type}`}>
          <div className="forgot-password-modal-icon">{type === 'success' ? '✓' : '!'}</div>
          <p className="forgot-password-modal-message">{message}</p>
          <button className="forgot-password-modal-button" onClick={onClose}>Tamam</button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
