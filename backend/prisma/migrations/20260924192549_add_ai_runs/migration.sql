/*
  Warnings:

  - You are about to alter the column `aiRunId` on the `concept` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.

*/
-- AlterTable
ALTER TABLE `concept` MODIFY `aiRunId` INTEGER NULL;

-- CreateTable
CREATE TABLE `AiRun` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `model` VARCHAR(191) NOT NULL,
    `promptVersion` VARCHAR(191) NOT NULL,
    `input` TEXT NOT NULL,
    `output` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Concept` ADD CONSTRAINT `Concept_aiRunId_fkey` FOREIGN KEY (`aiRunId`) REFERENCES `AiRun`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
