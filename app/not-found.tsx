"use client";

import ErrorMessage from '@/components/ErrorMessage/ErrorMessage';

export default function NotFound() {
  return (
    <ErrorMessage
      type="not-found"
      message="Aradığınız sayfa bulunamadı."
      initialCountdown={5}
      onCountdownEnd={() => { window.location.href = '/'; }}
    />
  );
}
