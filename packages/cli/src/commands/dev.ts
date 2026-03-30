import { Command } from "commander";
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";

export function devCommand() {
  return new Command("dev")
    .option("--only <mfes>", "Comma-separated list of MFEs to serve")
    .option("--port <port>", "Base port for MFE dev servers", "3100")
    .option("--registry-port <port>", "Registry server port", "3456")
    .description("Start development servers for shell + MFEs + registry")
    .action(async (opts: { only?: string; port: string; registryPort: string }) => {
      const { default: chalk } = await import("chalk");
      const { execa } = await import("execa");

      const cwd = process.cwd();
      const mfesDir = resolve(cwd, "mfes");
      const basePort = parseInt(opts.port, 10);
      const registryPort = parseInt(opts.registryPort, 10);

      if (!existsSync(mfesDir)) {
        console.error(chalk.red("No mfes/ directory found. Run 'lyx init' first."));
        process.exit(1);
      }

      const allMfes = readdirSync(mfesDir).filter((d) =>
        existsSync(join(mfesDir, d, "mfe.config.json"))
      );

      const targetMfes = opts.only
        ? opts.only.split(",").map((s) => s.trim())
        : allMfes;

      console.log(chalk.cyan("\n  Lyx Dev Server\n"));
      console.log(chalk.gray(`  Registry:  http://localhost:${registryPort}`));

      const processes: any[] = [];

      // Start registry server
      console.log(chalk.green("  Starting registry server..."));
      try {
        const registryProc = execa("npx", ["tsx", "node_modules/@lyx/registry/src/server.ts"], {
          cwd,
          env: { ...process.env, PORT: String(registryPort) },
          stdio: "pipe",
        });
        processes.push(registryProc);
      } catch {
        console.log(chalk.yellow("  Registry module not found, starting inline..."));
      }

      // Start each MFE dev server
      for (let i = 0; i < targetMfes.length; i++) {
        const mfeName = targetMfes[i];
        const mfeDir = join(mfesDir, mfeName);
        const port = basePort + i;

        if (!existsSync(mfeDir)) {
          console.log(chalk.yellow(`  Skipping ${mfeName}: not found`));
          continue;
        }

        console.log(chalk.green(`  Starting ${mfeName} on port ${port}...`));

        const mfeProc = execa("npx", ["vite", "--port", String(port)], {
          cwd: mfeDir,
          env: {
            ...process.env,
            LYX_REGISTRY_URL: `http://localhost:${registryPort}`,
          },
          stdio: "pipe",
        });

        mfeProc.stdout?.on("data", (data: Buffer) => {
          const line = data.toString().trim();
          if (line) console.log(chalk.gray(`  [${mfeName}] ${line}`));
        });

        processes.push(mfeProc);

        // Auto-register this MFE after a short delay
        setTimeout(async () => {
          try {
            const configPath = join(mfeDir, "mfe.config.json");
            const config = JSON.parse(readFileSync(configPath, "utf-8"));
            await fetch(`http://localhost:${registryPort}/register`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: config.name,
                slot: config.slot,
                version: "0.0.0-dev",
                remoteEntry: `http://localhost:${port}/remoteEntry.js`,
              }),
            });
            console.log(chalk.green(`  Registered ${config.name} → ${config.slot}`));
          } catch {
            /* registry might not be ready yet */
          }
        }, 3000);
      }

      console.log(chalk.cyan(`\n  All MFEs starting. Press Ctrl+C to stop.\n`));

      process.on("SIGINT", () => {
        console.log(chalk.yellow("\n  Shutting down..."));
        processes.forEach((p) => p.kill());
        process.exit(0);
      });

      // Keep the process alive
      await new Promise(() => {});
    });
}
