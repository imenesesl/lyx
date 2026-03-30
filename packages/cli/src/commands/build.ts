import { Command } from "commander";
import { readdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

export function buildCommand() {
  return new Command("build")
    .argument("[mfe]", "Specific MFE to build (builds all if omitted)")
    .description("Build MFE(s) for production")
    .action(async (mfe?: string) => {
      const { default: chalk } = await import("chalk");
      const { execa } = await import("execa");

      const cwd = process.cwd();
      const mfesDir = resolve(cwd, "mfes");

      if (!existsSync(mfesDir)) {
        console.error(chalk.red("No mfes/ directory found."));
        process.exit(1);
      }

      const targets = mfe
        ? [mfe]
        : readdirSync(mfesDir).filter((d) =>
            existsSync(join(mfesDir, d, "mfe.config.json"))
          );

      console.log(chalk.cyan(`\n  Building ${targets.length} MFE(s)...\n`));

      for (const name of targets) {
        const mfeDir = join(mfesDir, name);

        if (!existsSync(mfeDir)) {
          console.log(chalk.yellow(`  Skipping ${name}: not found`));
          continue;
        }

        console.log(chalk.blue(`  Building ${name}...`));

        try {
          await execa("npx", ["vite", "build"], { cwd: mfeDir, stdio: "inherit" });
          console.log(chalk.green(`  ${name} built successfully`));
        } catch (err) {
          console.error(chalk.red(`  ${name} build failed`));
          process.exit(1);
        }
      }

      console.log(chalk.green(`\n  All builds complete.\n`));
    });
}
