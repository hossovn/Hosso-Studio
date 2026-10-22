import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/** Đặt lại dữ liệu PoC cũ (chụp ở poc_data_snapshot) vào bảng bản dịch, ngôn ngữ đầu tiên là 'vi', rồi xóa bảng tạm. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  INSERT INTO "pages_locales" ("title", "description", "seo_title", "content", "_locale", "_parent_id")
    SELECT "title", "description", "seo_title", "content", 'vi', "id" FROM "_poc_pages" ON CONFLICT DO NOTHING;
  INSERT INTO "_pages_v_locales" ("version_title", "version_description", "version_seo_title", "version_content", "_locale", "_parent_id")
    SELECT "version_title", "version_description", "version_seo_title", "version_content", 'vi', "id" FROM "_poc_pages_v" ON CONFLICT DO NOTHING;
  INSERT INTO "posts_locales" ("title", "excerpt", "seo_title", "content", "_locale", "_parent_id")
    SELECT "title", "excerpt", "seo_title", "content", 'vi', "id" FROM "_poc_posts" ON CONFLICT DO NOTHING;
  INSERT INTO "_posts_v_locales" ("version_title", "version_excerpt", "version_seo_title", "version_content", "_locale", "_parent_id")
    SELECT "version_title", "version_excerpt", "version_seo_title", "version_content", 'vi', "id" FROM "_poc_posts_v" ON CONFLICT DO NOTHING;
  INSERT INTO "site_settings_social_locales" ("label", "_locale", "_parent_id")
    SELECT "label", 'vi', "id" FROM "_poc_social" ON CONFLICT DO NOTHING;
  INSERT INTO "site_settings_locales" ("site_name", "announcement", "footer_text", "contact_address", "header_menu", "footer_menu", "_locale", "_parent_id")
    SELECT s."site_name", s."announcement", s."footer_text", s."contact_address", m."header_menu", m."footer_menu", 'vi', s."id"
    FROM "_poc_site_settings" s CROSS JOIN "_poc_menus" m ON CONFLICT DO NOTHING;
  DROP TABLE "_poc_pages", "_poc_pages_v", "_poc_posts", "_poc_posts_v", "_poc_site_settings", "_poc_social", "_poc_menus";`)
}

export async function down(_: MigrateDownArgs): Promise<void> {
  // Không có bước ngược: dữ liệu đã nằm ở bảng bản dịch.
}
