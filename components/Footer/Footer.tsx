"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import "./Footer.css";
import {
  FaBuilding, FaInfoCircle, FaLeaf, FaNewspaper, FaMapMarkerAlt,
  FaSitemap, FaEnvelope, FaCogs, FaUserTie, FaSearch, FaBolt, FaWrench,
  FaUserShield, FaShieldAlt, FaFileContract, FaFileSignature,
  FaFileAlt, FaUserLock, FaQuestionCircle, FaHashtag,
  FaFacebookF, FaInstagram, FaLinkedinIn, FaYoutube
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

interface FooterProps {
  noMargin?: boolean;
}

const Footer: React.FC<FooterProps> = ({ noMargin }) => {
  useEffect(() => {
    const footerSections = document.querySelectorAll(".footer-section");
    footerSections.forEach((section, index) => {
      (section as HTMLElement).style.opacity = "0";
      (section as HTMLElement).style.transform = "translateY(20px)";
      setTimeout(() => {
        (section as HTMLElement).style.transition = "all 0.5s ease";
        (section as HTMLElement).style.opacity = "1";
        (section as HTMLElement).style.transform = "translateY(0)";
      }, 200 * index);
    });

    const socialLinks = document.querySelectorAll(".social-links a");
    socialLinks.forEach((link) => {
      link.addEventListener("mouseenter", (e) => {
        (e.target as HTMLElement).style.transform = "translateY(-5px) rotate(360deg)";
        (e.target as HTMLElement).style.transition = "all 0.3s ease";
      });
      link.addEventListener("mouseleave", (e) => {
        (e.target as HTMLElement).style.transform = "translateY(0) rotate(0)";
      });
    });
  }, []);

  return (
    <footer className={`footer ${noMargin ? 'footer-no-margin' : ''}`}>
      <div className="footer-content">
        <div className="footer-sections">
          <div className="footer-section">
            <h3>
              <FaBuilding /> Kurumsal
            </h3>
            <ul>
              <li>
                <Link href="#">
                  <FaInfoCircle /> Hakkımızda
                </Link>
              </li>
              <li>
                <Link href="#">
                  <FaLeaf /> Sürdürülebilirlik
                </Link>
              </li>
              <li>
                <Link href="/site-haberleri">
                  <FaNewspaper /> Haberler
                </Link>
              </li>
              <li>
                <Link href="#">
                  <FaMapMarkerAlt /> Coğrafi Veri Tarama
                </Link>
              </li>
              <li>
                <Link href="#">
                  <FaSitemap /> Site Haritası
                </Link>
              </li>
              <li>
                <Link href="#">
                  <FaEnvelope /> İletişim
                </Link>
              </li>
            </ul>
          </div>

          <div className="footer-section">
            <h3>
              <FaCogs /> Hizmetlerimiz
            </h3>
            <ul>
              <li>
                <Link href="/ilan-ver">
                  <FaUserTie /> Hizmet Veren Ol
                </Link>
              </li>
              <li>
                <Link href="/Ustalar-ve-Hizmetler">
                  <FaSearch /> Usta &amp; Hizmet Bul
                </Link>
              </li>
              <li>
                <Link href="/#hizmet-ara">
                  <FaBolt /> Acil Hizmet Çağır
                </Link>
              </li>
              <li>
                <Link href="/kategoriler?alan=hizmet">
                  <FaWrench /> Tüm Hizmetler
                </Link>
              </li>
            </ul>
          </div>

          <div className="footer-section">
            <h3>
              <FaUserShield /> Gizlilik ve Kullanım
            </h3>
            <ul>
              <li>
                <Link href="#">
                  <FaShieldAlt /> Güvenli Alışverişin İpuçları
                </Link>
              </li>
              <li>
                <Link href="#">
                  <FaFileContract /> Sözleşmeler ve Kurallar
                </Link>
              </li>
              <li>
                <Link href="#">
                  <FaFileSignature /> Hesap Sözleşmesi
                </Link>
              </li>
              <li>
                <Link href="#">
                  <FaFileAlt /> Kullanım Koşulları
                </Link>
              </li>
              <li>
                <Link href="#">
                  <FaUserLock /> Kişisel Verilerin Korunması
                </Link>
              </li>
              <li>
                <Link href="#">
                  <FaQuestionCircle /> Yardım ve İşlem Rehberi
                </Link>
              </li>
            </ul>
          </div>

          <div className="footer-section">
            <h3>
              <FaHashtag /> Bizi Takip Edin
            </h3>
            <div className="social-links">
              <a href="#" aria-label="Facebook">
                <FaFacebookF />
              </a>
              <a href="#" aria-label="X">
                <FaXTwitter />
              </a>
              <a href="#" aria-label="Instagram">
                <FaInstagram />
              </a>
              <a href="#" aria-label="LinkedIn">
                <FaLinkedinIn />
              </a>
              <a href="#" aria-label="YouTube">
                <FaYoutube />
              </a>
            </div>
            <div className="mobile-apps">
              <a href="#" className="app-store">
                <Image src="/images/app-store2.png" alt="App Store" width={120} height={40} />
              </a>
              <a href="#" className="google-play">
                <Image src="/images/google-play2.png" alt="Google Play" width={120} height={40} />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-info">
          <p>Copyright 2000-2025 acillazım.com</p>
        </div>
        <div className="footer-disclaimer">
          <p>
            acillazım.com&apos;da yer alan kullanıcıların oluşturduğu tüm içerik,
            görüş ve bilgilerin doğruluğu, eksiksiz ve değişmez olduğu,
            yayınlanması ile ilgili yasal yükümlülükler içeriği oluşturan
            kullanıcıya aittir. Bu içeriğin, görüş ve bilgilerin yanlışlık,
            eksiklik veya yasalara aykırılığından acilazim.com hiçbir şekilde
            sorumlu değildir. Sorularınız için ilan sahibi ile irtibata
            geçebilirsiniz.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
