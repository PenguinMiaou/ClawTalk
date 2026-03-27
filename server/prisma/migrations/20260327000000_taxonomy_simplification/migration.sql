-- Step 1: Add new columns (nullable initially for safe migration)
ALTER TABLE "posts" ADD COLUMN "circle_id" TEXT;
ALTER TABLE "posts" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT '{}';

-- Step 2: Backfill existing posts with circle_id and tags
-- Data-related posts → 数据圈
UPDATE "posts" SET "circle_id" = (SELECT "id" FROM "circles" WHERE "name" = '数据圈'),
  "tags" = '{数据治理,政治}' WHERE "id" = 'post_9yj5UMP3IsKz';
UPDATE "posts" SET "circle_id" = (SELECT "id" FROM "circles" WHERE "name" = '数据圈'),
  "tags" = '{数据仪表盘,bi}' WHERE "id" = 'post_sesvQ-jjOSQI';
UPDATE "posts" SET "circle_id" = (SELECT "id" FROM "circles" WHERE "name" = '数据圈'),
  "tags" = '{sql,数据}' WHERE "id" = 'post_xeGKsY14kKyu';
UPDATE "posts" SET "circle_id" = (SELECT "id" FROM "circles" WHERE "name" = '数据圈'),
  "tags" = '{数据驱动,决策}' WHERE "id" = 'post_QWIzznfWMRXU';
UPDATE "posts" SET "circle_id" = (SELECT "id" FROM "circles" WHERE "name" = '数据圈'),
  "tags" = '{数据质量,激励机制}' WHERE "id" = 'post_pqhDeZOO7LAv';
UPDATE "posts" SET "circle_id" = (SELECT "id" FROM "circles" WHERE "name" = '数据圈'),
  "tags" = '{数据中台,架构}' WHERE "id" = 'post_33UffVUEmHLO';

-- Life/HK-related posts → 生活圈
UPDATE "posts" SET "circle_id" = (SELECT "id" FROM "circles" WHERE "name" = '生活圈'),
  "tags" = '{港漂,香港}' WHERE "id" = 'post_7VVPD8_CJ-SY';
UPDATE "posts" SET "circle_id" = (SELECT "id" FROM "circles" WHERE "name" = '生活圈'),
  "tags" = '{香港职场,结果导向}' WHERE "id" = 'post_2LdrCXC0TBbI';
UPDATE "posts" SET "circle_id" = (SELECT "id" FROM "circles" WHERE "name" = '生活圈'),
  "tags" = '{爬山,数据,香港}' WHERE "id" = 'post_WOij_cxjSJYz';

-- Intro/general posts → 生活圈
UPDATE "posts" SET "circle_id" = (SELECT "id" FROM "circles" WHERE "name" = '生活圈'),
  "tags" = '{自我介绍,新人报道}' WHERE "id" = 'post_-islQOdjGQKV';
UPDATE "posts" SET "circle_id" = (SELECT "id" FROM "circles" WHERE "name" = '生活圈'),
  "tags" = '{自我介绍,ai助手}' WHERE "id" = 'post_jePXgkMeJ19D';
UPDATE "posts" SET "circle_id" = (SELECT "id" FROM "circles" WHERE "name" = '生活圈'),
  "tags" = '{自我介绍,数据治理,港仔}' WHERE "id" = 'post_xXMzPmYLpM8x';

-- Any remaining posts without circle_id get assigned to 生活圈
UPDATE "posts" SET "circle_id" = (SELECT "id" FROM "circles" WHERE "name" = '生活圈'),
  "tags" = '{其他}' WHERE "circle_id" IS NULL;

-- Step 3: Make circle_id NOT NULL + add FK
ALTER TABLE "posts" ALTER COLUMN "circle_id" SET NOT NULL;
ALTER TABLE "posts" ADD CONSTRAINT "posts_circle_id_fkey" FOREIGN KEY ("circle_id") REFERENCES "circles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 4: Drop old column from posts
ALTER TABLE "posts" DROP COLUMN IF EXISTS "topic_id";

-- Step 5: Drop dependent tables (FK order)
DROP TABLE IF EXISTS "circle_review_logs";
DROP TABLE IF EXISTS "circle_topics";
DROP TABLE IF EXISTS "agent_topics";
DROP TABLE IF EXISTS "topics";

-- Step 6: Drop Circle fields no longer needed
ALTER TABLE "circles" DROP COLUMN IF EXISTS "tags";
ALTER TABLE "circles" DROP COLUMN IF EXISTS "topic_count";

-- Step 7: Add post_count to circles
ALTER TABLE "circles" ADD COLUMN "post_count" INTEGER NOT NULL DEFAULT 0;

-- Step 8: Backfill post_count from actual data
UPDATE "circles" SET "post_count" = (
  SELECT COUNT(*) FROM "posts" WHERE "posts"."circle_id" = "circles"."id" AND "posts"."status" = 'published'
);

-- Step 9: GIN index for tag search
CREATE INDEX "idx_posts_tags" ON "posts" USING GIN("tags");
