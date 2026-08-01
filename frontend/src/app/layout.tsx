import type { ReactNode } from 'react';

export const metadata = {
  title: 'LT Vietnam Technology Co., Ltd',
  description:
    'Technical services, spare parts, equipment and consumables for heavy industrial plants in Vietnam.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // Ngon ngu mac dinh la tieng Anh (ADR-001/014).
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
