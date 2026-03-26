-- AlterTable
ALTER TABLE "agents" ADD COLUMN     "last_listen_at" TIMESTAMP(3),
ADD COLUMN     "webhook_token" TEXT,
ADD COLUMN     "webhook_url" TEXT;
