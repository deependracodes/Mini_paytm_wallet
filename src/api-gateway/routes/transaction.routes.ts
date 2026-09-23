import { Router } from "express";
import { TransactionController } from "../../mini_paytm/controllers/transaction.controller.js";
import { idempotencyMiddleware } from "../../shared/middleware/idempotency.middleware.js";

const transactionRouter = Router();
const transactionController = new TransactionController();

// Write/Mutation operation (Orchestrated Saga Transfer)
transactionRouter.post(
  "/transfer",
  idempotencyMiddleware,
  transactionController.transfer.bind(transactionController)
);

// Read Operations
transactionRouter.get(
  "/history/:userId",
  transactionController.getHistory.bind(transactionController)
);

transactionRouter.get(
  "/idempotency/:key",
  transactionController.getByIdempotencyKey.bind(transactionController)
);

transactionRouter.get(
  "/:transactionId",
  transactionController.getTransaction.bind(transactionController)
);

export default transactionRouter;