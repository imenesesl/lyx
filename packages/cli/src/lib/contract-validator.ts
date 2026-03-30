import type {
  MFEConfig,
  MFEContracts,
  ContractSchema,
  ContractViolation,
  ContractReport,
} from "@lyx/types";

interface MFEWithContracts {
  name: string;
  contracts: MFEContracts;
}

function extractContracts(configs: MFEConfig[]): MFEWithContracts[] {
  return configs
    .filter((c) => c.contracts)
    .map((c) => ({ name: c.name, contracts: c.contracts! }));
}

/**
 * Checks if a producer schema satisfies a consumer's expected schema.
 * The producer must provide at least everything the consumer expects.
 */
function isSchemaCompatible(
  producer: ContractSchema | undefined,
  consumer: ContractSchema | undefined
): string[] {
  if (!consumer) return [];
  if (!producer) return ["Producer has no schema but consumer expects one"];

  const issues: string[] = [];

  if (consumer.type !== "any" && producer.type !== "any" && producer.type !== consumer.type) {
    issues.push(`Type mismatch: producer is "${producer.type}", consumer expects "${consumer.type}"`);
    return issues;
  }

  if (consumer.type === "object" && consumer.properties) {
    const requiredFields = consumer.required ?? [];

    for (const field of requiredFields) {
      if (!producer.properties?.[field]) {
        issues.push(`Missing required field "${field}" in producer`);
      }
    }

    for (const [field, consumerFieldSchema] of Object.entries(consumer.properties)) {
      const producerFieldSchema = producer.properties?.[field];
      if (!producerFieldSchema) {
        if (requiredFields.includes(field)) {
          continue; // already reported
        }
        // optional field missing is fine
        continue;
      }
      const nested = isSchemaCompatible(producerFieldSchema, consumerFieldSchema);
      issues.push(...nested.map((i) => `${field}: ${i}`));
    }
  }

  if (consumer.type === "array" && consumer.items) {
    const nested = isSchemaCompatible(producer.items, consumer.items);
    issues.push(...nested.map((i) => `items: ${i}`));
  }

  return issues;
}

/**
 * Validate event contracts across all MFEs.
 */
function validateEvents(mfes: MFEWithContracts[]): ContractViolation[] {
  const violations: ContractViolation[] = [];

  const emitters = new Map<string, { mfe: string; schema?: ContractSchema }[]>();
  const consumers = new Map<string, { mfe: string; schema?: ContractSchema }[]>();

  for (const mfe of mfes) {
    if (mfe.contracts.emits) {
      for (const [event, contract] of Object.entries(mfe.contracts.emits)) {
        if (!emitters.has(event)) emitters.set(event, []);
        emitters.get(event)!.push({ mfe: mfe.name, schema: contract.schema });
      }
    }
    if (mfe.contracts.consumes) {
      for (const [event, contract] of Object.entries(mfe.contracts.consumes)) {
        if (!consumers.has(event)) consumers.set(event, []);
        consumers.get(event)!.push({ mfe: mfe.name, schema: contract.schema });
      }
    }
  }

  for (const [event, eventConsumers] of consumers) {
    const eventEmitters = emitters.get(event);

    if (!eventEmitters || eventEmitters.length === 0) {
      for (const c of eventConsumers) {
        violations.push({
          severity: "warning",
          code: "ORPHANED_CONSUMER",
          message: `"${c.mfe}" consumes event "${event}" but no MFE emits it`,
          consumer: c.mfe,
          event,
        });
      }
      continue;
    }

    for (const emitter of eventEmitters) {
      for (const consumer of eventConsumers) {
        if (emitter.mfe === consumer.mfe) continue;

        const issues = isSchemaCompatible(emitter.schema, consumer.schema);
        for (const issue of issues) {
          violations.push({
            severity: "error",
            code: "SCHEMA_MISMATCH",
            message: `Event "${event}": ${issue}`,
            producer: emitter.mfe,
            consumer: consumer.mfe,
            event,
          });
        }
      }
    }
  }

  for (const [event, eventEmitters] of emitters) {
    if (!consumers.has(event)) {
      for (const e of eventEmitters) {
        violations.push({
          severity: "warning",
          code: "UNUSED_EMISSION",
          message: `"${e.mfe}" emits event "${event}" but no MFE consumes it`,
          producer: e.mfe,
          event,
        });
      }
    }
  }

  return violations;
}

/**
 * Validate shared state contracts across all MFEs.
 */
function validateSharedState(mfes: MFEWithContracts[]): ContractViolation[] {
  const violations: ContractViolation[] = [];

  const stateEntries = new Map<
    string,
    { mfe: string; access: string; schema?: ContractSchema }[]
  >();

  for (const mfe of mfes) {
    if (mfe.contracts.sharedState) {
      for (const [key, contract] of Object.entries(mfe.contracts.sharedState)) {
        if (!stateEntries.has(key)) stateEntries.set(key, []);
        stateEntries.get(key)!.push({
          mfe: mfe.name,
          access: contract.access,
          schema: contract.schema,
        });
      }
    }
  }

  for (const [key, entries] of stateEntries) {
    const writers = entries.filter(
      (e) => e.access === "write" || e.access === "readwrite"
    );
    const readers = entries.filter(
      (e) => e.access === "read" || e.access === "readwrite"
    );

    if (writers.length > 1) {
      violations.push({
        severity: "warning",
        code: "MULTIPLE_WRITERS",
        message: `Shared state key "${key}" has multiple writers: ${writers.map((w) => w.mfe).join(", ")}`,
        stateKey: key,
      });
    }

    for (const writer of writers) {
      for (const reader of readers) {
        if (writer.mfe === reader.mfe) continue;

        const issues = isSchemaCompatible(writer.schema, reader.schema);
        for (const issue of issues) {
          violations.push({
            severity: "error",
            code: "STATE_SCHEMA_MISMATCH",
            message: `Shared state "${key}": ${issue}`,
            producer: writer.mfe,
            consumer: reader.mfe,
            stateKey: key,
          });
        }
      }
    }
  }

  return violations;
}

/**
 * Run contract validation across all MFE configs.
 */
export function validateContracts(configs: MFEConfig[]): ContractReport {
  const mfes = extractContracts(configs);

  if (mfes.length === 0) {
    return {
      valid: true,
      violations: [],
      summary: {
        events: { emitted: 0, consumed: 0 },
        sharedState: { keys: 0 },
        errors: 0,
        warnings: 0,
      },
    };
  }

  const eventViolations = validateEvents(mfes);
  const stateViolations = validateSharedState(mfes);
  const violations = [...eventViolations, ...stateViolations];

  let emitted = 0;
  let consumed = 0;
  const stateKeys = new Set<string>();

  for (const mfe of mfes) {
    emitted += Object.keys(mfe.contracts.emits ?? {}).length;
    consumed += Object.keys(mfe.contracts.consumes ?? {}).length;
    for (const key of Object.keys(mfe.contracts.sharedState ?? {})) {
      stateKeys.add(key);
    }
  }

  const errors = violations.filter((v) => v.severity === "error").length;
  const warnings = violations.filter((v) => v.severity === "warning").length;

  return {
    valid: errors === 0,
    violations,
    summary: {
      events: { emitted, consumed },
      sharedState: { keys: stateKeys.size },
      errors,
      warnings,
    },
  };
}
