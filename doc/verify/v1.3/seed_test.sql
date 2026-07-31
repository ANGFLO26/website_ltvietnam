-- Du lieu mo phong dung cau truc website that
INSERT INTO ltv.brands (id, parent_id, ancestor_ids, depth, brand_type, name, slug, status) VALUES
 ('11111111-1111-1111-1111-111111111111', NULL, '{}', 0, 'manufacturer', 'PAC', 'pac', 'published');
INSERT INTO ltv.brands (id, parent_id, ancestor_ids, depth, brand_type, name, slug, status) VALUES
 ('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','{11111111-1111-1111-1111-111111111111}',1,'sub_brand','HERZOG','herzog','published'),
 ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','{11111111-1111-1111-1111-111111111111}',1,'sub_brand','ISL','isl','published'),
 ('44444444-4444-4444-4444-444444444444','11111111-1111-1111-1111-111111111111','{11111111-1111-1111-1111-111111111111}',1,'sub_brand','ALCOR','alcor','published'),
 ('55555555-5555-5555-5555-555555555555', NULL,'{}',0,'manufacturer','Baker Hughes','baker-hughes','published');

-- Danh muc 3 cap
INSERT INTO ltv.product_categories (id,parent_id,ancestor_ids,depth,name,slug,status) VALUES
 ('a0000000-0000-0000-0000-000000000001',NULL,'{}',0,'Laboratory Instruments','laboratory-instruments','published'),
 ('a0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001','{a0000000-0000-0000-0000-000000000001}',1,'Distillation','distillation','published'),
 ('a0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000002','{a0000000-0000-0000-0000-000000000001,a0000000-0000-0000-0000-000000000002}',2,'Atmospheric Distillation','atmospheric-distillation','published');

INSERT INTO ltv.standards (id,organization,code,name,slug,status) VALUES
 ('b0000000-0000-0000-0000-000000000001','ASTM','D86','Distillation of Petroleum Products','astm-d86','published'),
 ('b0000000-0000-0000-0000-000000000002','ASTM','D93','Flash Point Pensky-Martens','astm-d93','published');

INSERT INTO ltv.applications (id,parent_id,ancestor_ids,depth,name,slug,status) VALUES
 ('c0000000-0000-0000-0000-000000000001',NULL,'{}',0,'Fuel Analysis','fuel-analysis','published');

-- San pham gan vao THUONG HIEU CON va DANH MUC CAP 3 (giong site that)
INSERT INTO ltv.products (id,brand_id,name,slug,model,status,published_at) VALUES
 ('d0000000-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','OptiDist Atmospheric Distillation','optidist-atmospheric-distillation','OptiDist','published',NOW()),
 ('d0000000-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','OptiFlash Pensky Martens','optiflash-pensky-martens','OptiFlash PM','published',NOW()),
 ('d0000000-0000-0000-0000-000000000003','33333333-3333-3333-3333-333333333333','ISL Viscometer','isl-viscometer','HVM 472','published',NOW()),
 ('d0000000-0000-0000-0000-000000000004','55555555-5555-5555-5555-555555555555','Masoneilan Control Valve','masoneilan-control-valve','Mason-1','published',NOW());

INSERT INTO ltv.product_category_links (product_id,category_id,is_primary) VALUES
 ('d0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003',TRUE),
 ('d0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000003',TRUE),
 ('d0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000002',TRUE);

INSERT INTO ltv.product_standards (product_id,standard_id,compliance_type) VALUES
 ('d0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','compliance'),
 ('d0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000002','compliance'),
 ('d0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000001','compliance');

INSERT INTO ltv.product_applications (product_id,application_id,is_primary) VALUES
 ('d0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001',TRUE),
 ('d0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001',FALSE);
