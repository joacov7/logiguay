import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './[locale]/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'LOGIGUAY - Plataforma de Logística',
  description: 'Plataforma integral de gestión de cargas, transporte y logística para Argentina y Latinoamérica',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
