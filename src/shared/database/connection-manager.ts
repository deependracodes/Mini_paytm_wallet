import { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import { ShardId } from "../types/shared-types.js";
import { getPrismaClient } from "./prisma-client.js";

export class ConnectionManager {
  // get client connection for a specific shard for non transactional queries
  static getClient(shardId: ShardId): PrismaClient {
    return getPrismaClient(shardId);
  }

  // execute a transaction on a specific shard
  static async executeTransaction<T>(
    shardId: ShardId,
    transactionFn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const client = getPrismaClient(shardId);

    // [$transaction]is used to execute a transaction with the provided transaction function and isolation level
    // The [isolation level] is set to [RepeatableRead] to ensure that the transaction sees a consistent snapshot of the database for maintaining data integrity and preventing issues like dirty reads or non-repeatable reads
    // Runs the transaction function within the context of a transaction, and [commits] or [rolls back] the transaction based on the outcome of the function
    return await client.$transaction(transactionFn, {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    });
  }
}

export const connectionManager = new ConnectionManager();
