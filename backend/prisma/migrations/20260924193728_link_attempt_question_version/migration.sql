/*
  Warnings:

  - Added the required column `questionVersionId` to the `Attempt` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `attempt` ADD COLUMN `questionVersionId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `Attempt` ADD CONSTRAINT `Attempt_questionVersionId_fkey` FOREIGN KEY (`questionVersionId`) REFERENCES `QuestionVersion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
