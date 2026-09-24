-- AlterTable
ALTER TABLE `attempt` ADD COLUMN `aiConfidence` DOUBLE NULL,
    ADD COLUMN `aiRationale` TEXT NULL,
    ADD COLUMN `aiResult` VARCHAR(191) NULL,
    ADD COLUMN `overriddenAt` DATETIME(3) NULL,
    ADD COLUMN `overrideReason` TEXT NULL,
    ADD COLUMN `userOverride` VARCHAR(191) NULL;
