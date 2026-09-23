import { PrismaClient, Prisma } from "../../generated/prisma/client.js";
import {
  TransactionStatus,
  Transaction,
} from "../../shared/types/shared-types.js";

export class TransactionRepository {
  private mapToTransaction(transactionEntity: {
    id: bigint;
    from_user: bigint;
    to_user: bigint;
    amount: bigint;
    idempotency_key: string;
    status: string | TransactionStatus;
    created_at: Date;
  }): Transaction {
    const status = transactionEntity.status as TransactionStatus;
    return {
      id: BigInt(transactionEntity.id.toString()),
      from_user: BigInt(transactionEntity.from_user.toString()),
      to_user: BigInt(transactionEntity.to_user.toString()),
      amount: BigInt(transactionEntity.amount.toString()),
      idempotency_key: transactionEntity.idempotency_key,
      status: status,
      created_at: new Date(transactionEntity.created_at),
    };
  }

  async create(
    fromUser: bigint,
    toUser: bigint,
    amount: bigint,
    idempotencyKey: string,
    tx: Prisma.TransactionClient,
  ): Promise<Transaction> {
    const transactionEntity = await tx.transaction.create({
      data: {
        from_user: fromUser,
        to_user: toUser,
        amount: amount,
        idempotency_key: idempotencyKey,
        status: TransactionStatus.PENDING,
      },
    });
    return this.mapToTransaction(transactionEntity);
  }

  async findById(
    transactionId: bigint,
    tx: PrismaClient | Prisma.TransactionClient,
  ): Promise<Transaction | null> {
    const transactionEntity = await tx.transaction.findUnique({
      where: {
        id: transactionId,
      },
    });

    return transactionEntity ? this.mapToTransaction(transactionEntity) : null;
  }

  async findByIdempotencyKey(
    idempotencyKey: string,
    tx: PrismaClient | Prisma.TransactionClient,
  ): Promise<Transaction | null> {
    const transactionEntity = await tx.transaction.findUnique({
      where: {
        idempotency_key: idempotencyKey,
      },
    });
    return transactionEntity ? this.mapToTransaction(transactionEntity) : null;
  }

  async updateStatus(
    transactionId: bigint,
    status: TransactionStatus,
    tx: PrismaClient | Prisma.TransactionClient,
  ): Promise<Transaction | null> {
    const transactionEntity = await tx.transaction.update({
      where: {
        id: transactionId,
      },
      data: {
        status: status,
      },
    });

    return transactionEntity ? this.mapToTransaction(transactionEntity) : null;
  }

  async getHistory(
    client1: PrismaClient | Prisma.TransactionClient,
    client2: PrismaClient | Prisma.TransactionClient,
    userId: bigint,
  ): Promise<Transaction[]> {
    const [transactionsFromClient1, transactionsFromClient2] =
      await Promise.all([
        client1.transaction.findMany({
          where: {
            OR: [{ from_user: userId }, { to_user: userId }],
          },
          orderBy: {
            created_at: "desc",
          },
        }),
        client2.transaction.findMany({
          where: {
            OR: [{ from_user: userId }, { to_user: userId }],
          },
          orderBy: {
            created_at: "desc",
          },
        }),
      ]);

    return [...transactionsFromClient1, ...transactionsFromClient2]
      .map((transactionEntity) => this.mapToTransaction(transactionEntity))
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }
}
