import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Nâng cấp từ DB PoC cũ (trước khi có đa ngôn ngữ): migration kế tiếp chuyển các cột chữ/nội dung sang bảng bản dịch
 * và xóa cột cũ, nên ở đây chụp nhanh dữ liệu cũ vào bảng tạm `_poc_*`; migration `poc_data_restore` đặt lại vào
 * ngôn ngữ đầu tiên (vi) rồi xóa bảng tạm. DB mới hoàn toàn thì các bảng này rỗng.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TABLE "_poc_pages" AS SELECT "id", "title", "description", "seo_title", "content" FROM "pages";
  CREATE TABLE "_poc_pages_v" AS SELECT "id", "version_title", "version_description", "version_seo_title", "version_content" FROM "_pages_v";
  CREATE TABLE "_poc_posts" AS SELECT "id", "title", "excerpt", "seo_title", "content" FROM "posts";
  CREATE TABLE "_poc_posts_v" AS SELECT "id", "version_title", "version_excerpt", "version_seo_title", "version_content" FROM "_posts_v";
  CREATE TABLE "_poc_site_settings" AS SELECT "id", "site_name", "announcement", "footer_text", "contact_address" FROM "site_settings";
  CREATE TABLE "_poc_social" AS SELECT "id", "label" FROM "site_settings_social";
  CREATE TABLE "_poc_menus" AS SELECT
    (SELECT jsonb_strip_nulls(COALESCE(jsonb_agg(jsonb_build_object(
        'label', m."label", 'href', m."href",
        'children', (SELECT jsonb_agg(jsonb_build_object('label', c."label", 'href', c."href") ORDER BY c."_order") FROM "site_settings_header_menu_children" c WHERE c."_parent_id" = m."id")
      ) ORDER BY m."_order"), '[]'::jsonb)) FROM "site_settings_header_menu" m) AS "header_menu",
    (SELECT jsonb_strip_nulls(COALESCE(jsonb_agg(jsonb_build_object('label', f."label", 'href', f."href") ORDER BY f."_order"), '[]'::jsonb)) FROM "site_settings_footer_menu" f) AS "footer_menu";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP TABLE IF EXISTS "_poc_pages", "_poc_pages_v", "_poc_posts", "_poc_posts_v", "_poc_site_settings", "_poc_social", "_poc_menus";`)
}
