"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './MembershipSelection.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faBuilding, faCheck, faArrowRight } from '@fortawesome/free-solid-svg-icons';

const MembershipSelection: React.FC = () => {
  const router = useRouter();

  return (
    <div className={styles['membership-page-wrap']}>
      <div className={styles['membership-selection']}>
        <div className={styles['header']}>
          <div className={styles['brand-line']}>
            <span className={styles['brand-accent']}>Acillazım</span> Üyelik Merkezi
          </div>
          <h1>Nasıl Kayıt Olmak İstersiniz?</h1>
          <p className={styles['subtitle']}>
            Size en uygun hesap türünü seçerek saniyeler içinde kaydınızı tamamlayın
          </p>
        </div>

        <div className={styles['options']}>
          {/* Bireysel Kayıt Kartı */}
          <div
            className={`${styles['option']} ${styles['option-individual']}`}
            onClick={() => router.push('/uyelik-sec/bireysel')}
            role="button"
            tabIndex={0}
          >
            <div className={styles['card-top']}>
              <div className={styles['icon-wrapper']}>
                <FontAwesomeIcon icon={faUser} className={styles['icon']} />
              </div>
              <span className={styles['card-tag']}>BİREYSEL HESAP</span>
            </div>

            <h2>Bireysel Kayıt</h2>
            <p className={styles['card-desc']}>
              Bireysel kullanıcı olarak kayıt olun, ihtiyaçlarınız için hemen ilan verin ve teklif alın.
            </p>

            <ul className={styles['feature-list']}>
              <li>
                <span className={styles['check-icon']}>
                  <FontAwesomeIcon icon={faCheck} />
                </span>
                <span>Hızlı ve ücretsiz ilan oluşturma</span>
              </li>
              <li>
                <span className={styles['check-icon']}>
                  <FontAwesomeIcon icon={faCheck} />
                </span>
                <span>Uzmanlarla doğrudan mesajlaşma</span>
              </li>
              <li>
                <span className={styles['check-icon']}>
                  <FontAwesomeIcon icon={faCheck} />
                </span>
                <span>Fiyat tekliflerini anında karşılaştırma</span>
              </li>
            </ul>

            <button type="button" className={styles['option-button']}>
              <span>Bireysel Kayıt Ol</span>
              <FontAwesomeIcon icon={faArrowRight} className={styles['btn-arrow']} />
            </button>
          </div>

          {/* Kurumsal Kayıt Kartı */}
          <div
            className={`${styles['option']} ${styles['option-corporate']}`}
            onClick={() => router.push('/uyelik-sec/kurumsal')}
            role="button"
            tabIndex={0}
          >
            <div className={styles['card-top']}>
              <div className={`${styles['icon-wrapper']} ${styles['icon-wrapper-corp']}`}>
                <FontAwesomeIcon icon={faBuilding} className={styles['icon']} />
              </div>
              <span className={`${styles['card-tag']} ${styles['card-tag-corp']}`}>
                KURUMSAL &amp; FİRMA
              </span>
            </div>

            <h2>Kurumsal Kayıt</h2>
            <p className={styles['card-desc']}>
              Kurumsal kullanıcı olarak kayıt olun, hizmetlerinizi binlerce müşteriye ulaştırın.
            </p>

            <ul className={styles['feature-list']}>
              <li>
                <span className={`${styles['check-icon']} ${styles['check-icon-corp']}`}>
                  <FontAwesomeIcon icon={faCheck} />
                </span>
                <span>Doğrulanmış kurumsal firma profili</span>
              </li>
              <li>
                <span className={`${styles['check-icon']} ${styles['check-icon-corp']}`}>
                  <FontAwesomeIcon icon={faCheck} />
                </span>
                <span>Hizmet bölgelerinde yüksek görünürlük</span>
              </li>
              <li>
                <span className={`${styles['check-icon']} ${styles['check-icon-corp']}`}>
                  <FontAwesomeIcon icon={faCheck} />
                </span>
                <span>Müşteri taleplerine anında teklif verme</span>
              </li>
            </ul>

            <button
              type="button"
              className={`${styles['option-button']} ${styles['option-button-corp']}`}
            >
              <span>Kurumsal Kayıt Ol</span>
              <FontAwesomeIcon icon={faArrowRight} className={styles['btn-arrow']} />
            </button>
          </div>
        </div>

        <div className={styles['login-link-container']}>
          <a href="/giris" className={styles['login-link']}>
            Zaten bir hesabınız var mı? <span>👉 Giriş yap</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default MembershipSelection;
