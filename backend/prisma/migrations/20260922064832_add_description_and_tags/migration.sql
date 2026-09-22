-- AlterTable
ALTER TABLE `module` ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `tags` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `subject` ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `tags` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `workspace` ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `tags` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Workspace` ADD CONSTRAINT `Workspace_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
