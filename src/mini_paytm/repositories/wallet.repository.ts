import { PrismaClient, Prisma } from "../../generated/prisma/client.js";
import { Wallet } from "../../shared/types/shared-types.js";

// Handles all wallet-related database operations using Prisma client
// Row locking is implemented using Prisma raw queries inside a transaction
// Optimistic locking is implemented using the version column in the wallets table
export class WalletRepository {
  private mapToWallet(walletEntity: Wallet): Wallet {
    return {
      id: BigInt(walletEntity.id.toString()),
      user_id: BigInt(walletEntity.user_id.toString()),
      balance: BigInt(walletEntity.balance.toString()),
      version: Number(walletEntity.version),
      created_at: new Date(walletEntity.created_at),
      updated_at: new Date(walletEntity.updated_at),
    };
  }

  async create(userId: bigint, tx: Prisma.TransactionClient): Promise<Wallet> {
    const walletEntity = await tx.wallet.create({
      data: {
        user_id: userId,
        balance: 0n,
        version: 1,
      },
    });
    return this.mapToWallet(walletEntity);
  }

  async findById(
    walletId: bigint,
    tx: PrismaClient | Prisma.TransactionClient,
  ): Promise<Wallet | null> {
    const walletEntity = await tx.wallet.findUnique({
      where: {
        id: walletId,
      },
    });

    return walletEntity ? this.mapToWallet(walletEntity) : null;
  }

  async findByUserId(
    userId: bigint,
    tx: PrismaClient | Prisma.TransactionClient,
  ): Promise<Wallet | null> {
    const walletEntity = await tx.wallet.findUnique({
      where: {
        user_id: userId,
      },
    });

    return walletEntity ? this.mapToWallet(walletEntity) : null;
  }

  // Find wallet by user id and lock the row for update using raw query inside transaction
  async findByUserIdWithLock(
    userId: bigint,
    tx: Prisma.TransactionClient,
  ): Promise<Wallet | null> {
    const walletEntities = await tx.$queryRaw<
      Array<{
        id: bigint;
        user_id: bigint;
        balance: bigint;
        version: number;
        created_at: Date;
        updated_at: Date;
      }>
    >`SELECT id, user_id, balance, version, created_at, updated_at FROM wallets WHERE user_id = ${userId} FOR UPDATE`;

    if (!walletEntities || walletEntities.length === 0) {
      return null;
    }

    return this.mapToWallet(walletEntities[0]);
  }

  // Update the wallet balance and increment the version using optimistic locking 
  async updateBalance(
    walletId: bigint,
    newBalance: bigint,
    expectedVersion: number,
    tx: Prisma.TransactionClient,
  ): Promise<Wallet | null> {
    const updatedResult = await tx.wallet.updateMany({
      where: {
        id: walletId,
        version: expectedVersion,
      },
      data: {
        balance: newBalance,
        version: expectedVersion + 1,
      },
    });

    // No rows updated: version mismatch or record does not exist
    if (updatedResult.count === 0) {
      return null;
    }

    // findById already returns a mapped Wallet object
    return await this.findById(walletId, tx);
  }

  // Debit or credit wallet balance using pessimistic row lock + optimistic version check
  async debitOrCreditWallet(
    userId: bigint,
    amount: bigint,
    tx: Prisma.TransactionClient,
    type: "debit" | "credit",
  ): Promise<Wallet | null> {
    const wallet = await this.findByUserIdWithLock(userId, tx);

    if (!wallet) {
      return null;
    }

    if (type === "debit" && wallet.balance < amount) {
      return null; // Insufficient balance
    }

    const newBalance =
      type === "debit" ? wallet.balance - amount : wallet.balance + amount;

    return await this.updateBalance(wallet.id, newBalance, wallet.version, tx);
  }
}