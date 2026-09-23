import { SagaContext } from "../types/saga-context.js";
import { SagaStep } from "../types/saga-step.js";
import { TransactionService } from "../../mini_paytm/services/transaction.service.js";
import { TransactionStatus } from "../../shared/types/shared-types.js";
// Forward action
//1. Update transaction status to DEBITED

export class UpdateStatusDebitedStep implements SagaStep {
  private transactionService: TransactionService;

  constructor() {
    this.transactionService = new TransactionService();
  }

  getName(): string {
    return "UpdateStatusDebitedStep";
  }

  async execute(context: SagaContext): Promise<SagaContext> {
    if (!context.transaction) {
      throw new Error("Transaction not found");
    }

    const updatedStatus = await this.transactionService.updateStatus(
      context.transaction.id,
      TransactionStatus.DEBITED,
      context.fromUser,
    );

    context.transaction = updatedStatus;
    return context;
  }

  async compensate(context: SagaContext): Promise<void> {
    if (!context.transaction) {
      return;
    }

    try {
      await this.transactionService.updateStatus(
        context.transaction.id,
        TransactionStatus.PENDING,
        context.fromUser,
      );
    } catch (error) {
      console.log("Failed to revert the transaction status :", error);
    }
  }
}

export class UpdateStatusCreditedStep implements SagaStep {
  private transactionService: TransactionService;

  constructor() {
    this.transactionService = new TransactionService();
  }

  getName(): string {
    return "UpdateStatusCreditedStep";
  }

  async execute(context: SagaContext): Promise<SagaContext> {
    if (!context.transaction) {
      throw new Error("Transaction not found");
    }

    const updatedStatus = await this.transactionService.updateStatus(
      context.transaction.id,
      TransactionStatus.CREDITED,
      context.fromUser,
    );

    context.transaction = updatedStatus;
    return context;
  }

  async compensate(context: SagaContext): Promise<void> {
    if (!context.transaction) {
      return;
    }

    try {
      await this.transactionService.updateStatus(
        context.transaction.id,
        TransactionStatus.DEBITED,
        context.fromUser,
      );
    } catch (error) {
      console.log("Failed to revert the transaction status 2:", error);
    }
  }
}
