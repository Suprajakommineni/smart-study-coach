/*
  Warnings:

  - You are about to drop the column `conceptId` on the `question` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `question` DROP FOREIGN KEY `Question_conceptId_fkey`;

-- AlterTable
ALTER TABLE `question` DROP COLUMN `conceptId`;

-- CreateTable
CREATE TABLE `QuestionConcept` (
    `questionId` INTEGER NOT NULL,
    `conceptId` INTEGER NOT NULL,

    PRIMARY KEY (`questionId`, `conceptId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `QuestionConcept` ADD CONSTRAINT `QuestionConcept_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuestionConcept` ADD CONSTRAINT `QuestionConcept_conceptId_fkey` FOREIGN KEY (`conceptId`) REFERENCES `Concept`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
