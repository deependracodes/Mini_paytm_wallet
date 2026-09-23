import { SagaContext } from "../types/saga-context.js";
import { SagaStep } from "../types/saga-step.js";
import { TransactionService } from "../../mini_paytm/services/transaction.service.js";

// Forward action
//1. Check if transaction already exits by idempontency key
//2. If yes , put it into context and return
//3. If no, create a new PENDING transaction

// Compensation
//1. No direct undo
//2. The orchestractor can mark failed (so we can audit or retry logic)

export class CreateTransactionStep implements SagaStep {
  private transactionService: TransactionService;

  constructor() {
    this.transactionService = new TransactionService();
  }

  getName(): string {
    return "CreateTransactionStep";
  }

  async execute(context: SagaContext): Promise<SagaContext> {
    const existing =
      await this.transactionService.getTransactionByIdempotencyKey(
        context.idempotencyKey,
        context.fromUser,
      );

    if (existing) {
      context.transaction = existing;
      return context;
    }

    const transaction = await this.transactionService.createTransaction(
      context.fromUser,
      context.toUser,
      context.amount,
      context.idempotencyKey,
    );

    context.transaction = transaction;
    return context;
  }

  async compensate(_context: SagaContext): Promise<void> {
    // no compensation need for creating a transaction
    // Transaction can be marked as failed by orchestrator
  }
}
