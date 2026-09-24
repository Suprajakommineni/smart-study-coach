/*
  Warnings:

  - Added the required column `userId` to the `StudySession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `question` ADD COLUMN `aiRunId` INTEGER NULL;

-- AlterTable
ALTER TABLE `studysession` ADD COLUMN `userId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `Question` ADD CONSTRAINT `Question_aiRunId_fkey` FOREIGN KEY (`aiRunId`) REFERENCES `AiRun`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudySession` ADD CONSTRAINT `StudySession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
