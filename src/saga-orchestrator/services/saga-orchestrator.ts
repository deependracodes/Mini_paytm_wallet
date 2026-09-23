import { TransactionService } from "../../mini_paytm/services/transaction.service.js";
import { ShardResolver } from "../../shared/database/shard-resolver.js";
import { TransactionStatus } from "../../shared/types/shared-types.js";
import { CreateTransactionStep } from "../steps/create-transaction-step.js";
import { CreditReceiverStep } from "../steps/credit-receiver-step.js";
import { DebitSenderStep } from "../steps/debit-sender-step.js";
import {
  UpdateStatusCreditedStep,
  UpdateStatusDebitedStep,
} from "../steps/update-status-step.js";
import { SagaContext } from "../types/saga-context.js";
import { SagaStep } from "../types/saga-step.js";

export class SagaOrchestractor {
  private transactionService: TransactionService;
  private setps: SagaStep[];

  constructor() {
    this.transactionService = new TransactionService();
    this.setps = [
      new CreateTransactionStep(),
      new DebitSenderStep(),
      new UpdateStatusDebitedStep(),
      new CreditReceiverStep(),
      new UpdateStatusCreditedStep(),
    ];
  }

  // Execute the transfer saga
  // this orchestrate the saga by executing steps sequentially
  // if any step fails , compemstat steps

  async transfer(
    fromUser: bigint,
    toUser: bigint,
    amount: bigint,
    idempotencyKey: string,
  ): Promise<any> {
    if (amount <= 0) throw new Error("Amount should be positive");

    if (fromUser === toUser) throw new Error("Cannot transfer to self");

    const fromShardId = ShardResolver.getShardId(fromUser);
    const toShardId = ShardResolver.getShardId(toUser);

    const context: SagaContext = {
      fromUser,
      toUser,
      amount,
      idempotencyKey,
      fromShardId,
      toShardId,
    };

    const completedSteps: SagaStep[] = [];

    let currStepIdx = -1;

    try {
      for (let i = 0; i < this.setps.length; i++) {
        const step = this.setps[i];

        currStepIdx = i;

        console.log(
          `Executing step ${i + 1}/${this.setps.length} on shard ${context.fromShardId}`,
        );

        if (context.transaction) {
          const status = context.transaction.status;

          if (status === TransactionStatus.CREDITED) return context.transaction;

          if (status === TransactionStatus.FAILED)
            throw new Error("Transaction failed previoulsy");

          if (status === TransactionStatus.DEBITED) {
            if (i < 3) continue;
          }
        }

        const updatedContext = await step.execute(context);

        Object.assign(context, updatedContext);

        completedSteps.push(step);
      }

      if (context.transaction) {
        throw new Error("Transaction not found after saga execution");
      }

      return context.transaction;
    } catch (error) {
      console.error(`Saga failed at step ${currStepIdx + 1} :`, error);

      await this.compensate(completedSteps, context);

      if (context.transaction) {
        try {
          await this.transactionService.updateStatus(
            context.transaction.id,
            TransactionStatus.FAILED,
            fromUser,
          );
        } catch (updateError) {
          console.log(
            updateError,
            "Failed to update transaction status to failed",
          );
        }
      }
      throw error;
    }
  }

  private async compensate(
    completedSteps: SagaStep[],
    context: SagaContext,
  ): Promise<void> {
    for (let i = completedSteps.length - 1; i >= 0; i--) {
      const step = this.setps[i];

      try {
        console.log(`compenstating step ${step.getName()} `);

        await step.compensate(context);
      } catch (error) {
        console.log(`Failed to compenstate stpe ${step.getName()} : `, error);

        if (step.getName() === "DebitSenderStep") {
          console.log(
            "CRITICAL : Failed to compensate debit - manual intervention required",
          );
        }
      }
    }
  }


  
}
