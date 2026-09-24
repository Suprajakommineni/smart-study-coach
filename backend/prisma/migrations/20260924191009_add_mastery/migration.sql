-- CreateTable
CREATE TABLE `Mastery` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `conceptId` INTEGER NOT NULL,
    `score` DOUBLE NOT NULL DEFAULT 0,
    `bucket` VARCHAR(191) NOT NULL DEFAULT 'New',
    `lastStudiedAt` DATETIME(3) NULL,
    `correctStreak` INTEGER NOT NULL DEFAULT 0,
    `incorrectStreak` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Mastery_conceptId_key`(`conceptId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Mastery` ADD CONSTRAINT `Mastery_conceptId_fkey` FOREIGN KEY (`conceptId`) REFERENCES `Concept`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
