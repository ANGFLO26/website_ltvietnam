const internalApiUrl = (process.env.INTERNAL_API_URL ?? 'http://127.0.0.1:3001/api/v1').replace(
  /\/$/,
  '',
);
const backendOrigin = new URL(internalApiUrl).origin;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  // Metadata streaming co the gui header 200 truoc khi `notFound()` cua route
  // dong duoc biet. Catalogue can 404 THAT cho slug taxonomy khong ton tai,
  // nen doi metadata xong truoc khi bat dau response cho moi user agent.
  htmlLimitedBots: /.*/,
  // Nest la nguon authoritative cho redirect va SEO (D11/D12).
  // Next chi goi resolver truoc khi render va phat HTTP 301 (D17).
  // Spike P0 phai ghim chinh xac phien ban Next va chung minh 301 phat ra
  // TRUOC khi stream/render.
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/api/v1/:path*', destination: `${internalApiUrl}/:path*` },
        { source: '/media/:path*', destination: `${backendOrigin}/media/:path*` },
        { source: '/sitemap.xml', destination: `${backendOrigin}/sitemap.xml` },
        {
          source: '/sitemap-:locale.xml',
          destination: `${backendOrigin}/sitemap-:locale.xml`,
        },
        { source: '/robots.txt', destination: `${backendOrigin}/robots.txt` },
      ],
    };
  },
};
export default nextConfig;
