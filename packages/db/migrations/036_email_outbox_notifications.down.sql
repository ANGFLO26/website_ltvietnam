DROP INDEX IF EXISTS ltv.idx_outbox_notification_type;

-- Password-reset job khong the bieu dien trong schema cu. Xoa chung truoc khi
-- khoi phuc NOT NULL; rollback migration nay dong nghia quay lai worker cu.
DELETE FROM ltv.inquiry_outbox WHERE inquiry_id IS NULL;

ALTER TABLE ltv.inquiry_outbox
    DROP CONSTRAINT IF EXISTS inquiry_outbox_notification_shape_check,
    DROP CONSTRAINT IF EXISTS inquiry_outbox_notification_type_check,
    DROP COLUMN IF EXISTS payload,
    DROP COLUMN IF EXISTS notification_type,
    ALTER COLUMN inquiry_id SET NOT NULL;
