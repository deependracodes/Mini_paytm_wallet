// Saga step is basically a contract that every saga step must follow so the orchestrator can run
// steps in consistent manner

import { SagaContext } from "./saga-context.js";

// Basic interface for all saga steps
// steps are executed sequentially by orchestrator and if a step fails compensate() steps in reverse order

// - execute() - forward logic (what to do)
// - compensate() - rollback logic (what to do when something goes wrong)

export interface SagaStep {
  execute(context: SagaContext): Promise<SagaContext>;

  compensate(context: SagaContext): Promise<void>;

  // get step name for logs/debug
  getName(): string;
}
