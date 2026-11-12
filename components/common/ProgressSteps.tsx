"use client";

import React from 'react';
import './ProgressSteps.css';

interface Step {
  number: number;
  text: string;
  page: string;
}

interface ProgressStepsProps {
  currentStep: number;
}

const steps: Step[] = [
  { number: 1, text: 'Kategori Seçimi', page: 'kategori-sec' },
  { number: 2, text: 'İlan Detayları', page: 'ilan-form' },
  { number: 3, text: 'Önizleme', page: 'onizleme' },
  { number: 4, text: 'Tebrikler', page: 'tebrikler' },
];

const ProgressSteps: React.FC<ProgressStepsProps> = ({ currentStep }) => {
  return (
    <div className="prgrs-v1">
      <div className="prgrs-v1__container mb-4">
        <div
          className="prgrs-v1__steps"
          style={{ '--progress-width': `${((currentStep - 1) / (steps.length - 1)) * 100}%` } as React.CSSProperties}
        >
          {steps.map((step) => (
            <div
              key={step.number}
              className={`prgrs-v1__step ${currentStep === step.number ? 'prgrs-v1__step--active' : ''} ${step.number < currentStep ? 'prgrs-v1__step--completed' : ''}`}
              data-step={step.number}
              data-page={step.page}
            >
              <div className="prgrs-v1__circle" data-number={step.number} />
              <div className="prgrs-v1__text">{step.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProgressSteps;
