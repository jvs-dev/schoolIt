'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to teacher dashboard on initial load
    router.push('/teacher/dashboard');
  }, [router]);

  return null;
}