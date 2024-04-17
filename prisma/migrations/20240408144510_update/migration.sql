/*
  Warnings:

  - You are about to drop the column `userStatusDescription` on the `user_statuses` table. All the data in the column will be lost.
  - You are about to drop the column `userStatusName` on the `user_statuses` table. All the data in the column will be lost.
  - Added the required column `user_status_description` to the `user_statuses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_status_name` to the `user_statuses` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `user_statuses` DROP COLUMN `userStatusDescription`,
    DROP COLUMN `userStatusName`,
    ADD COLUMN `user_status_description` TEXT NOT NULL,
    ADD COLUMN `user_status_name` VARCHAR(191) NOT NULL;
