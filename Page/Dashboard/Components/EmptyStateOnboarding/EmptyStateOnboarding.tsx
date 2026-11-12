"use client";

import React, { useId } from 'react';
import Link from 'next/link';
import { FaArrowRight } from 'react-icons/fa';
import './EmptyStateOnboarding.css';

export interface OnboardingStep {
  title: string;
  description: string;
}

export interface EmptyStateOnboardingProps {
  /** Dekoratif ikon (ekran okuyucudan gizlenir) */
  icon: React.ReactNode;
  /** Küçük üst etiket, örn. "HİZMET VERENLER İÇİN" */
  eyebrow?: string;
  title: string;
  description: string;
  /** "Nasıl çalışır?" adımları (en fazla 3 önerilir) */
  steps?: OnboardingStep[];
  /** Kısa fayda maddeleri */
  benefits?: string[];
  ctaLabel: string;
  ctaHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

/**
 * İlanı / hizmeti olmayan kullanıcılar için ortak "boş durum" (onboarding) kartı.
 * Veri içermez; yalnızca yönlendirir. İçerik sayfa tarafından prop olarak verilir.
 */
const EmptyStateOnboarding: React.FC<EmptyStateOnboardingProps> = ({
  icon,
  eyebrow,
  title,
  description,
  steps,
  benefits,
  ctaLabel,
  ctaHref,
  secondaryLabel,
  secondaryHref,
}) => {
  const headingId = useId();

  return (
    <div className="eso">
      <section className="eso-card" aria-labelledby={headingId}>
        <span className="eso-icon" aria-hidden="true">
          {icon}
        </span>

        <hgroup className="eso-heading">
          {eyebrow && <p className="eso-eyebrow">{eyebrow}</p>}
          <h2 id={headingId}>{title}</h2>
        </hgroup>

        <p className="eso-lead">{description}</p>

        {steps && steps.length > 0 && (
          <ol className="eso-steps">
            {steps.map((step) => (
              <li key={step.title}>
                <strong>{step.title}</strong>
                <span>{step.description}</span>
              </li>
            ))}
          </ol>
        )}

        {benefits && benefits.length > 0 && (
          <ul className="eso-benefits">
            {benefits.map((benefit) => (
              <li key={benefit}>{benefit}</li>
            ))}
          </ul>
        )}

        <footer className="eso-actions">
          <Link href={ctaHref} className="eso-cta">
            {ctaLabel}
            <FaArrowRight aria-hidden="true" />
          </Link>
          {secondaryLabel && secondaryHref && (
            <Link href={secondaryHref} className="eso-secondary">
              {secondaryLabel}
            </Link>
          )}
        </footer>
      </section>
    </div>
  );
};

export default EmptyStateOnboarding;

