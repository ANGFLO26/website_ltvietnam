-- Mo rong inquiry_outbox thanh hang doi EMAIL dung chung.
-- Ten bang duoc giu lai de tranh mot migration sao chep/doi ten khong can thiet;
-- moi job van co loai ro rang va CHECK ngan payload sai hinh dang.
ALTER TABLE ltv.inquiry_outbox
    ALTER COLUMN inquiry_id DROP NOT NULL,
    ADD COLUMN notification_type VARCHAR(40) NOT NULL DEFAULT 'inquiry_received',
    ADD COLUMN payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD CONSTRAINT inquiry_outbox_notification_type_check
        CHECK (notification_type IN ('inquiry_received', 'password_reset')),
    ADD CONSTRAINT inquiry_outbox_notification_shape_check
        CHECK (
            (notification_type = 'inquiry_received' AND inquiry_id IS NOT NULL)
            OR
            (notification_type = 'password_reset' AND inquiry_id IS NULL)
        );

CREATE INDEX idx_outbox_notification_type
    ON ltv.inquiry_outbox(notification_type, status, next_attempt_at);
