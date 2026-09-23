import { TransactionStatus } from "../types/shared-types.js";

export interface TransferDTO {
  fromUser: string | number | bigint;
  toUser: string | number | bigint;
  amount: string | number | bigint;
  idempotencyKey: string;
}

export interface TransactionResponseDTO {
  id: string;
  from_user: string;
  to_user: string;
  amount: string;
  status: TransactionStatus;
  idempotency_key: string;
  created_at: string;
}