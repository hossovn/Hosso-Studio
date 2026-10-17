import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('vi', 'en');
  CREATE TYPE "public"."enum__pages_v_published_locale" AS ENUM('vi', 'en');
  CREATE TYPE "public"."enum__posts_v_published_locale" AS ENUM('vi', 'en');
  CREATE TYPE "public"."enum_comments_status" AS ENUM('pending', 'approved', 'spam');
  CREATE TYPE "public"."enum_forms_fields_type" AS ENUM('text', 'email', 'tel', 'number', 'textarea', 'select', 'checkbox');
  CREATE TYPE "public"."enum_reusable_blocks_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__reusable_blocks_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__reusable_blocks_v_published_locale" AS ENUM('vi', 'en');
  ALTER TYPE "public"."enum_users_roles" ADD VALUE 'publisher' BEFORE 'editor';
  ALTER TYPE "public"."enum_users_roles" ADD VALUE 'author';
  ALTER TYPE "public"."enum_users_roles" ADD VALUE 'moderator';
  CREATE TABLE "pages_locales" (
  	"title" varchar,
  	"description" varchar,
  	"seo_title" varchar,
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_locales" (
  	"version_title" varchar,
  	"version_description" varchar,
  	"version_seo_title" varchar,
  	"version_content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "posts_locales" (
  	"title" varchar,
  	"excerpt" varchar,
  	"content" jsonb,
  	"seo_title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "posts_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"post_categories_id" integer,
  	"post_tags_id" integer
  );
  
  CREATE TABLE "_posts_v_locales" (
  	"version_title" varchar,
  	"version_excerpt" varchar,
  	"version_content" jsonb,
  	"version_seo_title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_posts_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"post_categories_id" integer,
  	"post_tags_id" integer
  );
  
  CREATE TABLE "post_categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "post_categories_locales" (
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "post_tags" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "post_tags_locales" (
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "comments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"post_id" integer NOT NULL,
  	"author_name" varchar NOT NULL,
  	"author_email" varchar,
  	"content" varchar NOT NULL,
  	"status" "enum_comments_status" DEFAULT 'pending' NOT NULL,
  	"locale" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "forms_fields" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"type" "enum_forms_fields_type" DEFAULT 'text' NOT NULL,
  	"required" boolean
  );
  
  CREATE TABLE "forms_fields_locales" (
  	"label" varchar NOT NULL,
  	"options" varchar,
  	"placeholder" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "forms" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "forms_locales" (
  	"title" varchar NOT NULL,
  	"submit_label" varchar,
  	"success_message" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "form_submissions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"form_id" integer NOT NULL,
  	"form_title" varchar,
  	"data" jsonb NOT NULL,
  	"locale" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "reusable_blocks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_reusable_blocks_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "reusable_blocks_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_reusable_blocks_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__reusable_blocks_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__reusable_blocks_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_reusable_blocks_v_locales" (
  	"version_content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "site_settings_header_menu_children_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_header_menu_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_footer_menu_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_social_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_locales" (
  	"site_name" varchar,
  	"announcement" varchar,
  	"footer_text" varchar,
  	"contact_address" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "site_areas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "site_areas_locales" (
  	"before_header" jsonb,
  	"after_header" jsonb,
  	"before_footer" jsonb,
  	"after_footer" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "_pages_v" ADD COLUMN "snapshot" boolean;
  ALTER TABLE "_pages_v" ADD COLUMN "published_locale" "enum__pages_v_published_locale";
  ALTER TABLE "posts" ADD COLUMN "comments_enabled" boolean DEFAULT true;
  ALTER TABLE "posts" ADD COLUMN "created_by_id" integer;
  ALTER TABLE "_posts_v" ADD COLUMN "version_comments_enabled" boolean DEFAULT true;
  ALTER TABLE "_posts_v" ADD COLUMN "version_created_by_id" integer;
  ALTER TABLE "_posts_v" ADD COLUMN "snapshot" boolean;
  ALTER TABLE "_posts_v" ADD COLUMN "published_locale" "enum__posts_v_published_locale";
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "post_categories_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "post_tags_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "comments_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "forms_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "form_submissions_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "reusable_blocks_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "comments_enabled" boolean DEFAULT true;
  ALTER TABLE "site_settings" ADD COLUMN "comments_auto_approve" boolean DEFAULT false;
  ALTER TABLE "pages_locales" ADD CONSTRAINT "pages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_locales" ADD CONSTRAINT "_pages_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_locales" ADD CONSTRAINT "posts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_post_categories_fk" FOREIGN KEY ("post_categories_id") REFERENCES "public"."post_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_post_tags_fk" FOREIGN KEY ("post_tags_id") REFERENCES "public"."post_tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_locales" ADD CONSTRAINT "_posts_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_post_categories_fk" FOREIGN KEY ("post_categories_id") REFERENCES "public"."post_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_post_tags_fk" FOREIGN KEY ("post_tags_id") REFERENCES "public"."post_tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "post_categories_locales" ADD CONSTRAINT "post_categories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."post_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "post_tags_locales" ADD CONSTRAINT "post_tags_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."post_tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "forms_fields" ADD CONSTRAINT "forms_fields_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_fields_locales" ADD CONSTRAINT "forms_fields_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_fields"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_locales" ADD CONSTRAINT "forms_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reusable_blocks_locales" ADD CONSTRAINT "reusable_blocks_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."reusable_blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_reusable_blocks_v" ADD CONSTRAINT "_reusable_blocks_v_parent_id_reusable_blocks_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."reusable_blocks"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_reusable_blocks_v_locales" ADD CONSTRAINT "_reusable_blocks_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_reusable_blocks_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_header_menu_children_locales" ADD CONSTRAINT "site_settings_header_menu_children_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings_header_menu_children"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_header_menu_locales" ADD CONSTRAINT "site_settings_header_menu_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings_header_menu"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_footer_menu_locales" ADD CONSTRAINT "site_settings_footer_menu_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings_footer_menu"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_social_locales" ADD CONSTRAINT "site_settings_social_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings_social"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_locales" ADD CONSTRAINT "site_settings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_areas_locales" ADD CONSTRAINT "site_areas_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_areas"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "pages_locales_locale_parent_id_unique" ON "pages_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_locales_parent_id_idx" ON "pages_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_locales_locale_parent_id_unique" ON "_pages_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_locales_parent_id_idx" ON "_pages_v_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "posts_locales_locale_parent_id_unique" ON "posts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "posts_locales_parent_id_idx" ON "posts_locales" USING btree ("_parent_id");
  CREATE INDEX "posts_rels_order_idx" ON "posts_rels" USING btree ("order");
  CREATE INDEX "posts_rels_parent_idx" ON "posts_rels" USING btree ("parent_id");
  CREATE INDEX "posts_rels_path_idx" ON "posts_rels" USING btree ("path");
  CREATE INDEX "posts_rels_post_categories_id_idx" ON "posts_rels" USING btree ("post_categories_id");
  CREATE INDEX "posts_rels_post_tags_id_idx" ON "posts_rels" USING btree ("post_tags_id");
  CREATE UNIQUE INDEX "_posts_v_locales_locale_parent_id_unique" ON "_posts_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_posts_v_locales_parent_id_idx" ON "_posts_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_rels_order_idx" ON "_posts_v_rels" USING btree ("order");
  CREATE INDEX "_posts_v_rels_parent_idx" ON "_posts_v_rels" USING btree ("parent_id");
  CREATE INDEX "_posts_v_rels_path_idx" ON "_posts_v_rels" USING btree ("path");
  CREATE INDEX "_posts_v_rels_post_categories_id_idx" ON "_posts_v_rels" USING btree ("post_categories_id");
  CREATE INDEX "_posts_v_rels_post_tags_id_idx" ON "_posts_v_rels" USING btree ("post_tags_id");
  CREATE UNIQUE INDEX "post_categories_slug_idx" ON "post_categories" USING btree ("slug");
  CREATE INDEX "post_categories_updated_at_idx" ON "post_categories" USING btree ("updated_at");
  CREATE INDEX "post_categories_created_at_idx" ON "post_categories" USING btree ("created_at");
  CREATE UNIQUE INDEX "post_categories_locales_locale_parent_id_unique" ON "post_categories_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "post_categories_locales_parent_id_idx" ON "post_categories_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "post_tags_slug_idx" ON "post_tags" USING btree ("slug");
  CREATE INDEX "post_tags_updated_at_idx" ON "post_tags" USING btree ("updated_at");
  CREATE INDEX "post_tags_created_at_idx" ON "post_tags" USING btree ("created_at");
  CREATE UNIQUE INDEX "post_tags_locales_locale_parent_id_unique" ON "post_tags_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "post_tags_locales_parent_id_idx" ON "post_tags_locales" USING btree ("_parent_id");
  CREATE INDEX "comments_post_idx" ON "comments" USING btree ("post_id");
  CREATE INDEX "comments_updated_at_idx" ON "comments" USING btree ("updated_at");
  CREATE INDEX "comments_created_at_idx" ON "comments" USING btree ("created_at");
  CREATE INDEX "forms_fields_order_idx" ON "forms_fields" USING btree ("_order");
  CREATE INDEX "forms_fields_parent_id_idx" ON "forms_fields" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "forms_fields_locales_locale_parent_id_unique" ON "forms_fields_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_fields_locales_parent_id_idx" ON "forms_fields_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "forms_slug_idx" ON "forms" USING btree ("slug");
  CREATE INDEX "forms_updated_at_idx" ON "forms" USING btree ("updated_at");
  CREATE INDEX "forms_created_at_idx" ON "forms" USING btree ("created_at");
  CREATE UNIQUE INDEX "forms_locales_locale_parent_id_unique" ON "forms_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_locales_parent_id_idx" ON "forms_locales" USING btree ("_parent_id");
  CREATE INDEX "form_submissions_form_idx" ON "form_submissions" USING btree ("form_id");
  CREATE INDEX "form_submissions_updated_at_idx" ON "form_submissions" USING btree ("updated_at");
  CREATE INDEX "form_submissions_created_at_idx" ON "form_submissions" USING btree ("created_at");
  CREATE UNIQUE INDEX "reusable_blocks_slug_idx" ON "reusable_blocks" USING btree ("slug");
  CREATE INDEX "reusable_blocks_updated_at_idx" ON "reusable_blocks" USING btree ("updated_at");
  CREATE INDEX "reusable_blocks_created_at_idx" ON "reusable_blocks" USING btree ("created_at");
  CREATE INDEX "reusable_blocks__status_idx" ON "reusable_blocks" USING btree ("_status");
  CREATE UNIQUE INDEX "reusable_blocks_locales_locale_parent_id_unique" ON "reusable_blocks_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "reusable_blocks_locales_parent_id_idx" ON "reusable_blocks_locales" USING btree ("_parent_id");
  CREATE INDEX "_reusable_blocks_v_parent_idx" ON "_reusable_blocks_v" USING btree ("parent_id");
  CREATE INDEX "_reusable_blocks_v_version_version_slug_idx" ON "_reusable_blocks_v" USING btree ("version_slug");
  CREATE INDEX "_reusable_blocks_v_version_version_updated_at_idx" ON "_reusable_blocks_v" USING btree ("version_updated_at");
  CREATE INDEX "_reusable_blocks_v_version_version_created_at_idx" ON "_reusable_blocks_v" USING btree ("version_created_at");
  CREATE INDEX "_reusable_blocks_v_version_version__status_idx" ON "_reusable_blocks_v" USING btree ("version__status");
  CREATE INDEX "_reusable_blocks_v_created_at_idx" ON "_reusable_blocks_v" USING btree ("created_at");
  CREATE INDEX "_reusable_blocks_v_updated_at_idx" ON "_reusable_blocks_v" USING btree ("updated_at");
  CREATE INDEX "_reusable_blocks_v_snapshot_idx" ON "_reusable_blocks_v" USING btree ("snapshot");
  CREATE INDEX "_reusable_blocks_v_published_locale_idx" ON "_reusable_blocks_v" USING btree ("published_locale");
  CREATE INDEX "_reusable_blocks_v_latest_idx" ON "_reusable_blocks_v" USING btree ("latest");
  CREATE INDEX "_reusable_blocks_v_autosave_idx" ON "_reusable_blocks_v" USING btree ("autosave");
  CREATE UNIQUE INDEX "_reusable_blocks_v_locales_locale_parent_id_unique" ON "_reusable_blocks_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_reusable_blocks_v_locales_parent_id_idx" ON "_reusable_blocks_v_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "site_settings_header_menu_children_locales_locale_parent_id_" ON "site_settings_header_menu_children_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_settings_header_menu_children_locales_parent_id_idx" ON "site_settings_header_menu_children_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "site_settings_header_menu_locales_locale_parent_id_unique" ON "site_settings_header_menu_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_settings_header_menu_locales_parent_id_idx" ON "site_settings_header_menu_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "site_settings_footer_menu_locales_locale_parent_id_unique" ON "site_settings_footer_menu_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_settings_footer_menu_locales_parent_id_idx" ON "site_settings_footer_menu_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "site_settings_social_locales_locale_parent_id_unique" ON "site_settings_social_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_settings_social_locales_parent_id_idx" ON "site_settings_social_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "site_settings_locales_locale_parent_id_unique" ON "site_settings_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_settings_locales_parent_id_idx" ON "site_settings_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "site_areas_locales_locale_parent_id_unique" ON "site_areas_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_areas_locales_parent_id_idx" ON "site_areas_locales" USING btree ("_parent_id");
  ALTER TABLE "posts" ADD CONSTRAINT "posts_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_post_categories_fk" FOREIGN KEY ("post_categories_id") REFERENCES "public"."post_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_post_tags_fk" FOREIGN KEY ("post_tags_id") REFERENCES "public"."post_tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_comments_fk" FOREIGN KEY ("comments_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_forms_fk" FOREIGN KEY ("forms_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_form_submissions_fk" FOREIGN KEY ("form_submissions_id") REFERENCES "public"."form_submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_reusable_blocks_fk" FOREIGN KEY ("reusable_blocks_id") REFERENCES "public"."reusable_blocks"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "_pages_v_snapshot_idx" ON "_pages_v" USING btree ("snapshot");
  CREATE INDEX "_pages_v_published_locale_idx" ON "_pages_v" USING btree ("published_locale");
  CREATE INDEX "posts_created_by_idx" ON "posts" USING btree ("created_by_id");
  CREATE INDEX "_posts_v_version_version_created_by_idx" ON "_posts_v" USING btree ("version_created_by_id");
  CREATE INDEX "_posts_v_snapshot_idx" ON "_posts_v" USING btree ("snapshot");
  CREATE INDEX "_posts_v_published_locale_idx" ON "_posts_v" USING btree ("published_locale");
  CREATE INDEX "payload_locked_documents_rels_post_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("post_categories_id");
  CREATE INDEX "payload_locked_documents_rels_post_tags_id_idx" ON "payload_locked_documents_rels" USING btree ("post_tags_id");
  CREATE INDEX "payload_locked_documents_rels_comments_id_idx" ON "payload_locked_documents_rels" USING btree ("comments_id");
  CREATE INDEX "payload_locked_documents_rels_forms_id_idx" ON "payload_locked_documents_rels" USING btree ("forms_id");
  CREATE INDEX "payload_locked_documents_rels_form_submissions_id_idx" ON "payload_locked_documents_rels" USING btree ("form_submissions_id");
  CREATE INDEX "payload_locked_documents_rels_reusable_blocks_id_idx" ON "payload_locked_documents_rels" USING btree ("reusable_blocks_id");
  ALTER TABLE "pages" DROP COLUMN "title";
  ALTER TABLE "pages" DROP COLUMN "description";
  ALTER TABLE "pages" DROP COLUMN "seo_title";
  ALTER TABLE "pages" DROP COLUMN "content";
  ALTER TABLE "_pages_v" DROP COLUMN "version_title";
  ALTER TABLE "_pages_v" DROP COLUMN "version_description";
  ALTER TABLE "_pages_v" DROP COLUMN "version_seo_title";
  ALTER TABLE "_pages_v" DROP COLUMN "version_content";
  ALTER TABLE "posts" DROP COLUMN "title";
  ALTER TABLE "posts" DROP COLUMN "excerpt";
  ALTER TABLE "posts" DROP COLUMN "content";
  ALTER TABLE "posts" DROP COLUMN "seo_title";
  ALTER TABLE "_posts_v" DROP COLUMN "version_title";
  ALTER TABLE "_posts_v" DROP COLUMN "version_excerpt";
  ALTER TABLE "_posts_v" DROP COLUMN "version_content";
  ALTER TABLE "_posts_v" DROP COLUMN "version_seo_title";
  ALTER TABLE "media" DROP COLUMN "focal_x";
  ALTER TABLE "media" DROP COLUMN "focal_y";
  ALTER TABLE "site_settings_header_menu_children" DROP COLUMN "label";
  ALTER TABLE "site_settings_header_menu" DROP COLUMN "label";
  ALTER TABLE "site_settings_footer_menu" DROP COLUMN "label";
  ALTER TABLE "site_settings_social" DROP COLUMN "label";
  ALTER TABLE "site_settings" DROP COLUMN "site_name";
  ALTER TABLE "site_settings" DROP COLUMN "announcement";
  ALTER TABLE "site_settings" DROP COLUMN "footer_text";
  ALTER TABLE "site_settings" DROP COLUMN "contact_address";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "post_categories" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "post_categories_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "post_tags" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "post_tags_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "comments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "forms_fields" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "forms_fields_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "forms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "forms_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "form_submissions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "reusable_blocks" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "reusable_blocks_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_reusable_blocks_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_reusable_blocks_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_header_menu_children_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_header_menu_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_footer_menu_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_social_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_areas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_areas_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages_locales" CASCADE;
  DROP TABLE "_pages_v_locales" CASCADE;
  DROP TABLE "posts_locales" CASCADE;
  DROP TABLE "posts_rels" CASCADE;
  DROP TABLE "_posts_v_locales" CASCADE;
  DROP TABLE "_posts_v_rels" CASCADE;
  DROP TABLE "post_categories" CASCADE;
  DROP TABLE "post_categories_locales" CASCADE;
  DROP TABLE "post_tags" CASCADE;
  DROP TABLE "post_tags_locales" CASCADE;
  DROP TABLE "comments" CASCADE;
  DROP TABLE "forms_fields" CASCADE;
  DROP TABLE "forms_fields_locales" CASCADE;
  DROP TABLE "forms" CASCADE;
  DROP TABLE "forms_locales" CASCADE;
  DROP TABLE "form_submissions" CASCADE;
  DROP TABLE "reusable_blocks" CASCADE;
  DROP TABLE "reusable_blocks_locales" CASCADE;
  DROP TABLE "_reusable_blocks_v" CASCADE;
  DROP TABLE "_reusable_blocks_v_locales" CASCADE;
  DROP TABLE "site_settings_header_menu_children_locales" CASCADE;
  DROP TABLE "site_settings_header_menu_locales" CASCADE;
  DROP TABLE "site_settings_footer_menu_locales" CASCADE;
  DROP TABLE "site_settings_social_locales" CASCADE;
  DROP TABLE "site_settings_locales" CASCADE;
  DROP TABLE "site_areas" CASCADE;
  DROP TABLE "site_areas_locales" CASCADE;
  ALTER TABLE "posts" DROP CONSTRAINT "posts_created_by_id_users_id_fk";
  
  ALTER TABLE "_posts_v" DROP CONSTRAINT "_posts_v_version_created_by_id_users_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_post_categories_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_post_tags_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_comments_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_forms_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_form_submissions_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_reusable_blocks_fk";
  
  ALTER TABLE "users_roles" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_users_roles";
  CREATE TYPE "public"."enum_users_roles" AS ENUM('admin', 'editor');
  ALTER TABLE "users_roles" ALTER COLUMN "value" SET DATA TYPE "public"."enum_users_roles" USING "value"::"public"."enum_users_roles";
  DROP INDEX "_pages_v_snapshot_idx";
  DROP INDEX "_pages_v_published_locale_idx";
  DROP INDEX "posts_created_by_idx";
  DROP INDEX "_posts_v_version_version_created_by_idx";
  DROP INDEX "_posts_v_snapshot_idx";
  DROP INDEX "_posts_v_published_locale_idx";
  DROP INDEX "payload_locked_documents_rels_post_categories_id_idx";
  DROP INDEX "payload_locked_documents_rels_post_tags_id_idx";
  DROP INDEX "payload_locked_documents_rels_comments_id_idx";
  DROP INDEX "payload_locked_documents_rels_forms_id_idx";
  DROP INDEX "payload_locked_documents_rels_form_submissions_id_idx";
  DROP INDEX "payload_locked_documents_rels_reusable_blocks_id_idx";
  ALTER TABLE "pages" ADD COLUMN "title" varchar;
  ALTER TABLE "pages" ADD COLUMN "description" varchar;
  ALTER TABLE "pages" ADD COLUMN "seo_title" varchar;
  ALTER TABLE "pages" ADD COLUMN "content" jsonb;
  ALTER TABLE "_pages_v" ADD COLUMN "version_title" varchar;
  ALTER TABLE "_pages_v" ADD COLUMN "version_description" varchar;
  ALTER TABLE "_pages_v" ADD COLUMN "version_seo_title" varchar;
  ALTER TABLE "_pages_v" ADD COLUMN "version_content" jsonb;
  ALTER TABLE "posts" ADD COLUMN "title" varchar;
  ALTER TABLE "posts" ADD COLUMN "excerpt" varchar;
  ALTER TABLE "posts" ADD COLUMN "content" jsonb;
  ALTER TABLE "posts" ADD COLUMN "seo_title" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_title" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_excerpt" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_content" jsonb;
  ALTER TABLE "_posts_v" ADD COLUMN "version_seo_title" varchar;
  ALTER TABLE "media" ADD COLUMN "focal_x" numeric;
  ALTER TABLE "media" ADD COLUMN "focal_y" numeric;
  ALTER TABLE "site_settings_header_menu_children" ADD COLUMN "label" varchar NOT NULL;
  ALTER TABLE "site_settings_header_menu" ADD COLUMN "label" varchar NOT NULL;
  ALTER TABLE "site_settings_footer_menu" ADD COLUMN "label" varchar NOT NULL;
  ALTER TABLE "site_settings_social" ADD COLUMN "label" varchar NOT NULL;
  ALTER TABLE "site_settings" ADD COLUMN "site_name" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "announcement" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "footer_text" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "contact_address" varchar;
  ALTER TABLE "_pages_v" DROP COLUMN "snapshot";
  ALTER TABLE "_pages_v" DROP COLUMN "published_locale";
  ALTER TABLE "posts" DROP COLUMN "comments_enabled";
  ALTER TABLE "posts" DROP COLUMN "created_by_id";
  ALTER TABLE "_posts_v" DROP COLUMN "version_comments_enabled";
  ALTER TABLE "_posts_v" DROP COLUMN "version_created_by_id";
  ALTER TABLE "_posts_v" DROP COLUMN "snapshot";
  ALTER TABLE "_posts_v" DROP COLUMN "published_locale";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "post_categories_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "post_tags_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "comments_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "forms_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "form_submissions_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "reusable_blocks_id";
  ALTER TABLE "site_settings" DROP COLUMN "comments_enabled";
  ALTER TABLE "site_settings" DROP COLUMN "comments_auto_approve";
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum__pages_v_published_locale";
  DROP TYPE "public"."enum__posts_v_published_locale";
  DROP TYPE "public"."enum_comments_status";
  DROP TYPE "public"."enum_forms_fields_type";
  DROP TYPE "public"."enum_reusable_blocks_status";
  DROP TYPE "public"."enum__reusable_blocks_v_version_status";
  DROP TYPE "public"."enum__reusable_blocks_v_published_locale";`)
}
