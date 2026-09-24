-- CreateTable
CREATE TABLE `QuestionVersion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `questionId` INTEGER NOT NULL,
    `version` INTEGER NOT NULL,
    `text` TEXT NOT NULL,
    `answer` TEXT NOT NULL,
    `choices` TEXT NULL,
    `difficulty` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `QuestionVersion_questionId_version_key`(`questionId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `QuestionVersion` ADD CONSTRAINT `QuestionVersion_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
