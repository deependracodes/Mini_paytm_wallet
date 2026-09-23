import { Transaction,ShardId} from "../../shared/types/shared-types.js"

// Currently this is a placeholder, later it would be Prisma.TransactionClient
type PrismaTransactionClient = any;

export interface SagaContext {
    transaction ? :Transaction;
    fromShardId : ShardId;
    toShardId : ShardId;
    fromUser : bigint;
    toUser : bigint;
    amount : bigint;
    idempotencyKey : string;
    // Prisma transactions are handled internally via executeTransaction
    // These fields are kept for compatibility but not actively used in prisma implementation
    fromQueryRunner ? : PrismaTransactionClient;
    toQueryRunner ? : PrismaTransactionClient;
    debitCommited ? : boolean; // record debit step actually committed
    creditCommited  ? : boolean; // record credit step actually committed
    [key:string]:any // additional fields that can be added to context as needed
}