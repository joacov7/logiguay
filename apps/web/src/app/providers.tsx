'use client';

import React, { useState } from 'react';
import { ToastProvider } from '@/components/ui/Toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}><ToastProvider>{children}</ToastProvider></QueryClientProvider>;
}
