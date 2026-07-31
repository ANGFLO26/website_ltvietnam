/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Nest la nguon authoritative cho redirect va SEO (D11/D12).
  // Next chi goi resolver truoc khi render va phat HTTP 301 (D17).
  // Spike P0 phai ghim chinh xac phien ban Next va chung minh 301 phat ra
  // TRUOC khi stream/render.
};
export default nextConfig;
