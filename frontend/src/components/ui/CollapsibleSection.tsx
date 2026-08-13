'use client';

import { useEffect, useState, type ReactNode } from 'react';

/**
 * Muc noi dung THU GON MAC DINH — dung cho phan "tra cuu sau" cua trang san pham.
 *
 * Vi sao can: du lieu that cua mot may co the co 40+ dong thong so va 25+ tieu
 * chuan. Do het ra mot trang cuon doc khien nguoi mua khong doc noi. Nhung cung
 * KHONG duoc cat bot du lieu — nguoi mua thiet bi lab la dan ky thuat, ho can
 * bang thong so day du de quyet dinh. Nen: giu du lieu, thu gon cach bay.
 *
 * Dung `<details>` that chu khong phai div + state:
 *   - hoat dong ca khi JavaScript chua kip tai
 *   - ban phim va trinh doc man hinh duoc ho tro san, khong phai tu lam ARIA
 *   - noi dung VAN nam trong DOM nen cong cu tim kiem doc duoc
 *
 * Phan client-side chi lam MOT viec: mo san khi nguoi dung bam mot lien ket neo
 * (#specifications) tro toi chinh muc nay. Thieu no thi thanh dieu huong dinh o
 * dau trang nhay xuong dung cho nhung nguoi dung thay mot muc dang dong.
 */
export function CollapsibleSection({
  id,
  title,
  hint,
  children,
  defaultOpen = false,
}: {
  id: string;
  title: string;
  /** Cho biet truoc khoi luong ben trong, vd "25 thong so". */
  hint?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    const dongBo = (): void => {
      if (window.location.hash === `#${id}`) setOpen(true);
    };
    dongBo();
    window.addEventListener('hashchange', dongBo);
    return () => window.removeEventListener('hashchange', dongBo);
  }, [id]);

  return (
    <section id={id} className="scroll-mt-32">
      <details
        className="group rounded-2xl border border-slate-200 bg-white"
        open={open}
        onToggle={(event) => setOpen(event.currentTarget.open)}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
          <span className="min-w-0">
            <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
            {hint === undefined ? null : (
              <span className="mt-1 block text-sm text-slate-600">{hint}</span>
            )}
          </span>
          <span
            aria-hidden="true"
            className="shrink-0 text-xl font-bold text-blue-800 transition-transform group-open:rotate-45"
          >
            +
          </span>
        </summary>
        <div className="border-t border-slate-200 px-5 py-6">{children}</div>
      </details>
    </section>
  );
}
