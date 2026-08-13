import Link from 'next/link';
import type { ProductStandardView } from '@ltv/contracts';
import type { Dictionary } from '@/lib/i18n';
import { routePath } from '@/lib/routes';

/**
 * Danh sach tieu chuan, TACH theo muc do lien quan.
 *
 * `compliance_type` von da co trong du lieu nhung truoc day khong duoc dung de
 * hien thi — moi tieu chuan trong nhu nhau. Voi du lieu that thi khac biet nay
 * quan trong: OptiFuel co 27 tieu chuan, trong do chi 6 la phuong phap may
 * TUAN THU truc tiep, con lai la tuong quan hoac dac tinh nhien lieu tham
 * chieu. Nguoi mua can biet may CHAY duoc chuan nao, khong phai mot danh sach
 * phang khien hai loai lan vao nhau.
 *
 * KHONG tu bao muc/tieu de: `CollapsibleSection` o trang chi tiet lo viec do.
 */
export function StandardList({
  standards,
  dictionary,
}: {
  standards: readonly ProductStandardView[];
  dictionary: Dictionary;
}) {
  if (standards.length === 0) return null;

  const tuanThu = standards.filter((s) => s.compliance_type === 'compliance');
  const conLai = standards.filter((s) => s.compliance_type !== 'compliance');

  return (
    <div className="space-y-6">
      {tuanThu.length === 0 ? null : (
        <Nhom
          title={dictionary.products.standardsComplianceTitle}
          standards={tuanThu}
          dictionary={dictionary}
        />
      )}
      {conLai.length === 0 ? null : (
        <Nhom
          title={dictionary.products.standardsRelatedTitle}
          standards={conLai}
          dictionary={dictionary}
        />
      )}
    </div>
  );
}

function nhanLoai(
  loai: ProductStandardView['compliance_type'],
  dictionary: Dictionary,
): string | null {
  switch (loai) {
    case 'correlation':
      return dictionary.products.standardTypeCorrelation;
    case 'specification':
      return dictionary.products.standardTypeSpecification;
    case 'reference':
      return dictionary.products.standardTypeReference;
    default:
      return null;
  }
}

function Nhom({
  title,
  standards,
  dictionary,
}: {
  title: string;
  standards: readonly ProductStandardView[];
  dictionary: Dictionary;
}) {
  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">{title}</h3>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {standards.map((standard) => (
          <li className="rounded-lg border border-slate-200 bg-white p-4" key={standard.slug}>
            <Link
              className="font-bold no-underline"
              href={routePath('products.standard', { params: { slug: standard.slug } })}
            >
              {standard.organization} {standard.code}
            </Link>
            {standard.compliance_type === 'compliance' ? null : (
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {nhanLoai(standard.compliance_type, dictionary)}
              </span>
            )}
            {standard.name === null ? null : (
              <p className="mt-1 text-sm text-slate-600">{standard.name}</p>
            )}
            {standard.note === null ? null : (
              <p className="mt-2 text-sm text-slate-700">{standard.note}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
