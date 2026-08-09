-- F7: hai upload dong thoi cung noi dung chi duoc tao mot ban ghi dang hoat dong.
CREATE UNIQUE INDEX idx_media_checksum_unique_active
  ON ltv.media (checksum)
  WHERE checksum IS NOT NULL AND deleted_at IS NULL;
