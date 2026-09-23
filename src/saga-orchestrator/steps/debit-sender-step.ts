import { SagaContext } from "../types/saga-context.js";
import { SagaStep } from "../types/saga-step.js";
import { WalletService } from "../../mini_paytm/services/wallet.service.js";
import { ConnectionManager } from "../../shared/database/connection-manager.js";

// Forward action
//1. Start a transaction on sender shard
//2. Locker sender wallet
//3. Debit amount
//4. Write ledger
//5. Mark context.debitCommited = true

// Failure
// If insuffiencient balance , throw error

// Compensation
//1. If debit comitted , credit sender back
//2. If debit committed , no compensate

export class DebitSenderStep implements SagaStep {
  private walletService: WalletService;

  constructor() {
    this.walletService = new WalletService();
  }

  getName(): string {
    return "DebitSenderStep";
  }

  async execute(context: SagaContext): Promise<SagaContext> {
    if (!context.transaction) {
      throw new Error("Transaction not found");
    }

    await ConnectionManager.executeTransaction(
      context.fromShardId,
      async (tx) => {
        const debitWallet = await this.walletService.debit(
          context.fromUser,
          context.amount,
          context.transaction!.id,
          tx,
        );

        if (!debitWallet) {
          throw new Error(
            "Insuffient balance or concurrent modification detected",
          );
        }
      },
    );

    context.debitCommited = true;
    return context;
  }

  
  async compensate(context: SagaContext): Promise<void> {
    if (!context.transaction) {
      return;
    }

    // check if debit was commited or not
    // fromQueryRunner is treated as a live db transaction client
    // If the debit ran transacton and it has not commited yet , you don't credit back manualy
    // you $rollback() so debit never becomes durabe
    // then clean fromQueryRunner so noting tries to use it again
    if (!context.fromQueryRunner) {
      await (context.fromQueryRunner as any).$rollback();
      context.fromQueryRunner = undefined;
      return;
    }

    if (context.debitCommited) {
      await ConnectionManager.executeTransaction(
        context.fromShardId,
        async (tx) => {
          await this.walletService.credit(
            context.fromUser,
            context.amount,
            context.transaction!.id,
            tx,
          );
        },
      );
    }
  }
}
