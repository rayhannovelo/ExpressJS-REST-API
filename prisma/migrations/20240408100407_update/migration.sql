/*
  Warnings:

  - You are about to drop the `userroles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `userstatuses` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `posts` DROP FOREIGN KEY `Posts_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `users` DROP FOREIGN KEY `Users_user_role_id_fkey`;

-- DropForeignKey
ALTER TABLE `users` DROP FOREIGN KEY `Users_user_status_id_fkey`;

-- DropTable
DROP TABLE `userroles`;

-- DropTable
DROP TABLE `userstatuses`;

-- CreateTable
CREATE TABLE `user_roles` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_role_name` VARCHAR(191) NOT NULL,
    `user_role_description` TEXT NOT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_statuses` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_status_name` VARCHAR(191) NOT NULL,
    `user_status_description` TEXT NOT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_user_role_id_fkey` FOREIGN KEY (`user_role_id`) REFERENCES `user_roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_user_status_id_fkey` FOREIGN KEY (`user_status_id`) REFERENCES `user_statuses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `posts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
