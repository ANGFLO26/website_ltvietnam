'use client';

import type { AdminHomepageSectionView } from '@ltv/contracts';
import { ADMIN_HOMEPAGE_SETTING_KEYS } from '@ltv/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { GripVertical, Save } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useUnsavedChanges } from '@/lib/use-unsaved-changes';
import { operationKeys, updateHomepageSection } from './api';

const LABELS: Readonly<Record<string, string>> = {
  hero: 'Banner chính',
  company_intro: 'Giới thiệu công ty',
  business_areas: 'Lĩnh vực hoạt động',
  featured_categories: 'Danh mục nổi bật',
  featured_products: 'Sản phẩm nổi bật',
  featured_brands: 'Thương hiệu nổi bật',
  services: 'Dịch vụ',
  capabilities: 'Năng lực',
  projects: 'Dự án',
  posts: 'Tin tức',
  customers: 'Khách hàng',
  contact_call_to_action: 'Kêu gọi liên hệ',
  offices: 'Văn phòng',
};

export function HomepageManager({
  initial,
}: {
  readonly initial: readonly AdminHomepageSectionView[];
}) {
  const sortedInitial = () => [...initial].sort((a, b) => a.display_order - b.display_order);
  const [sections, setSections] = useState(sortedInitial);
  const [baseline, setBaseline] = useState(sortedInitial);
  useUnsavedChanges(JSON.stringify(sections) !== JSON.stringify(baseline));
  const toast = useToast();
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: (section: AdminHomepageSectionView) =>
      updateHomepageSection(section.section_type, {
        is_enabled: section.is_enabled,
        display_order: section.display_order,
        settings: section.settings,
      }),
    onSuccess: (value) => {
      const merge = (current: readonly AdminHomepageSectionView[]) =>
        current
          .map((item) => (item.id === value.id ? value : item))
          .sort((a, b) => a.display_order - b.display_order);
      setSections(merge);
      setBaseline(merge);
      void qc.invalidateQueries({ queryKey: operationKeys.homepage });
      toast.show('Đã lưu cấu hình khu vực.', 'success');
    },
    onError: (error) =>
      toast.show(error instanceof Error ? error.message : 'Không thể lưu.', 'danger'),
  });
  const change = (id: string, patch: Partial<AdminHomepageSectionView>) =>
    setSections((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  return (
    <section className="panel operation-card">
      <div className="operation-card__heading">
        <div>
          <h2>Cấu trúc trang chủ</h2>
          <p>Bật/tắt, xếp thứ tự và giới hạn nội dung bằng các trường an toàn.</p>
        </div>
      </div>
      <div className="homepage-sections">
        {sections.map((section) => {
          const keys = ADMIN_HOMEPAGE_SETTING_KEYS[section.section_type];
          return (
            <article key={section.id} className="homepage-section">
              <div className="homepage-section__identity">
                <GripVertical size={18} aria-hidden="true" />
                <div>
                  <strong>{LABELS[section.section_type] ?? section.section_type}</strong>
                  <small>{section.section_type}</small>
                </div>
              </div>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={section.is_enabled}
                  onChange={(e) => change(section.id, { is_enabled: e.target.checked })}
                />
                <span>Hiển thị</span>
              </label>
              <Field
                label="Thứ tự"
                type="number"
                min={0}
                value={section.display_order}
                onChange={(e) => change(section.id, { display_order: Number(e.target.value) })}
              />
              {keys.includes('limit') ? (
                <Field
                  label="Số mục"
                  type="number"
                  min={1}
                  max={24}
                  value={Number(section.settings.limit ?? 6)}
                  onChange={(e) =>
                    change(section.id, {
                      settings: { ...section.settings, limit: Number(e.target.value) },
                    })
                  }
                />
              ) : (
                <span className="homepage-section__fixed">Không có cấu hình phụ</span>
              )}
              {keys.includes('autoplay_ms') ? (
                <Field
                  label="Chuyển banner (ms)"
                  type="number"
                  min={2000}
                  max={30000}
                  step={500}
                  value={Number(section.settings.autoplay_ms ?? 6000)}
                  onChange={(e) =>
                    change(section.id, {
                      settings: { ...section.settings, autoplay_ms: Number(e.target.value) },
                    })
                  }
                />
              ) : null}
              <Button
                variant="secondary"
                loading={save.isPending && save.variables?.id === section.id}
                icon={<Save size={16} />}
                onClick={() => save.mutate(section)}
              >
                Lưu
              </Button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
