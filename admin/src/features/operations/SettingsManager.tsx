'use client';

import type { AdminSettingView } from '@ltv/contracts';
import { useMutation } from '@tanstack/react-query';
import { Save, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { useUnsavedChanges } from '@/lib/use-unsaved-changes';
import { updateSettingGroup } from './api';

export function SettingsManager({ initial }: { readonly initial: readonly AdminSettingView[] }) {
  const [settings, setSettings] = useState([...initial]);
  const groups = useMemo(() => [...new Set(settings.map((x) => x.group))], [settings]);
  const [active, setActive] = useState(groups[0] ?? '');
  const group = settings.filter((x) => x.group === active);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      initial.map((x) => [`${x.group}.${x.key}`, x.masked ? '' : (x.value ?? '')]),
    ),
  );
  useUnsavedChanges(Object.keys(buildSettingsPatch(settings, values)).length > 0);
  const toast = useToast();
  const save = useMutation({
    mutationFn: () => {
      const changed = buildSettingsPatch(group, values);
      if (Object.keys(changed).length === 0) throw new Error('Chưa có thay đổi để lưu.');
      return updateSettingGroup(active, changed);
    },
    onSuccess: (updated) => {
      setSettings((current) => [
        ...current.filter((setting) => setting.group !== active),
        ...updated,
      ]);
      setValues((current) => {
        const next = { ...current };
        for (const setting of updated) {
          next[`${setting.group}.${setting.key}`] = setting.masked ? '' : (setting.value ?? '');
        }
        return next;
      });
      toast.show('Đã lưu nhóm cài đặt.', 'success');
    },
    onError: (error) =>
      toast.show(error instanceof Error ? error.message : 'Không thể lưu.', 'danger'),
  });
  return (
    <div className="settings-layout">
      <aside className="panel settings-groups">
        <h2>Nhóm cài đặt</h2>
        {groups.map((name) => (
          <button
            key={name}
            type="button"
            className={name === active ? 'is-active' : ''}
            onClick={() => setActive(name)}
          >
            {groupLabel(name)}
          </button>
        ))}
      </aside>
      <section className="panel operation-card">
        <div className="operation-card__heading">
          <div>
            <h2>{groupLabel(active)}</h2>
            <p>Chỉ các khóa đã được hệ thống định nghĩa mới có thể chỉnh sửa.</p>
          </div>
        </div>
        <div className="settings-fields">
          {group.map((setting) => {
            const key = `${setting.group}.${setting.key}`;
            return setting.value_type === 'boolean' ? (
              <Select
                key={setting.id}
                label={setting.key.replaceAll('_', ' ')}
                value={values[key] ?? ''}
                onChange={(e) => setValues({ ...values, [key]: e.target.value })}
              >
                <option value="true">Bật</option>
                <option value="false">Tắt</option>
              </Select>
            ) : (
              <Field
                key={setting.id}
                label={setting.key.replaceAll('_', ' ')}
                type={
                  setting.masked ? 'password' : setting.value_type === 'integer' ? 'number' : 'text'
                }
                value={values[key] ?? ''}
                placeholder={setting.masked ? 'Để trống để giữ nguyên bí mật hiện tại' : undefined}
                description={
                  setting.masked ? (
                    <span className="secret-hint">
                      <ShieldCheck size={14} /> Bí mật đang được che; hệ thống không tải giá trị
                      thật về trình duyệt.
                    </span>
                  ) : setting.is_public ? (
                    'Giá trị được dùng trên website công khai.'
                  ) : undefined
                }
                onChange={(e) => setValues({ ...values, [key]: e.target.value })}
              />
            );
          })}
        </div>
        <Button loading={save.isPending} icon={<Save size={17} />} onClick={() => save.mutate()}>
          Lưu nhóm cài đặt
        </Button>
      </section>
    </div>
  );
}

export function buildSettingsPatch(
  settings: readonly AdminSettingView[],
  values: Readonly<Record<string, string>>,
): Record<string, string | null> {
  const changed: Record<string, string | null> = {};
  for (const setting of settings) {
    const value = values[`${setting.group}.${setting.key}`] ?? '';
    if (setting.masked) {
      if (value && value !== '********') changed[setting.key] = value;
    } else if (value !== (setting.value ?? '')) changed[setting.key] = value || null;
  }
  return changed;
}
function groupLabel(value: string) {
  return (
    (
      {
        company: 'Thông tin công ty',
        contact: 'Liên hệ',
        social: 'Mạng xã hội',
        email: 'Email hệ thống',
        seo: 'SEO mặc định',
        system: 'Hệ thống',
      } as Record<string, string>
    )[value] ?? value
  );
}
