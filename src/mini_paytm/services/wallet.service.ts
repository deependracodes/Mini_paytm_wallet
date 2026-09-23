import { WalletRepository } from "../repositories/wallet.repository.js";
import { LedgerRepository } from "../repositories/ledger.repository.js";
import { ConnectionManager } from "../../shared/database/connection-manager.js";
import { Wallet, LedgerType } from "../../shared/types/shared-types.js";
import { ShardResolver } from "../../shared/database/shard-resolver.js";

export class WalletService {
  private walletRepository: WalletRepository;
  private ledgerRepository: LedgerRepository;

  constructor() {
    this.walletRepository = new WalletRepository();
    this.ledgerRepository = new LedgerRepository();
  }

  // create a wallet for a user
  // 1. Determine the shard for the user using ShardResolver
  // 2. Check if the user already has a wallet in the shard using WalletRepository
  // 3. If the user does not have a wallet, create a new wallet in the shard using WalletRepository
  // 4. Start the transaction using the connection

  async createWalletForUser(userId: bigint): Promise<Wallet> {
    const shardId = ShardResolver.getShardId(userId);

    return await ConnectionManager.executeTransaction(shardId, async (tx) => {
      const existingWallet = await this.walletRepository.findByUserId(
        userId,
        tx,
      );

      if (existingWallet) {
        throw new Error(`Wallet already exists`);
      }

      const newWallet = await this.walletRepository.create(userId, tx);
      return newWallet;
    });
  }

  // get the wallet for a user
  async getWalletForUser(userId: bigint): Promise<Wallet | null> {
    const shardId = ShardResolver.getShardId(userId);

    const client = ConnectionManager.getClient(shardId);

    const wallet = await this.walletRepository.findByUserId(userId, client);
    return wallet;
  }

  // add money to a user's wallet
  // 1. Validate the amount to be added
  // 2. Determine the shard for the user using ShardResolver
  // 3. Start the transaction using the connection
  // 4. Lock the wallet row for the user using WalletRepository
  // 5. Update the wallet balance using WalletRepository
  // 6. Create a ledger entry for the transaction using LedgerRepository
  async addMoneyToWallet(
    userId: bigint,
    amount: bigint,
    transactionId: bigint,
  ): Promise<Wallet> {
    if (amount <= 0n) {
      throw new Error(`Amount must be greater than zero`);
    }

    const shardId = ShardResolver.getShardId(userId);

    return await ConnectionManager.executeTransaction(shardId, async (tx) => {
      // lock wallet row to prevent concurrent updates
      const wallet = await this.walletRepository.findByUserIdWithLock(
        userId,
        tx,
      );

      if (!wallet) {
        throw new Error(`Wallet not found for user`);
      }

      const newBalance = wallet.balance + amount;
      // update wallet balance using optimistic concurrency control

      const updatedWallet = await this.walletRepository.updateBalance(
        wallet.id,
        newBalance,
        wallet.version,
        tx,
      );

      if (!updatedWallet) {
        throw new Error(`Failed to update wallet balance`);
      }

      if (transactionId) {
        await this.ledgerRepository.create(
          userId,
          0n, // No transaction ID for adding money
          amount,
          LedgerType.CREDIT,
          tx,
        );
      }

      return updatedWallet;
    });
  }

  // debit money from a user's wallet
  // these methods are used by saga
  // they accept an existing transaction client to ensure that the debit operation is part of the same transaction as the transfer operation
  async debit(
    userId: bigint,
    amount: bigint,
    transactionId: bigint,
    tx: any,
  ): Promise<Wallet | null> {
    // debit with lock (tx already in transaction)

    const updatedWallet = await this.walletRepository.debitOrCreditWallet(
      userId,
      amount,
      tx,
      "debit",
    );

    if (updatedWallet) {
      await this.ledgerRepository.create(
        userId,
        transactionId,
        amount,
        LedgerType.DEBIT,
        tx,
      );
    }

    return updatedWallet;
  }

  // credit money to a user's wallet
  async credit(
    userId: bigint,
    amount: bigint,
    transactionId: bigint,
    tx: any,
  ): Promise<Wallet | null> {
   
     const wallet = await this.walletRepository.findByUserIdWithLock(userId, tx);
    if (!wallet) {
      throw new Error(`Wallet not found for user`);
    }

    const updatedWallet = await this.walletRepository.debitOrCreditWallet(
      userId,
      amount,
      tx,
      "credit",
    );

    if(!updatedWallet) {
      throw new Error(`Failed to credit wallet`);
    }

    if (transactionId) {
        await this.ledgerRepository.create(
            userId,
            transactionId,
            amount,
            LedgerType.CREDIT,
            tx,
        );
    }

    return updatedWallet;
  }
}
