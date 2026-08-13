'use client';

import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from './Button';

export function Dialog({
  open,
  title,
  description,
  children,
  onOpenChange,
  footer,
}: {
  readonly open: boolean;
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      (dialog.querySelector<HTMLElement>('[data-autofocus]') ?? focusable(dialog)[0])?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
      opener.current?.focus();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dialog-title"
      aria-describedby={description ? 'dialog-description' : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onOpenChange(false);
          return;
        }
        if (event.key !== 'Tab') return;
        const items = focusable(event.currentTarget);
        if (items.length === 0) return;
        const first = items[0]!;
        const last = items.at(-1)!;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onClose={() => {
        opener.current?.focus();
        onOpenChange(false);
      }}
    >
      <div className="dialog__header">
        <div>
          <h2 id="dialog-title">{title}</h2>
          {description ? <p id="dialog-description">{description}</p> : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          aria-label="Đóng hộp thoại"
          icon={<X size={18} />}
          onClick={() => onOpenChange(false)}
        />
      </div>
      <div className="dialog__body">{children}</div>
      {footer ? <div className="dialog__footer">{footer}</div> : null}
    </dialog>
  );
}

function focusable(root: HTMLElement): HTMLElement[] {
  return [
    ...root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((item) => !item.hasAttribute('hidden') && item.getAttribute('aria-hidden') !== 'true');
}
