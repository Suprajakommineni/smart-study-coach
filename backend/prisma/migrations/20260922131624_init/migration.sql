/*
  Warnings:

  - You are about to drop the column `defintion` on the `concept` table. All the data in the column will be lost.
  - Added the required column `definition` to the `Concept` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `concept` DROP COLUMN `defintion`,
    ADD COLUMN `definition` TEXT NOT NULL;
