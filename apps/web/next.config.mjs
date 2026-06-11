import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Solo el bucket propio — un wildcard **.amazonaws.com permitiría servir
      // imágenes de cualquier bucket S3 ajeno a través del optimizador de Next
      { protocol: 'https', hostname: 'logiguay-docs.s3.amazonaws.com' },
      { protocol: 'https', hostname: 'logiguay-docs.s3.*.amazonaws.com' },
      { protocol: 'https', hostname: 'logiguay.com' },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001',
  },
};

export default withNextIntl(nextConfig);
