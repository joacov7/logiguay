'use client';
import { useRouter } from '@/i18n/routing';
import { useEffect } from 'react';

export default function DashboardRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/operaciones'); }, [router]);
  return null;
}
