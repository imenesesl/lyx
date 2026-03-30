import { Command } from "commander";

export function registryCommand() {
  return new Command("registry")
    .option("--url <url>", "Registry server URL", "http://localhost:3456")
    .description("List all registered MFEs")
    .action(async (opts: { url: string }) => {
      const { default: chalk } = await import("chalk");

      try {
        const res = await fetch(`${opts.url}/mfes`);
        if (!res.ok) {
          console.error(chalk.red(`Registry error: ${res.statusText}`));
          process.exit(1);
        }

        const entries = await res.json();

        if (entries.length === 0) {
          console.log(chalk.yellow("\n  No MFEs registered.\n"));
          return;
        }

        console.log(chalk.cyan(`\n  Registered MFEs (${entries.length}):\n`));

        for (const entry of entries) {
          console.log(
            `  ${chalk.green(entry.name.padEnd(20))} → slot: ${chalk.blue(
              entry.slot.padEnd(12)
            )} ${chalk.gray(entry.remoteEntry)}`
          );
        }
        console.log();
      } catch {
        console.error(
          chalk.red(`Cannot connect to registry at ${opts.url}. Is it running?`)
        );
        process.exit(1);
      }
    });
}
