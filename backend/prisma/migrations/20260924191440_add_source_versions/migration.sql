-- CreateTable
CREATE TABLE `SourceVersion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sourceId` INTEGER NOT NULL,
    `version` INTEGER NOT NULL,
    `text` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SourceVersion_sourceId_version_key`(`sourceId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SourceVersion` ADD CONSTRAINT `SourceVersion_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `Source`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
