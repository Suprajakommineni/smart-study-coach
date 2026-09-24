-- AlterTable
ALTER TABLE `attempt` ADD COLUMN `aiRunId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Attempt` ADD CONSTRAINT `Attempt_aiRunId_fkey` FOREIGN KEY (`aiRunId`) REFERENCES `AiRun`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
