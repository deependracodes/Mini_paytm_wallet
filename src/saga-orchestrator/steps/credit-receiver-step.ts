import { SagaContext } from "../types/saga-context.js";
import { SagaStep } from "../types/saga-step.js";
import { WalletService } from "../../mini_paytm/services/wallet.service.js";
import { ConnectionManager } from "../../shared/database/connection-manager.js";

// Forward action
//1. Start a transaction on reciver shard
//2. Locker revicer wallet
//3. credit amount
//4. Write ledger
//5. Mark context.creditCommited = true

// Failure
// If reciver wallet does not exits

// Compensation
//1. If credit comitted , debit reciver  back

export class CreditReceiverStep implements SagaStep {
  private walletService: WalletService;

  constructor() {
    this.walletService = new WalletService();
  }

  getName(): string {
    return "CreditReceiverStep";
  }

  async execute(context: SagaContext): Promise<SagaContext> {
    if (!context.transaction) {
      throw new Error("Transaction not found");
    }

    await ConnectionManager.executeTransaction(
      context.toShardId,
      async (tx) => {
        const creditWallet = await this.walletService.credit(
          context.toUser,
          context.amount,
          context.transaction!.id,
          tx,
        );

        if (!creditWallet) {
          throw new Error("Wallet not found");
        }
      },
    );

    context.creditCommited = true;
    return context;
  }

  async compensate(context: SagaContext): Promise<void> {
    if (!context.transaction) {
      return;
    }

    if (context.creditCommited) {
      await ConnectionManager.executeTransaction(
        context.toShardId,
        async (tx) => {
          const debitedWallet = await this.walletService.debit(
            context.toUser,
            context.amount,
            context.transaction!.id,
            tx,
          );

          if (!debitedWallet) {
            throw new Error(
              "Failed to compensate credit - manaul intervention required",
            );
          }
        },
      );
    }
  }
}
