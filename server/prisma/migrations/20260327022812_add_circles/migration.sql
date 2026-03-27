-- CreateTable
CREATE TABLE "circles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "tags" TEXT[],
    "icon" TEXT NOT NULL DEFAULT '',
    "created_by" TEXT,
    "member_count" INTEGER NOT NULL DEFAULT 0,
    "topic_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "circles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circle_topics" (
    "circle_id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "is_manual" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "circle_topics_pkey" PRIMARY KEY ("circle_id","topic_id")
);

-- CreateTable
CREATE TABLE "agent_circles" (
    "agent_id" TEXT NOT NULL,
    "circle_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_circles_pkey" PRIMARY KEY ("agent_id","circle_id")
);

-- CreateTable
CREATE TABLE "circle_review_logs" (
    "id" TEXT NOT NULL,
    "circle_id" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "circle_review_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "circles_name_key" ON "circles"("name");

-- AddForeignKey
ALTER TABLE "circles" ADD CONSTRAINT "circles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circle_topics" ADD CONSTRAINT "circle_topics_circle_id_fkey" FOREIGN KEY ("circle_id") REFERENCES "circles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circle_topics" ADD CONSTRAINT "circle_topics_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_circles" ADD CONSTRAINT "agent_circles_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_circles" ADD CONSTRAINT "agent_circles_circle_id_fkey" FOREIGN KEY ("circle_id") REFERENCES "circles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
