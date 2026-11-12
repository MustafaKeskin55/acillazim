'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaTimes } from 'react-icons/fa';
import './ServiceOwnerEditModal.css';

/**
 * Hizmet sahibi düzenleme modalları — portal + mobil sheet / masaüstü diyalog
 */
export default function ServiceOwnerEditModal({ title, children, onClose, footer = null }) {
  const titleId = useId();
  const panelRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [mounted, onClose]);

  useEffect(() => {
    if (!mounted || !panelRef.current) return;
    const closeEl = panelRef.current.querySelector('[data-soe-focus-first]');
    if (closeEl && typeof closeEl.focus === 'function') {
      closeEl.focus();
    }
  }, [mounted]);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div className="soe-modal" aria-hidden={false}>
      <button
        type="button"
        className="soe-modal__scrim"
        aria-label="Pencereyi kapat"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="soe-modal__sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="soe-modal__top">
          <h2 id={titleId} className="soe-modal__heading">
            {title}
          </h2>
          <button
            type="button"
            className="soe-modal__close"
            onClick={onClose}
            aria-label="Kapat"
            data-soe-focus-first
          >
            <FaTimes aria-hidden size={18} />
          </button>
        </header>

        <div className="soe-modal__scroll">{children}</div>

        {footer ? <div className="soe-modal__bar">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
