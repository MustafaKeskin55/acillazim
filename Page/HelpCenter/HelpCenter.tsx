"use client";

import React, { useState } from 'react';
import './HelpCenter.css';
import dynamic from 'next/dynamic';
import { FaRobot, FaQuestionCircle, FaChevronRight, FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';

const AIComponent = dynamic(() => import('@/ai/data/AIComponent'), { ssr: false });

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqCategory {
  title: string;
  items: FaqItem[];
}

const faqCategories: FaqCategory[] = [
  {
    title: 'İlan İşlemleri',
    items: [
      { question: 'İlan nasıl verilir?', answer: "İlan vermek için üst menüden 'İlan Ver' butonuna tıklayın. Ardından kategori seçimi yapın ve formu doldurun." },
      { question: 'İlanımı nasıl düzenleyebilirim?', answer: "Dashboard üzerinden 'Aktif İlanlar' bölümüne giderek ilanınızı düzenleyebilirsiniz." },
    ],
  },
  {
    title: 'Üyelik ve Ödeme',
    items: [
      { question: 'Üyelik ücretleri nelerdir?', answer: 'Bireysel ve kurumsal üyelik seçeneklerimiz mevcuttur. Detaylı bilgi için üyelik sayfasını ziyaret edebilirsiniz.' },
      { question: 'Ödeme seçenekleri nelerdir?', answer: 'Kredi kartı, banka havalesi ve online ödeme seçeneklerimiz mevcuttur.' },
    ],
  },
  {
    title: 'Hesap Güvenliği',
    items: [
      { question: 'Şifremi nasıl değiştirebilirim?', answer: 'Profil ayarlarından şifre değiştirme seçeneğini kullanarak şifrenizi güncelleyebilirsiniz.' },
      { question: 'Hesabımı nasıl silebilirim?', answer: 'Hesap silme işlemi için müşteri hizmetleri ile iletişime geçmeniz gerekmektedir.' },
    ],
  },
];

const HelpCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('sikcaSorulanlar');
  const [isVoiceChatActive, setIsVoiceChatActive] = useState<boolean>(false);

  return (
    <div className="help-center-container">
      <div className="help-center-header">
        <h1>Yardım Merkezi</h1>
        <p>Size nasıl yardımcı olabiliriz?</p>
      </div>

      <div className="help-center-tabs">
        <button
          className={`tab-button ${activeTab === 'sikcaSorulanlar' ? 'active' : ''}`}
          onClick={() => setActiveTab('sikcaSorulanlar')}
        >
          <FaQuestionCircle /><span>Sıkça Sorulan Sorular</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'yapayZeka' ? 'active' : ''}`}
          onClick={() => setActiveTab('yapayZeka')}
        >
          <FaRobot /><span>Yapay Zeka Asistanı</span>
        </button>
        {activeTab === 'yapayZeka' && (
          <button
            className={`voice-chat-button ${isVoiceChatActive ? 'active' : ''}`}
            onClick={() => setIsVoiceChatActive(!isVoiceChatActive)}
            title={isVoiceChatActive ? 'Sesli Sohbeti Kapat' : 'Sesli Sohbeti Aç'}
          >
            {isVoiceChatActive ? <FaMicrophoneSlash /> : <FaMicrophone />}
            <span>{isVoiceChatActive ? 'Sesli Sohbeti Kapat' : 'Sesli Sohbeti Aç'}</span>
          </button>
        )}
      </div>

      <div className="help-center-content">
        {activeTab === 'sikcaSorulanlar' ? (
          <div className="faq-categories">
            {faqCategories.map((category, index) => (
              <div key={index} className="faq-category">
                <h2>{category.title}</h2>
                <div className="faq-items">
                  {category.items.map((faq, faqIndex) => (
                    <div key={faqIndex} className="faq-item">
                      <div className="faq-question">
                        <h3>{faq.question}</h3>
                        <FaChevronRight className="faq-icon" />
                      </div>
                      <p className="faq-answer">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="ai-assistant-section">
            <AIComponent isVoiceChatActive={isVoiceChatActive} />
          </div>
        )}
      </div>
    </div>
  );
};

export default HelpCenter;
