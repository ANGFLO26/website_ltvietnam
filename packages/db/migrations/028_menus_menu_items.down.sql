-- Rollback cho 028_menus_menu_items
DROP INDEX IF EXISTS ltv.idx_menu_items_menu;
DROP INDEX IF EXISTS ltv.idx_menu_items_parent;
DROP TABLE IF EXISTS ltv.menu_items CASCADE;
DROP TABLE IF EXISTS ltv.menus CASCADE;
