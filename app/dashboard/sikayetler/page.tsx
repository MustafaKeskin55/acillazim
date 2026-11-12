'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const SikayetlerRedirect: React.FC = () => {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/sikayetlerim-taleplerim'); }, [router]);
  return null;
};

export default SikayetlerRedirect;