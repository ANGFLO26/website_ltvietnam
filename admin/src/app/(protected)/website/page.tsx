import { ArrowRight, Image, LayoutTemplate, Menu, Users } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/shell/PageHeader';
import { WebsiteTabs } from '@/features/operations/WebsiteTabs';

const AREAS = [
  {
    href: '/website/homepage',
    title: 'Bố cục trang chủ',
    description: 'Bật, tắt và sắp xếp hành trình khách hàng trên Home.',
    icon: LayoutTemplate,
    step: '01',
  },
  {
    href: '/website/banners',
    title: 'Banner',
    description: 'Quản lý thông điệp và hình ảnh đầu trang; không dùng CTA báo giá quá sớm.',
    icon: Image,
    step: '02',
  },
  {
    href: '/website/customers',
    title: 'Our Customers',
    description: 'Quản lý logo được phép công khai trong khối chứng thực trên Home.',
    icon: Users,
    step: '03',
  },
  {
    href: '/website/menus',
    title: 'Điều hướng',
    description: 'Kiểm soát menu Solutions, Products, Services, Knowledge và Company.',
    icon: Menu,
    step: '04',
  },
] as const;

export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="Website công khai"
        title="Trung tâm điều khiển website"
        description="Bắt đầu từ mục tiêu của khách hàng, sau đó kiểm soát nội dung, bằng chứng tin cậy và đường đi chính của website."
      />
      <WebsiteTabs active="/website" />
      <section className="panel operation-card website-overview">
        <div className="operation-card__heading">
          <div>
            <h2>Luồng quản lý khuyến nghị</h2>
            <p>Media → sản phẩm/nội dung → bố cục & điều hướng → kiểm tra website công khai.</p>
          </div>
        </div>
        <div className="website-overview__grid">
          {AREAS.map((area) => {
            const Icon = area.icon;
            return (
              <Link key={area.href} href={area.href} className="website-overview__card">
                <span className="website-overview__step">{area.step}</span>
                <Icon size={23} aria-hidden="true" />
                <strong>{area.title}</strong>
                <span>{area.description}</span>
                <small>
                  Quản lý <ArrowRight size={15} aria-hidden="true" />
                </small>
              </Link>
            );
          })}
        </div>
        <div className="operation-note website-overview__note">
          “Our Customers” chỉ là một khối trên Home và không được thêm vào header. Menu chính chỉ
          giữ các đường đi phục vụ nhu cầu tìm giải pháp.
        </div>
      </section>
    </>
  );
}
