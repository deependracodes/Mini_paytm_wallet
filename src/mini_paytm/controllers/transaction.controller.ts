import { Request, Response } from "express";
import { TransactionService } from "../services/transaction.service.js";
import { SagaOrchestractor } from "../../saga-orchestrator/services/saga-orchestrator.js";
import {
  TransferDTO,
  TransactionResponseDTO,
} from "../../shared/dtos/transaction-dto.js";

// Responsibilities:
// 1. Extract data from request
// 2. Validate data
// 3. Convert to bigint safely
// 4. Call SagaOrchestrator for execution / TransactionService for reads
// 5. Convert domain object into JSON response DTO
// 6. Return correct status code

function tryParseBigIntSegment(raw: string | undefined): { ok: true; value: bigint } | { ok: false } {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: false };
  }
  try {
    return { ok: true, value: BigInt(raw) };
  } catch {
    return { ok: false };
  }
}

export class TransactionController {
  private transactionService: TransactionService;
  private sagaOrchestrator: SagaOrchestractor;

  constructor() {
    this.transactionService = new TransactionService();
    this.sagaOrchestrator = new SagaOrchestractor();
  }

  // POST /api/transactions/transfer
  async transfer(req: Request, res: Response): Promise<void> {
    try {
      const dto: TransferDTO = req.body;
      const rawFromUser = (dto as { fromUser?: unknown }).fromUser;
      const rawToUser = (dto as { toUser?: unknown }).toUser;
      const rawAmount = (dto as { amount?: unknown }).amount;
      const idempotencyKey = (dto as { idempotencyKey?: unknown }).idempotencyKey;

      if (rawFromUser === undefined || rawFromUser === null || rawFromUser === "") {
        res.status(400).json({ error: "fromUser is required" });
        return;
      }

      if (rawToUser === undefined || rawToUser === null || rawToUser === "") {
        res.status(400).json({ error: "toUser is required" });
        return;
      }

      if (rawAmount === undefined || rawAmount === null || rawAmount === "") {
        res.status(400).json({ error: "amount is required" });
        return;
      }

      if (!idempotencyKey || typeof idempotencyKey !== "string" || idempotencyKey.trim() === "") {
        res.status(400).json({ error: "idempotencyKey is required" });
        return;
      }

      let fromUser: bigint;
      let toUser: bigint;
      let amount: bigint;

      try {
        fromUser = BigInt(rawFromUser as string | number | bigint);
      } catch {
        res.status(400).json({ error: "Invalid fromUser format" });
        return;
      }

      try {
        toUser = BigInt(rawToUser as string | number | bigint);
      } catch {
        res.status(400).json({ error: "Invalid toUser format" });
        return;
      }

      try {
        amount = BigInt(rawAmount as string | number | bigint);
      } catch {
        res.status(400).json({ error: "Invalid amount format" });
        return;
      }

      if (amount <= 0n) {
        res.status(400).json({ error: "Amount should be positive" });
        return;
      }

      if (fromUser === toUser) {
        res.status(400).json({ error: "Cannot transfer to self" });
        return;
      }

      const tx = await this.sagaOrchestrator.transfer(
        fromUser,
        toUser,
        amount,
        idempotencyKey
      );

      const response: TransactionResponseDTO = {
        id: tx.id.toString(),
        from_user: tx.from_user.toString(),
        to_user: tx.to_user.toString(),
        amount: tx.amount.toString(),
        status: tx.status,
        idempotency_key: tx.idempotency_key,
        created_at: tx.created_at.toISOString(),
      };

      res.status(200).json(response);
    } catch (error: any) {
      const msg = error?.message || "Internal Server Error";

      if (
        msg.includes("Amount should be positive") ||
        msg.includes("Cannot transfer to self")
      ) {
        res.status(400).json({ error: msg });
        return;
      }

      if (msg.includes("Transaction failed previoulsy")) {
        res.status(422).json({ error: msg });
        return;
      }

      res.status(500).json({ error: msg });
    }
  }

  // GET /api/transactions/history/:userId
  async getHistory(req: Request, res: Response): Promise<void> {
    const parsed = tryParseBigIntSegment(req.params.userId);

    if (!parsed.ok) {
      res.status(400).json({ error: "Invalid userId format" });
      return;
    }

    try {
      const transactions = await this.transactionService.getHistory(parsed.value);

      const response: TransactionResponseDTO[] = transactions.map((tx) => ({
        id: tx.id.toString(),
        from_user: tx.from_user.toString(),
        to_user: tx.to_user.toString(),
        amount: tx.amount.toString(),
        status: tx.status,
        idempotency_key: tx.idempotency_key,
        created_at: tx.created_at.toISOString(),
      }));

      res.status(200).json(response);
    } catch (error: any) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  // GET /api/transactions/idempotency/:key?fromUser=123
  async getByIdempotencyKey(req: Request, res: Response): Promise<void> {
    const idempotencyKey = req.params.key;
    const rawFromUser = req.query.fromUser as string | undefined;

    if (!idempotencyKey) {
      res.status(400).json({ error: "idempotencyKey path parameter is required" });
      return;
    }

    const parsedFromUser = tryParseBigIntSegment(rawFromUser);

    if (!parsedFromUser.ok) {
      res.status(400).json({ error: "Valid 'fromUser' query parameter is required for shard routing" });
      return;
    }

    try {
      const tx = await this.transactionService.getTransactionByIdempotencyKey(
        idempotencyKey,
        parsedFromUser.value
      );

      if (!tx) {
        res.status(404).json({ error: "Transaction not found" });
        return;
      }

      const response: TransactionResponseDTO = {
        id: tx.id.toString(),
        from_user: tx.from_user.toString(),
        to_user: tx.to_user.toString(),
        amount: tx.amount.toString(),
        status: tx.status,
        idempotency_key: tx.idempotency_key,
        created_at: tx.created_at.toISOString(),
      };

      res.status(200).json(response);
    } catch (error: any) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  // GET /api/transactions/:transactionId?fromUser=123
  async getTransaction(req: Request, res: Response): Promise<void> {
    const parsedTxId = tryParseBigIntSegment(req.params.transactionId);
    const rawFromUser = req.query.fromUser as string | undefined;

    if (!parsedTxId.ok) {
      res.status(400).json({ error: "Invalid transactionId format" });
      return;
    }

    const parsedFromUser = tryParseBigIntSegment(rawFromUser);

    if (!parsedFromUser.ok) {
      res.status(400).json({ error: "Valid 'fromUser' query parameter is required for shard routing" });
      return;
    }

    try {
      const tx = await this.transactionService.getTransactiony(
        parsedTxId.value,
        parsedFromUser.value
      );

      if (!tx) {
        res.status(404).json({ error: "Transaction not found" });
        return;
      }

      const response: TransactionResponseDTO = {
        id: tx.id.toString(),
        from_user: tx.from_user.toString(),
        to_user: tx.to_user.toString(),
        amount: tx.amount.toString(),
        status: tx.status,
        idempotency_key: tx.idempotency_key,
        created_at: tx.created_at.toISOString(),
      };

      res.status(200).json(response);
    } catch (error: any) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
}