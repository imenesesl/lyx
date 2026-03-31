import { Command } from "commander";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  unlinkSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { execSync } from "node:child_process";
import { createInterface } from "node:readline";
import { readRC } from "./login";
import { validateContracts } from "../lib/contract-validator";

function findViteBin(startDir: string): string {
  let dir = startDir;
  const root = resolve("/");
  while (dir !== root) {
    const candidate = join(dir, "node_modules", ".bin", "vite");
    if (existsSync(candidate)) return candidate;
    dir = resolve(dir, "..");
  }
  throw new Error("vite binary not found in any parent node_modules");
}

function bumpPatch(version: string): string {
  const parts = version.split(".").map(Number);
  while (parts.length < 3) parts.push(0);
  parts[2]++;
  return parts.join(".");
}

function getNextVersion(currentVersion: string, serverVersions: string[]): string {
  if (serverVersions.length === 0) return currentVersion;

  const highest = serverVersions
    .map((v) => v.split(".").map(Number))
    .sort((a, b) => {
      for (let i = 0; i < 3; i++) {
        if ((a[i] ?? 0) !== (b[i] ?? 0)) return (b[i] ?? 0) - (a[i] ?? 0);
      }
      return 0;
    })[0];

  const highestStr = highest.join(".");
  return bumpPatch(highestStr);
}

function saveVersion(mfeDir: string, newVersion: string): void {
  const configPath = join(mfeDir, "mfe.config.json");
  const config = JSON.parse(readFileSync(configPath, "utf-8"));
  config.version = newVersion;
  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
}

interface MFEInfo {
  dir: string;
  name: string;
  slot: string;
  version: string;
  contracts?: import("@lyx/types").MFEContracts;
}

