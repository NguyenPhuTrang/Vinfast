-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('ADMIN', 'EDITOR');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "content_status" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "media_type" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "vehicle_media_role" AS ENUM ('HERO', 'EXTERIOR', 'INTERIOR', 'GALLERY', 'VIDEO', 'THUMBNAIL');

-- CreateEnum
CREATE TYPE "audit_action" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'PUBLISH', 'UNPUBLISH', 'LOGIN', 'LOGOUT', 'TOKEN_REFRESH');

-- CreateEnum
CREATE TYPE "contact_status" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "google_id" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "avatar_url" TEXT,
    "role" "user_role" NOT NULL DEFAULT 'EDITOR',
    "status" "user_status" NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "family_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "device_name" VARCHAR(120),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" "audit_action" NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" VARCHAR(100),
    "description" TEXT,
    "metadata" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "vehicle_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "model_code" VARCHAR(80),
    "tagline" VARCHAR(255),
    "short_description" TEXT,
    "description" TEXT,
    "status" "content_status" NOT NULL DEFAULT 'DRAFT',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMPTZ(3),
    "seo_title" VARCHAR(255),
    "seo_description" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_variants" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "vehicle_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_specifications" (
    "id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "group_name" VARCHAR(120) NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "label" VARCHAR(150) NOT NULL,
    "value" VARCHAR(255) NOT NULL,
    "numeric_value" DECIMAL(14,4),
    "unit" VARCHAR(40),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "vehicle_specifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "storage_key" VARCHAR(500) NOT NULL,
    "public_url" TEXT NOT NULL,
    "mime_type" VARCHAR(120) NOT NULL,
    "media_type" "media_type" NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "duration_seconds" DECIMAL(10,3),
    "alt_text" TEXT,
    "uploaded_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_media" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "variant_id" UUID,
    "media_asset_id" UUID NOT NULL,
    "role" "vehicle_media_role" NOT NULL DEFAULT 'GALLERY',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "news_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_articles" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "cover_media_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(280) NOT NULL,
    "excerpt" TEXT,
    "content" JSONB NOT NULL,
    "status" "content_status" NOT NULL DEFAULT 'DRAFT',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMPTZ(3),
    "seo_title" VARCHAR(255),
    "seo_description" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "news_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pages" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(220) NOT NULL,
    "description" TEXT,
    "status" "content_status" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(3),
    "seo_title" VARCHAR(255),
    "seo_description" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_sections" (
    "id" UUID NOT NULL,
    "page_id" UUID NOT NULL,
    "section_type" VARCHAR(80) NOT NULL,
    "title" VARCHAR(255),
    "content" JSONB NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "page_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_albums" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(220) NOT NULL,
    "description" TEXT,
    "cover_media_id" UUID,
    "status" "content_status" NOT NULL DEFAULT 'DRAFT',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "gallery_albums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_items" (
    "id" UUID NOT NULL,
    "album_id" UUID NOT NULL,
    "media_asset_id" UUID NOT NULL,
    "caption" TEXT,
    "alt_text" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faq_items" (
    "id" UUID NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "question" VARCHAR(500) NOT NULL,
    "answer" TEXT NOT NULL,
    "status" "content_status" NOT NULL DEFAULT 'DRAFT',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "faq_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_submissions" (
    "id" UUID NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(30),
    "subject" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "status" "contact_status" NOT NULL DEFAULT 'NEW',
    "assigned_to_id" UUID,
    "resolved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "contact_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_expires_at_idx" ON "refresh_tokens"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_revoked_at_idx" ON "refresh_tokens"("revoked_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_categories_slug_key" ON "vehicle_categories"("slug");

-- CreateIndex
CREATE INDEX "vehicle_categories_is_active_sort_order_idx" ON "vehicle_categories"("is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_slug_key" ON "vehicles"("slug");

-- CreateIndex
CREATE INDEX "vehicles_category_id_status_sort_order_idx" ON "vehicles"("category_id", "status", "sort_order");

-- CreateIndex
CREATE INDEX "vehicles_status_published_at_idx" ON "vehicles"("status", "published_at");

-- CreateIndex
CREATE INDEX "vehicles_is_featured_status_idx" ON "vehicles"("is_featured", "status");

-- CreateIndex
CREATE INDEX "vehicle_variants_vehicle_id_is_active_sort_order_idx" ON "vehicle_variants"("vehicle_id", "is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_variants_vehicle_id_code_key" ON "vehicle_variants"("vehicle_id", "code");

-- CreateIndex
CREATE INDEX "vehicle_specifications_variant_id_group_name_sort_order_idx" ON "vehicle_specifications"("variant_id", "group_name", "sort_order");

-- CreateIndex
CREATE INDEX "vehicle_specifications_key_idx" ON "vehicle_specifications"("key");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_specifications_variant_id_key_key" ON "vehicle_specifications"("variant_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_storage_key_key" ON "media_assets"("storage_key");

-- CreateIndex
CREATE INDEX "media_assets_media_type_created_at_idx" ON "media_assets"("media_type", "created_at");

-- CreateIndex
CREATE INDEX "media_assets_uploaded_by_id_idx" ON "media_assets"("uploaded_by_id");

-- CreateIndex
CREATE INDEX "vehicle_media_vehicle_id_role_sort_order_idx" ON "vehicle_media"("vehicle_id", "role", "sort_order");

-- CreateIndex
CREATE INDEX "vehicle_media_variant_id_idx" ON "vehicle_media"("variant_id");

-- CreateIndex
CREATE INDEX "vehicle_media_media_asset_id_idx" ON "vehicle_media"("media_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "news_categories_slug_key" ON "news_categories"("slug");

-- CreateIndex
CREATE INDEX "news_categories_is_active_sort_order_idx" ON "news_categories"("is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "news_articles_slug_key" ON "news_articles"("slug");

-- CreateIndex
CREATE INDEX "news_articles_category_id_status_idx" ON "news_articles"("category_id", "status");

-- CreateIndex
CREATE INDEX "news_articles_author_id_created_at_idx" ON "news_articles"("author_id", "created_at");

-- CreateIndex
CREATE INDEX "news_articles_status_published_at_idx" ON "news_articles"("status", "published_at");

-- CreateIndex
CREATE INDEX "news_articles_is_featured_status_idx" ON "news_articles"("is_featured", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pages_slug_key" ON "pages"("slug");

-- CreateIndex
CREATE INDEX "pages_status_published_at_idx" ON "pages"("status", "published_at");

-- CreateIndex
CREATE INDEX "page_sections_page_id_is_visible_sort_order_idx" ON "page_sections"("page_id", "is_visible", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "gallery_albums_slug_key" ON "gallery_albums"("slug");

-- CreateIndex
CREATE INDEX "gallery_albums_status_sort_order_idx" ON "gallery_albums"("status", "sort_order");

-- CreateIndex
CREATE INDEX "gallery_items_album_id_sort_order_idx" ON "gallery_items"("album_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "gallery_items_album_id_media_asset_id_key" ON "gallery_items"("album_id", "media_asset_id");

-- CreateIndex
CREATE INDEX "faq_items_category_status_sort_order_idx" ON "faq_items"("category", "status", "sort_order");

-- CreateIndex
CREATE INDEX "contact_submissions_status_created_at_idx" ON "contact_submissions"("status", "created_at");

-- CreateIndex
CREATE INDEX "contact_submissions_assigned_to_id_status_idx" ON "contact_submissions"("assigned_to_id", "status");

-- CreateIndex
CREATE INDEX "contact_submissions_email_idx" ON "contact_submissions"("email");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "vehicle_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_variants" ADD CONSTRAINT "vehicle_variants_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_specifications" ADD CONSTRAINT "vehicle_specifications_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "vehicle_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_media" ADD CONSTRAINT "vehicle_media_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_media" ADD CONSTRAINT "vehicle_media_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "vehicle_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_media" ADD CONSTRAINT "vehicle_media_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "news_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_cover_media_id_fkey" FOREIGN KEY ("cover_media_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_sections" ADD CONSTRAINT "page_sections_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_albums" ADD CONSTRAINT "gallery_albums_cover_media_id_fkey" FOREIGN KEY ("cover_media_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "gallery_albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_submissions" ADD CONSTRAINT "contact_submissions_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
