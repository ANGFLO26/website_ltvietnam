-- F6: schema.org LocalBusiness phai co dung mot nguon quyet dinh.
--
-- Khong co chi muc nay, hai van phong cung co the la `head_office` + published
-- va findHeadOffice() se chon mot hang theo display_order. Structured data cua
-- toan site khi do phu thuoc thu tu nhap lieu thay vi mot bat bien du lieu.
CREATE UNIQUE INDEX uq_offices_one_published_head_office
  ON ltv.offices (office_type)
  WHERE office_type = 'head_office' AND status = 'published';
