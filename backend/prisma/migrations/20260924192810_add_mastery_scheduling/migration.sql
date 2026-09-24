-- AlterTable
ALTER TABLE `mastery` ADD COLUMN `nextReviewAt` DATETIME(3) NULL,
    ADD COLUMN `reviewInterval` INTEGER NOT NULL DEFAULT 0;
