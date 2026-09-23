import { TransactionRepository } from "../repositories/transaction.repository.js";
import {
  Transaction,
  TransactionStatus,
  ShardId,
} from "../../shared/types/shared-types.js";

import { ConnectionManager } from "../../shared/database/connection-manager.js";
import { ShardResolver } from "../../shared/database/shard-resolver.js";

export class TransactionService {
  private transactionRepository: TransactionRepository;

  constructor() {
    this.transactionRepository = new TransactionRepository();
  }

  // Create transaction
  // 1. Determine sender shard from fromUser
  // 2. start transaction on that shard
  // 3. Check existing transaction by idempotency key
  // 4. If found , return it
  // 5. or else create a new key

  async createTransaction(
    fromUser: bigint,
    toUser: bigint,
    amount: bigint,
    idempotencyKey: string,
  ): Promise<Transaction> {
    const shardId = ShardResolver.getShardId(fromUser);

    return await ConnectionManager.executeTransaction(shardId, async (tx) => {
      const existing = await this.transactionRepository.findByIdempotencyKey(
        idempotencyKey,
        tx,
      );
      if (existing) {
        return existing;
      }

      const newTransaction = await this.transactionRepository.create(
        fromUser,
        toUser,
        amount,
        idempotencyKey,
        tx,
      );

      return newTransaction;
    });
  }

  // update transaction status
  async updateStatus(
    transactionId: bigint,
    status: TransactionStatus,
    fromUser: bigint,
  ): Promise<Transaction> {
    const shardId = ShardResolver.getShardId(fromUser);

    return await ConnectionManager.executeTransaction(shardId, async (tx) => {
      const transaction = await this.transactionRepository.updateStatus(
        transactionId,
        status,
        tx,
      );
      if (!transaction) {
        throw new Error("Transaction not found");
      }

      return transaction;
    });
  }

  // get history
  async getHistory(userId: bigint): Promise<Transaction[]> {
    const client1 = ConnectionManager.getClient(ShardId.SHARD_1);
    const client2 = ConnectionManager.getClient(ShardId.SHARD_2);
    return this.transactionRepository.getHistory(client1, client2, userId);
  }

  // get transaction idempotency key
  async getTransactionByIdempotencyKey(
    idempotencyKey: string,
    fromUser: bigint,
  ): Promise<Transaction | null> {
    const shardId = ShardResolver.getShardId(fromUser);

    const client = ConnectionManager.getClient(shardId);
    return this.transactionRepository.findByIdempotencyKey(
      idempotencyKey,
      client,
    );
  }

   async getTransactiony(
    transactionId: bigint,
    fromUser: bigint,
  ): Promise<Transaction | null> {
    const shardId = ShardResolver.getShardId(fromUser);

    const client = ConnectionManager.getClient(shardId);
    return this.transactionRepository.findById(
      transactionId,
      client,
    );
  }
}
