# Mini Paytm Wallet System
  - A high-concurrency, fault-tolerant digital wallet system designed with Saga Orchestration, strict double-entry ledger bookkeeping, and end-to-end idempotency guarantees.

***Funtional Requirement***

 - A user sign up
 - A user will be able create a wallet
 - A user will be able to add funds to his wallet
 - A user can transfer fund to other user's wallet


# Database Schema Design (Entities & Domain Objects)
  - User: id, name, email, created_at
  - Wallet: id, user_id, balance, currency, version (optimistic locking)
  - Transaction: id, idempotency_key, from_wallet_id, to_wallet_id, amount, status (PENDING, SUCCESS, FAILED)
  - Ledger: id, wallet_id, transaction_id, amount, type (CREDIT, DEBIT), created_at

***Non Functional Requirement***
  - Idempotency (At-Most-Once Execution)
    ex :Money safety i.e One transaction should not create mutiple debits or credits idemptency should be balanced even after retry or server creahses , each action should happen once

    * Every state-changing API call requires a unique idempotency_key.
    * State Check: Before starting execution, the system checks if the key exists in Redis or Postgres.
    * Execution & Caching: If missing, the request executes through the Orchestrator, and the final state is stored.
    * Retry Safety: Subsequent requests with the same key bypass processing and return the cached result directly, preventing duplicate debits during network retries or server crashes.
  
  - Atomicity & Double-Entry Accounting
    ex:One debit happens but not credited to wallet in this case either you retry or roolback 

    * Money cannot exist in isolation. Every transfer consists of two immutable atomic actions: a DEBIT entry for the sender and a CREDIT entry for the receiver.
    * DB-Level Isolation: Wallet balances are updated using row-level locking (SELECT FOR UPDATE) or optimistic concurrency control (version check) inside an explicit DB transaction block.

# Saga Orchestration Pattern
  - For distributed or asynchronous payment flows, the system uses an Orchestrator-based Saga to manage state transitions and coordinate compensating transactions upon failure

  * Happy Path Sequence

  - Initialize: Client sends a transfer request with idempotency_key. System writes a Transaction row in PENDING state.

  - Debit Sender Step:
    Verify sender wallet has sufficient funds (balance >= amount).
    Deduct amount from from_wallet_id.

  - Create a Ledger record (type: DEBIT, amount).
    Credit Receiver Step:
    Add amount to to_wallet_id.

  - Create a Ledger record (type: CREDIT, amount).

  - Finalize: Update Transaction state to SUCCESS. Return response to client.

  - Orchestartor saga is the brain and will the saga steps 

```
  Client        API Gate / Auth       Idempotency Engine       Saga Orchestrator          DB / Ledger
   |                  |                      |                        |                      |
   |-- Transfer ----->|                      |                        |                      |
   |   (key, params)  |-- Check / Lock ----->|                        |                      |
   |                  |   Idempotency Key    |-- Key Valid? (New) --->|                      |
   |                  |                      |                        |-- Create Transaction |
   |                  |                      |                        |   (PENDING) -------->|
   |                  |                      |                        |                      |
   |                  |                      |                        |-- Step 1: Debit ----->|
   |                  |                      |                        |   Sender + Ledger    |
   |                  |                      |                        |                      |
   |                  |                      |                        |-- Step 2: Credit ---->|
   |                  |                      |                        |   Receiver + Ledger  |
   |                  |                      |                        |                      |
   |                  |                      |                        |-- Step 3: Set Status |
   |                  |                      |                        |   SUCCESS ------------>|
   |                  |<-- Cache Result -----|<-- Return Result ------|                      |
   |<-- 200 OK -------|                      |                        |                      |
```

# Compensation & Failure Recovery

  - If Step 3 (Credit Receiver) fails due to a locked account, non-existent wallet, or system timeout, the Orchestrator executes a compensating rollback workflow:
  - Trigger Compensation: Intercept the failure at the Credit step
  - Refund Sender:
    Credit amount back to from_wallet_id.
    Create a compensating Ledger record (type: CREDIT, reason: REFUND)
  - Finalize: Mark Transaction status as FAILED
  - Persist State: Store the FAILED response under the original idempotency_key so subsequent retries return the deterministic failure result without re-executing steps.



# Problems in single db
  - reads are slow
  - storage issues
  - writes are also slow

# Sharding
   - Splitting data across multiple databases

# Here we will have 2 wallet_shard , so that when a user register we can choose which shard he will stored into  like user_id is even then wallet_shard_1 and vice-versa

# The goal is test transaction from 1 shard to other works or not
# if one shard success and other fails , then the system recoves
# here for wallet aspect - writes are heavy and should support acid properties like mysql
