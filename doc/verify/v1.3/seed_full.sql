INSERT INTO ltv.users (id,name,email,password_hash) VALUES ('0a000000-0000-0000-0000-00000000000a','Admin','admin@ltvietnam.com.vn','x');
INSERT INTO ltv.media (id,file_name,original_name,storage_path,storage_class,mime_type,file_extension,file_size,variants) VALUES
 ('e0000000-0000-0000-0000-000000000001','optidist.jpg','OptiDist.jpg','public-media/originals/optidist.jpg','public','image/jpeg','jpg',12345,'{"thumb":"public-media/variants/optidist-thumb.webp"}'),
 ('e0000000-0000-0000-0000-000000000002','cat.pdf','Catalogue.pdf','protected-documents/cat.pdf','protected','application/pdf','pdf',99999,'{}'),
 ('e0000000-0000-0000-0000-000000000003','banner.jpg','Banner.jpg','public-media/originals/banner.jpg','public','image/jpeg','jpg',5555,'{}'),
 ('e0000000-0000-0000-0000-000000000004','inblock.jpg','InBlock.jpg','public-media/originals/inblock.jpg','public','image/jpeg','jpg',777,'{}');
UPDATE ltv.products SET featured_image_id='e0000000-0000-0000-0000-000000000001', short_description='Automatic atmospheric distillation analyzer', overview='[{"type":"paragraph","text":"..."}]'::jsonb WHERE slug='optidist-atmospheric-distillation';
INSERT INTO ltv.product_media (product_id,media_id,media_role,display_order) VALUES ('d0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000001','gallery',0);
INSERT INTO ltv.product_specifications (product_id,group_key,label,value,unit,display_order) VALUES
 ('d0000000-0000-0000-0000-000000000001','measurement','Temperature range','0-400','degC',0),
 ('d0000000-0000-0000-0000-000000000001','measurement','Resolution','0.1','degC',1);
INSERT INTO ltv.industries (id,name,slug,status,is_featured) VALUES ('f0000000-0000-0000-0000-000000000001','Refinery','refinery','published',TRUE);
INSERT INTO ltv.product_industries VALUES ('d0000000-0000-0000-0000-000000000001','f0000000-0000-0000-0000-000000000001');
INSERT INTO ltv.related_products VALUES ('d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002','similar',0);
-- documents
INSERT INTO ltv.documents (id,document_type,file_id,title,slug,status,visibility,published_at,first_published_at) VALUES
 ('40000000-0000-0000-0000-000000000001','catalogue','e0000000-0000-0000-0000-000000000002','OptiDist Catalogue','optidist-catalogue','published','public',NOW(),NOW()),
 ('40000000-0000-0000-0000-000000000002','datasheet','e0000000-0000-0000-0000-000000000002','Hidden Sheet','hidden-sheet','published','hidden',NOW(),NOW());
INSERT INTO ltv.document_products VALUES ('40000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001',0);
-- services (co ban dich)
INSERT INTO ltv.services (id,ancestor_ids,depth,status,published_at) VALUES ('50000000-0000-0000-0000-000000000001','{}',0,'published',NOW());
INSERT INTO ltv.service_translations (service_id,locale,name,slug,short_description,status,published_at,first_published_at) VALUES
 ('50000000-0000-0000-0000-000000000001','en','Laboratory Instrument Services','laboratory-instrument-services','Calibration and repair','published',NOW(),NOW()),
 ('50000000-0000-0000-0000-000000000001','vi','Dịch vụ thiết bị phòng thí nghiệm','dich-vu-thiet-bi-phong-thi-nghiem','Hiệu chuẩn và sửa chữa','published',NOW(),NOW());
-- posts (VI chua publish -> khong duoc co hreflang)
INSERT INTO ltv.post_categories (id,ancestor_ids,depth,name,slug,status) VALUES ('60000000-0000-0000-0000-000000000001','{}',0,'News','news','published');
INSERT INTO ltv.posts (id,category_id,status,published_at) VALUES ('61000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','published',NOW());
INSERT INTO ltv.post_translations (post_id,locale,title,slug,excerpt,status,published_at,first_published_at) VALUES
 ('61000000-0000-0000-0000-000000000001','en','LT Vietnam at Expo 2026','lt-vietnam-expo-2026','See us there','published',NOW(),NOW()),
 ('61000000-0000-0000-0000-000000000001','vi','LT Việt Nam tại Expo 2026','lt-viet-nam-expo-2026','Bản nháp','draft',NULL,NULL);
