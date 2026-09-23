import { IdempotencyKeyManager } from "../utils/idempotency.js";
import { Request, Response, NextFunction } from "express";

export function idempotencyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const idempotencyKey =
    (req.headers["idempotency-key"] as string) || req.body["idempotency-key"];

  if (!idempotencyKey) {
    const newKey = IdempotencyKeyManager.generateKey();

    req.headers["idempotency-key"] = newKey;
    req.body["idempotency-key"] = newKey;
  } else if (!IdempotencyKeyManager.validateKey(idempotencyKey)) {
    res.status(400).json({
      error: "Invalid Idempotency key",
    });
  }

  // downstreams handlers can have it
  (req as any).idempotencyKey =
    (req.headers["idempotency-key"] as string) || req.body["idempotency-key"];

  next();
}
