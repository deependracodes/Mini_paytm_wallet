-- CreateTable
CREATE TABLE `wallets` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `balance` BIGINT NOT NULL DEFAULT 0,
    `version` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_id` DATETIME(3) NOT NULL,

    UNIQUE INDEX `wallets_user_id_key`(`user_id`),
    INDEX `idx_user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `from_user` BIGINT NOT NULL,
    `to_user` BIGINT NOT NULL,
    `amount` BIGINT NOT NULL,
    `status` ENUM('PENDING', 'DEBITED', 'CREDITED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `idempotency_key` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `transactions_idempotency_key_key`(`idempotency_key`),
    INDEX `idx_from_user`(`from_user`),
    INDEX `idx_to_user`(`to_user`),
    INDEX `idx:status`(`status`),
    INDEX `idx_idempotency_key`(`idempotency_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ledgers` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `transaction_id` BIGINT NOT NULL,
    `amount` BIGINT NOT NULL,
    `type` ENUM('DEBIT', 'CREDIT') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_user_id`(`user_id`),
    INDEX `idx_transaction_id`(`transaction_id`),
    INDEX `idx:created_at`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