-- pages
INSERT INTO ltv.pages (id,page_type,status,is_system_page,published_at) VALUES
 ('70000000-0000-0000-0000-000000000001','about','published',FALSE,NOW()),
 ('70000000-0000-0000-0000-000000000002','privacy_policy','published',TRUE,NOW());
INSERT INTO ltv.page_translations (page_id,locale,title,slug,content,status,published_at,first_published_at) VALUES
 ('70000000-0000-0000-0000-000000000001','en','About LT Vietnam','about','[{"type":"image","media_id":"e0000000-0000-0000-0000-000000000004"}]'::jsonb,'published',NOW(),NOW()),
 ('70000000-0000-0000-0000-000000000001','vi','Về LT Việt Nam','ve-lt-viet-nam','[]'::jsonb,'published',NOW(),NOW()),
 ('70000000-0000-0000-0000-000000000002','en','Privacy Policy','privacy-policy','[]'::jsonb,'published',NOW(),NOW());
INSERT INTO ltv.content_media_refs (media_id,entity_type,entity_id,locale,field_name) VALUES
 ('e0000000-0000-0000-0000-000000000004','page','70000000-0000-0000-0000-000000000001','en','content');
-- customers / projects / offices / banners / homepage / menus
INSERT INTO ltv.customers (id,name,is_public,is_featured,status) VALUES ('80000000-0000-0000-0000-000000000001','Dung Quat Refinery',TRUE,TRUE,'published');
INSERT INTO ltv.projects (id,customer_id,project_type,customer_visibility,status,published_at) VALUES ('81000000-0000-0000-0000-000000000001','80000000-0000-0000-0000-000000000001','installation','public','published',NOW());
INSERT INTO ltv.project_translations (project_id,locale,title,slug,status,published_at,first_published_at) VALUES
 ('81000000-0000-0000-0000-000000000001','en','Distillation lab upgrade','distillation-lab-upgrade','published',NOW(),NOW());
INSERT INTO ltv.offices (office_type,name,address,phone,status,display_order) VALUES
 ('head_office','Hanoi HQ','203 Nguyen Huy Tuong, Thanh Xuan, Hanoi','(84-24) 6650 6373','published',0),
 ('branch','HCM Office','56 Yen The, Tan Binh, HCMC','(84-28) 983 870 357','published',1);
INSERT INTO ltv.banners (image_id,title,status,display_order,start_at,end_at) VALUES
 ('e0000000-0000-0000-0000-000000000003','Analytical excellence','published',0,NOW()-INTERVAL '1 day',NOW()+INTERVAL '30 days'),
 ('e0000000-0000-0000-0000-000000000003','Expired banner','published',1,NOW()-INTERVAL '10 days',NOW()-INTERVAL '1 day');
INSERT INTO ltv.homepage_sections (section_type,is_enabled,display_order,settings) VALUES
 ('hero',TRUE,0,'{"limit":5}'::jsonb),('featured_products',TRUE,1,'{"limit":8}'::jsonb),('offices',TRUE,2,'{}'::jsonb);
INSERT INTO ltv.menus (id,code,name,location) VALUES ('90000000-0000-0000-0000-000000000001','header','Header','header');
INSERT INTO ltv.menu_items (menu_id,label,label_i18n_key,link_type,display_order) VALUES
 ('90000000-0000-0000-0000-000000000001','Products','nav.products','product_category',0),
 ('90000000-0000-0000-0000-000000000001','Contact','nav.contact','page',1);
UPDATE ltv.brands SET is_featured=TRUE WHERE slug IN ('pac','baker-hughes');
UPDATE ltv.product_categories SET is_featured=TRUE, short_description='All lab instruments' WHERE slug='laboratory-instruments';
UPDATE ltv.standards SET is_featured=TRUE WHERE slug='astm-d86';
UPDATE ltv.applications SET is_featured=TRUE WHERE slug='fuel-analysis';
UPDATE ltv.products SET first_published_at=NOW() WHERE first_published_at IS NULL AND status='published';
