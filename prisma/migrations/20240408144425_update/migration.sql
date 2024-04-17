/*
  Warnings:

  - You are about to drop the column `user_id` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `user_status_description` on the `user_statuses` table. All the data in the column will be lost.
  - You are about to drop the column `user_status_name` on the `user_statuses` table. All the data in the column will be lost.
  - Added the required column `userId` to the `posts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userStatusDescription` to the `user_statuses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userStatusName` to the `user_statuses` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `posts` DROP FOREIGN KEY `posts_user_id_fkey`;

-- AlterTable
ALTER TABLE `posts` DROP COLUMN `user_id`,
    ADD COLUMN `userId` INTEGER UNSIGNED NOT NULL;

-- AlterTable
ALTER TABLE `user_statuses` DROP COLUMN `user_status_description`,
    DROP COLUMN `user_status_name`,
    ADD COLUMN `userStatusDescription` TEXT NOT NULL,
    ADD COLUMN `userStatusName` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `posts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
