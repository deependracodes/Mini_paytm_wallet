import { PrismaClient, Prisma } from "../../generated/prisma/client.js";
import { Ledger, LedgerType } from "../../shared/types/shared-types.js";

export class LedgerRepository {
  private mapToLedger(ledgerEntity: {
    id: bigint;
    user_id: bigint;
    transaction_id: bigint;
    amount: bigint;
    type: string | LedgerType;
    created_at: Date;
  }): Ledger {
    return {
      id: BigInt(ledgerEntity.id.toString()),
      user_id: BigInt(ledgerEntity.user_id.toString()),
      transaction_id: BigInt(ledgerEntity.transaction_id.toString()),
      amount: BigInt(ledgerEntity.amount.toString()),
      type: ledgerEntity.type as LedgerType,
      created_at: new Date(ledgerEntity.created_at),
    };
  }

  async create(
    userId: bigint,
    transactionId: bigint,
    amount: bigint,
    type: LedgerType,
    tx: Prisma.TransactionClient,
  ): Promise<Ledger> {
    const ledgerEntity = await tx.ledger.create({
      data: {
        user_id: userId,
        transaction_id: transactionId,
        amount: amount,
        type: type === LedgerType.DEBIT ? "DEBIT" : "CREDIT",
      },
    });

    return this.mapToLedger(ledgerEntity);
  }

  async findById(
    ledgerId: bigint,
    tx: PrismaClient | Prisma.TransactionClient,
  ): Promise<Ledger | null> {
    const ledgerEntity = await tx.ledger.findUnique({
      where: {
        id: ledgerId,
      },
    });

    return ledgerEntity ? this.mapToLedger(ledgerEntity) : null;
  }


  async findByUserId(
    userId: bigint,
    tx: PrismaClient | Prisma.TransactionClient,
  ): Promise<Ledger[]> {
    const ledgerEntities = await tx.ledger.findMany({
      where: {
        user_id: userId,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return ledgerEntities.map((ledgerEntity) => this.mapToLedger(ledgerEntity));
  }
  
}

