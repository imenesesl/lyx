import { Command } from "commander";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type chalk from "chalk";
import type { MFEConfig, ContractReport } from "@lyx/types";
import { validateContracts } from "../lib/contract-validator";

interface MFEEntry {
  dir: string;
  config: MFEConfig;
}

function discoverMFEs(startDir: string): MFEEntry[] {
  const entries: MFEEntry[] = [];

  const mfesDir = join(startDir, "mfes");
  if (existsSync(mfesDir)) {
    for (const d of readdirSync(mfesDir, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      const configPath = join(mfesDir, d.name, "mfe.config.json");
      if (existsSync(configPath)) {
        const config = JSON.parse(readFileSync(configPath, "utf-8")) as MFEConfig;
        entries.push({ dir: join(mfesDir, d.name), config });
      }
    }
  }

  const appsDir = join(startDir, "apps");
  if (existsSync(appsDir)) {
    for (const app of readdirSync(appsDir, { withFileTypes: true })) {
      if (!app.isDirectory()) continue;
      entries.push(...discoverMFEs(join(appsDir, app.name)));
    }
  }

  return entries;
}

function printReport(report: ContractReport, chalkInstance: typeof chalk): void {
  const { summary, violations } = report;

  console.log(chalkInstance.cyan("\n  Contract Validation Report\n"));
  console.log(
    chalkInstance.gray(
      `  Events: ${summary.events.emitted} emitted, ${summary.events.consumed} consumed`
    )
  );
  console.log(chalkInstance.gray(`  Shared state keys: ${summary.sharedState.keys}`));
  console.log();

  if (violations.length === 0) {
    console.log(chalkInstance.green("  ✓ All contracts are compatible\n"));
    return;
  }

  const errors = violations.filter((v) => v.severity === "error");
  const warnings = violations.filter((v) => v.severity === "warning");

  if (errors.length > 0) {
    console.log(chalkInstance.red.bold(`  Errors (${errors.length}):\n`));
    for (const v of errors) {
      console.log(chalkInstance.red(`    ✗ [${v.code}] ${v.message}`));
      if (v.producer) console.log(chalkInstance.gray(`      producer: ${v.producer}`));
      if (v.consumer) console.log(chalkInstance.gray(`      consumer: ${v.consumer}`));
      console.log();
    }
  }

  if (warnings.length > 0) {
    console.log(chalkInstance.yellow.bold(`  Warnings (${warnings.length}):\n`));
    for (const v of warnings) {
      console.log(chalkInstance.yellow(`    ⚠ [${v.code}] ${v.message}`));
      if (v.producer) console.log(chalkInstance.gray(`      producer: ${v.producer}`));
      if (v.consumer) console.log(chalkInstance.gray(`      consumer: ${v.consumer}`));
      console.log();
    }
  }

  if (report.valid) {
    console.log(chalkInstance.green("  ✓ Contracts valid (warnings only)\n"));
  } else {
    console.log(
      chalkInstance.red(
        `  ✗ ${summary.errors} error(s) found — deploy will be blocked\n`
      )
    );
    console.log(
      chalkInstance.gray("    Use 'lyx deploy --force' to skip contract validation\n")
    );
  }
}

export function testCommand() {
  return new Command("test")
    .description("Validate MFE event and shared state contracts")
    .option("-d, --dir <path>", "Project root directory", process.cwd())
    .option("--json", "Output report as JSON")
    .action(async (opts) => {
      const { default: chalk } = await import("chalk");

      const rootDir = resolve(opts.dir);
      const entries = discoverMFEs(rootDir);

      if (entries.length === 0) {
        console.log(
          chalk.yellow(
            "\n  No MFEs found. Run from monorepo root or a project with mfes/ directory.\n"
          )
        );
        process.exit(0);
      }

      const withContracts = entries.filter((e) => e.config.contracts);

      if (withContracts.length === 0) {
        console.log(chalk.gray(`\n  Found ${entries.length} MFE(s) — none declare contracts.`));
        console.log(
          chalk.gray(
            '  Add "contracts" to mfe.config.json to enable contract testing.\n'
          )
        );
        process.exit(0);
      }

      console.log(
        chalk.cyan(
          `\n  Scanning ${entries.length} MFE(s), ${withContracts.length} with contracts...\n`
        )
      );

      for (const e of withContracts) {
        const emits = Object.keys(e.config.contracts?.emits ?? {}).length;
        const consumes = Object.keys(e.config.contracts?.consumes ?? {}).length;
        const state = Object.keys(e.config.contracts?.sharedState ?? {}).length;
        console.log(
          chalk.gray(
            `  ${chalk.white(e.config.name)}: ${emits} emits, ${consumes} consumes, ${state} state keys`
          )
        );
      }

      const configs = entries.map((e) => e.config);
      const report = validateContracts(configs);

      if (opts.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        printReport(report, chalk);
      }

      process.exit(report.valid ? 0 : 1);
    });
}
