const internalApiUrl = (process.env.INTERNAL_API_URL ?? 'http://127.0.0.1:3001/api/v1').replace(
  /\/$/,
  '',
);
const backendOrigin = new URL(internalApiUrl).origin;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_CSRF_COOKIE_NAME: process.env.CSRF_COOKIE_NAME ?? 'ltv_csrf',
    NEXT_PUBLIC_CSRF_HEADER_NAME: process.env.CSRF_HEADER_NAME ?? 'x-csrf-token',
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/api/v1/:path*', destination: `${internalApiUrl}/:path*` },
        {
          source: '/media/originals/:path*',
          destination: `${backendOrigin}/media/originals/:path*`,
        },
        {
          source: '/media/variants/:path*',
          destination: `${backendOrigin}/media/variants/:path*`,
        },
        {
          source: '/media/public/:path*',
          destination: `${backendOrigin}/media/public/:path*`,
        },
      ],
    };
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'same-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
