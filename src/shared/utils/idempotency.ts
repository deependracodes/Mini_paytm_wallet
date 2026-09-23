import { v4 as uuid4 } from "uuid";
/*

Generate and validate idempotency keys for API requests. 
Idempotency keys are used to ensure that a request is processed only once, even if it is sent multiple times. 
This utility provides functions to generate unique idempotency keys and validate them against a set of previously used keys.

*/

export class IdempotencyKeyManager {
  private static readonly UUID_V4_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  static generateKey(): string {
    return uuid4();
  }

  static validateKey(key: string): boolean {
    // regex match uuid4
    if (!key || typeof key !== "string") {
      return false;
    }
    return this.UUID_V4_REGEX.test(key);
  }
}
