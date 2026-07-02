'use client';

import { useRouter } from 'next/navigation';
export { useTranslations, useLocale, useFormatter } from 'next-intl';

export function useChangeLocale() {
  const router = useRouter();

  return (locale: string) => {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${365 * 24 * 3600}`;
    router.refresh();
  };
}
