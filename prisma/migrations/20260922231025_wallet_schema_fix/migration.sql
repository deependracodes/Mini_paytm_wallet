/*
  Warnings:

  - You are about to drop the column `updated_id` on the `wallets` table. All the data in the column will be lost.
  - Added the required column `updated_at` to the `wallets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `wallets` DROP COLUMN `updated_id`,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL;
