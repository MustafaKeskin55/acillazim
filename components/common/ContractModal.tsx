"use client";

import React from 'react';
import './ContractModal.css';

interface ContractModalProps {
  show: boolean;
  onClose: () => void;
  type?: 'individual' | 'corporate' | 'marketing' | string;
}

const ContractModal: React.FC<ContractModalProps> = ({ show, onClose, type = 'individual' }) => {
  if (!show) return null;

  const title = type === 'corporate'
    ? 'Kurumsal Hesap Sözleşmesi'
    : type === 'marketing'
    ? 'Ticari Elektronik İleti Onayı'
    : type === 'privacy' ? 'Gizlilik Sözleşmesi' : 'Bireysel Hesap Sözleşmesi';

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if ((e.target as HTMLElement).className === 'modal-overlay') onClose(); }}
    >
      <div className="contract-modal-content">
        <div className="contract-modal-header">
          <h2>{title}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="contract-modal-body">
          <div className="contract-content">
            <h3>1. TARAFLAR</h3>
            <p>İşbu Sözleşme, Acillazım Platform (&quot;Platform&quot;) ile üye olmak isteyen kullanıcı (&quot;Üye&quot;) arasında düzenlenmiştir.</p>
            <h3>2. SÖZLEŞMENİN KONUSU</h3>
            <p>Bu sözleşmenin konusu, Platform üzerinden sunulan hizmetlerin kullanım şartlarının ve tarafların hak ve yükümlülüklerinin belirlenmesidir.</p>
            <h3>3. ÜYENİN HAK VE YÜKÜMLÜLÜKLERİ</h3>
            <p>3.1. Üye, Platform&apos;a üye olurken verdiği bilgilerin doğru olduğunu kabul ve beyan eder.</p>
            <p>3.2. Üye, Platform&apos;u kullanırken yasal mevzuata uygun davranacağını kabul eder.</p>
            <p>3.3. Üye, hesap bilgilerinin güvenliğinden kendisi sorumludur.</p>
            <h3>4. PLATFORM&apos;UN HAK VE YÜKÜMLÜLÜKLERİ</h3>
            <p>4.1. Platform, sunduğu hizmetleri önceden bildirmeksizin değiştirme hakkına sahiptir.</p>
            <p>4.2. Platform, üyelerin kişisel verilerini KVKK kapsamında korur ve işler.</p>
            <h3>5. SÖZLEŞMENİN SÜRESİ VE FESİH</h3>
            <p>5.1. Bu sözleşme, üyelik devam ettiği sürece yürürlükte kalır.</p>
            <p>5.2. Taraflar, sözleşmeyi diledikleri zaman feshetme hakkına sahiptir.</p>
            <h3>6. UYUŞMAZLIK ÇÖZÜMÜ</h3>
            <p>Bu sözleşmeden doğan uyuşmazlıklarda Türkiye Cumhuriyeti mahkemeleri yetkilidir.</p>
          </div>
        </div>
        <div className="contract-modal-footer">
          <button className="modal-button" onClick={onClose}>Anladım</button>
        </div>
      </div>
    </div>
  );
};

export default ContractModal;