function findMFEs(projectDir: string): MFEInfo[] {
  const mfesDir = join(projectDir, "mfes");
  if (!existsSync(mfesDir)) return [];

  return readdirSync(mfesDir)
    .filter((d) => existsSync(join(mfesDir, d, "mfe.config.json")))
    .map((d) => {
      const config = JSON.parse(
        readFileSync(join(mfesDir, d, "mfe.config.json"), "utf-8")
      );
      return {
        dir: join(mfesDir, d),
        name: config.name ?? d,
        slot: config.slot ?? "main",
        version: config.version ?? "0.0.1",
        contracts: config.contracts,
      };
    });
}

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export function deployCommand() {
  return new Command("deploy")
    .option("-s, --server <url>", "Lyx Admin server URL (reads from ~/.lyxrc)")
    .option("-v, --ver <version>", "Override version for all MFEs")
    .option("-a, --all", "Deploy all MFEs without prompting")
    .option("-f, --force", "Skip contract validation")
    .option("-c, --canary <percentage>", "Deploy as canary with given traffic percentage (1-99)")
    .option("--app <appId>", "App ID for canary deployment (required with --canary)")
    .description("Interactive deploy: pick MFEs from your project and publish them")
    .action(async (opts) => {
      const { default: chalk } = await import("chalk");

      const rc = readRC();
      const server = opts.server ?? rc?.server;
      const token = rc?.token ?? process.env.LYX_TOKEN;

      if (!server || !token) {
        console.error(chalk.red("\n  Not logged in. Run 'lyx login' first.\n"));
        process.exit(1);
      }

      try {
        const check = await fetch(`${server}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!check.ok) {
          console.error(chalk.red("\n  Session expired. Run 'lyx login' again.\n"));
          process.exit(1);
        }
        const me = (await check.json()) as { name: string };
        console.log(chalk.gray(`\n  Logged in as ${me.name}\n`));
      } catch {
        console.error(chalk.red("\n  Cannot reach server at " + server + "\n"));
        process.exit(1);
      }

      const cwd = process.cwd();
      const mfes = findMFEs(cwd);

      if (mfes.length === 0) {
        console.error(chalk.red("  No MFEs found in mfes/ directory."));
        console.log(chalk.yellow("  Run this from your project root (where mfes/ folder is)."));
        process.exit(1);
      }

      let selected: MFEInfo[];

      if (opts.all) {
        selected = mfes;
      } else {
        console.log(chalk.cyan("  Available MFEs:\n"));
        mfes.forEach((m, i) => {
          console.log(
            `    ${chalk.white(`${i + 1})`)} ${chalk.bold(m.name)} ${chalk.gray(`(slot: ${m.slot}, v${m.version})`)}`
          );
        });
        console.log();

        const answer = await prompt(
          `  Select MFEs to deploy (e.g. 1, 1,3, or "all"): `
        );

        if (answer.toLowerCase() === "all") {
          selected = mfes;
        } else {
          const indices = answer
            .split(",")
            .map((s) => parseInt(s.trim(), 10) - 1)
            .filter((i) => i >= 0 && i < mfes.length);

          if (indices.length === 0) {
            console.error(chalk.red("  No valid selection."));
            process.exit(1);
          }
          selected = indices.map((i) => mfes[i]);
        }
      }

      console.log(
        chalk.cyan(
          `\n  Deploying ${selected.length} MFE(s): ${selected.map((m) => m.name).join(", ")}\n`
        )
      );

      const hasContracts = mfes.some((m) => m.contracts);
      if (hasContracts && !opts.force) {
        console.log(chalk.gray("  Validating contracts...\n"));
        const configs = mfes.map((m) => ({
          name: m.name,
          slot: m.slot,
          version: m.version,
          contracts: m.contracts,
        }));
        const report = validateContracts(configs);

        if (!report.valid) {
          console.error(chalk.red(`  ✗ Contract validation failed: ${report.summary.errors} error(s)\n`));
          for (const v of report.violations.filter((v) => v.severity === "error")) {
            console.error(chalk.red(`    • [${v.code}] ${v.message}`));
          }
          console.log(chalk.yellow("\n  Use 'lyx deploy --force' to skip contract validation.\n"));
          process.exit(1);
        }

        if (report.summary.warnings > 0) {
          for (const v of report.violations.filter((v) => v.severity === "warning")) {
            console.log(chalk.yellow(`    ⚠ [${v.code}] ${v.message}`));
          }
          console.log();
        }

        console.log(chalk.green("  ✓ Contracts valid\n"));
      } else if (opts.force && hasContracts) {
        console.log(chalk.yellow("  ⚠ Contract validation skipped (--force)\n"));
      }

      for (const mfe of selected) {
        console.log(chalk.blue(`\n  ── ${mfe.name} ──\n`));

        let mfeId: string;
        let version: string;

        console.log(chalk.gray("  Resolving version..."));
        try {
          const listRes = await fetch(`${server}/api/mfes`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const allMfes = (await listRes.json()) as Array<{ _id: string; name: string }>;
          const existing = allMfes.find((m) => m.name === mfe.name);

          if (existing) {
            mfeId = existing._id;
            const versRes = await fetch(`${server}/api/mfes/${mfeId}/versions`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const serverVers = (await versRes.json()) as Array<{ version: string }>;
            if (opts.ver) {
              version = opts.ver;
            } else {
              version = getNextVersion(mfe.version, serverVers.map((v) => v.version));
            }
          } else {
            const createRes = await fetch(`${server}/api/mfes`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ name: mfe.name, description: `Deployed via lyx deploy` }),
            });
            if (!createRes.ok) {
              const err: { error?: string } = await createRes.json();
              throw new Error(err.error ?? `HTTP ${createRes.status}`);
            }
            mfeId = ((await createRes.json()) as { _id: string })._id;
            version = opts.ver ?? mfe.version;
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(chalk.red(`  Server error: ${msg}. Skipping.`));
          continue;
        }

        saveVersion(mfe.dir, version);
        console.log(chalk.cyan(`  Version: ${version}`));

        const nodeModules = join(mfe.dir, "node_modules");
        if (!existsSync(nodeModules)) {
          console.log(chalk.gray("  Installing dependencies..."));
          try {
            execSync("pnpm install --no-frozen-lockfile", { cwd: mfe.dir, stdio: "inherit" });
          } catch {
            console.error(chalk.red(`  Failed to install deps for ${mfe.name}. Skipping.`));
            continue;
          }
        }

        console.log(chalk.gray("  Building..."));
        try {
          const viteBin = findViteBin(mfe.dir);
          execSync(`"${viteBin}" build`, { cwd: mfe.dir, stdio: "inherit" });
        } catch {
          console.error(chalk.red(`  Build failed for ${mfe.name}. Skipping.`));
          continue;
        }

        const distDir = join(mfe.dir, "dist");
        if (!existsSync(distDir)) {
          console.error(chalk.red(`  No dist/ after build. Skipping ${mfe.name}.`));
          continue;
        }

        console.log(chalk.gray("  Packaging..."));
        const tarballPath = join(mfe.dir, `${mfe.name}-${version}.tar.gz`);
        try {
          const tar = await import("tar");
          await tar.create({ gzip: true, file: tarballPath, cwd: distDir }, ["."]);
        } catch (err) {
          console.error(chalk.red(`  Failed to package ${mfe.name}.`));
          continue;
        }

        console.log(chalk.gray("  Uploading..."));
        try {
          const fileBuffer = readFileSync(tarballPath);
          const formData = new FormData();
          formData.append("version", version);
          formData.append("slot", mfe.slot);
          formData.append("bundle", new Blob([fileBuffer]), `${mfe.name}-${version}.tar.gz`);
          if (mfe.contracts) {
            formData.append("metadata", JSON.stringify({ contracts: mfe.contracts }));
          }

          const uploadRes = await fetch(`${server}/api/mfes/${mfeId}/versions`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });

          if (!uploadRes.ok) {
            const err: { error?: string } = await uploadRes.json();
            throw new Error(err.error ?? `HTTP ${uploadRes.status}`);
          }

          const result = (await uploadRes.json()) as { remoteEntryUrl: string; _id: string };
          console.log(chalk.green(`  ✓ ${mfe.name}@${version} deployed!`));
          console.log(chalk.gray(`    Entry: ${result.remoteEntryUrl}`));

          if (opts.canary && opts.app) {
            const pct = Math.max(1, Math.min(99, parseInt(opts.canary, 10)));
            console.log(chalk.yellow(`  Setting canary: ${pct}% traffic to v${version}...`));
            try {
              const canaryRes = await fetch(`${server}/api/apps/${opts.app}/canary`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  slotId: mfe.slot,
                  mfeVersionId: result._id,
                  percentage: pct,
                }),
              });
              if (canaryRes.ok) {
                const canaryResult: { message?: string } = await canaryRes.json();
                console.log(chalk.green(`  ✓ ${canaryResult.message}`));
              } else {
                const canaryErr: { error?: string } = await canaryRes.json();
                console.error(chalk.red(`  Canary setup failed: ${canaryErr.error}`));
              }
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              console.error(chalk.red(`  Canary setup error: ${msg}`));
            }
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(chalk.red(`  Upload failed: ${msg}`));
        } finally {
          try { unlinkSync(tarballPath); } catch {}
        }
      }

      console.log(chalk.green("\n  Deploy complete!\n"));
    });
}
