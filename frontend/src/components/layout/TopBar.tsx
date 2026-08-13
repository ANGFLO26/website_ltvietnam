import { LOCALES, type Locale } from '@ltv/contracts';
import type { Dictionary } from '@/lib/i18n';
import { routePath } from '@/lib/routes';
import { LanguageSwitcher } from './LanguageSwitcher';

/**
 * Ngon ngu con lai luon co mot dich den — it nhat la trang chu cua no.
 *
 * Truoc day TopBar goi `LanguageSwitcher` KHONG kem `alternates` hay
 * `fallbacks`, nen tren moi trang khong phai trang noi dung (toan bo catalogue,
 * trang chu) nut doi ngon ngu hien chu xam khong bam duoc. Nguoi dung thay mot
 * lua chon ngon ngu ma he thong khong cho dung — te hon la khong hien gi.
 *
 * Catalogue chi co tieng Viet nen mot trang san pham that su khong co ban tieng
 * Anh tuong ung; dua khach ve trang chu tieng Anh la cau tra loi trung thuc.
 * Trang noi dung co ban dich that thi `ContentPageHeader` van dua ra bo chuyen
 * ngon ngu rieng tro dung URL tuong ung.
 */
function homeFallbacks(locale: Locale): Readonly<Partial<Record<Locale, string>>> {
  return Object.fromEntries(
    LOCALES.filter((candidate) => candidate !== locale).map((candidate) => [
      candidate,
      routePath('home', { locale: candidate }),
    ]),
  );
}

export function TopBar({ locale, dictionary }: { locale: Locale; dictionary: Dictionary }) {
  return (
    <div className="border-b border-white/10 bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 text-xs sm:px-6 sm:text-sm">
        <p className="font-medium tracking-wide">{dictionary.layout.companyDescriptor}</p>
        <div className="flex items-center gap-4 sm:gap-6">
          <LanguageSwitcher
            locale={locale}
            fallbacks={homeFallbacks(locale)}
            dictionary={dictionary}
          />
        </div>
      </div>
    </div>
  );
}
