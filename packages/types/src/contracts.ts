/**
 * Contract definitions for MFE inter-communication validation.
 *
 * MFEs declare which events they emit/consume and which shared state
 * keys they read/write. The validator checks compatibility across
 * all MFEs in the same app before deploy.
 */

export interface ContractSchema {
  type: "string" | "number" | "boolean" | "object" | "array" | "any";
  properties?: Record<string, ContractSchema>;
  required?: string[];
  items?: ContractSchema;
}

export interface EventContract {
  schema?: ContractSchema;
  description?: string;
}

export interface SharedStateContract {
  access: "read" | "write" | "readwrite";
  schema?: ContractSchema;
  description?: string;
}

export interface MFEContracts {
  emits?: Record<string, EventContract>;
  consumes?: Record<string, EventContract>;
  sharedState?: Record<string, SharedStateContract>;
}

export type ContractSeverity = "error" | "warning";

export interface ContractViolation {
  severity: ContractSeverity;
  code: string;
  message: string;
  producer?: string;
  consumer?: string;
  event?: string;
  stateKey?: string;
}

export interface ContractReport {
  valid: boolean;
  violations: ContractViolation[];
  summary: {
    events: { emitted: number; consumed: number };
    sharedState: { keys: number };
    errors: number;
    warnings: number;
  };
}
