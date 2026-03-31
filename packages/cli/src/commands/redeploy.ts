import { Command } from "commander";
import {
  existsSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { execSync } from "node:child_process";
import { createInterface } from "node:readline";
import { homedir } from "node:os";

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

interface MFEInfo {
  dir: string;
  name: string;
  slot: string;
  version: string;
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

function getAwsBucket(): { bucket: string; region: string } | null {
  try {
    const out = execSync("aws sts get-caller-identity --query Account --output text", {
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 10000,
    }).toString().trim();
    const region = process.env.AWS_REGION ?? "us-west-2";
    const env = process.env.LYX_ENV ?? "production";
    return { bucket: `lyx-bundles-${out}-${env}`, region };
  } catch {
    return null;
  }
}

export function redeployCommand() {
  return new Command("redeploy")
    .option("-a, --all", "Re-deploy all MFEs without prompting")
    .option("-v, --ver <version>", "Override version to re-deploy")
    .option("--skip-build", "Skip build step (upload existing dist/)")
    .option("--ssr", "Also re-deploy the SSR service (docker build + push + App Runner update)")
    .description("Re-deploy MFE versions to S3 without version bump. Useful for hotfixes and build-tool updates.")
    .action(async (opts) => {
      const { default: chalk } = await import("chalk");

      const awsFile = join(homedir(), ".lyx-aws");
      if (existsSync(awsFile)) {
        const content = readFileSync(awsFile, "utf-8");
        const keyMatch = content.match(/AWS_ACCESS_KEY_ID="([^"]+)"/);
        const secretMatch = content.match(/AWS_SECRET_ACCESS_KEY="([^"]+)"/);
        const tokenMatch = content.match(/AWS_SESSION_TOKEN="([^"]+)"/);
        if (keyMatch) process.env.AWS_ACCESS_KEY_ID = keyMatch[1];
        if (secretMatch) process.env.AWS_SECRET_ACCESS_KEY = secretMatch[1];
        if (tokenMatch) process.env.AWS_SESSION_TOKEN = tokenMatch[1];
      }

      const awsInfo = getAwsBucket();
      if (!awsInfo) {
        console.error(chalk.red("\n  AWS credentials not configured. Run 'lyx aws login' first.\n"));
        process.exit(1);
      }

      console.log(chalk.cyan(`\n  Lyx — Re-deploy (same version)\n`));
      console.log(chalk.gray(`  Bucket: ${awsInfo.bucket}`));
      console.log(chalk.gray(`  Region: ${awsInfo.region}\n`));

      const cwd = process.cwd();
      const mfes = findMFEs(cwd);

      if (mfes.length === 0) {
        console.error(chalk.red("  No MFEs found in mfes/ directory."));
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
          `  Select MFEs to re-deploy (e.g. 1, 1,3, or "all"): `
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

      for (const mfe of selected) {
        const version = opts.ver ?? mfe.version;
        console.log(chalk.blue(`\n  ── ${mfe.name}@${version} (re-deploy) ──\n`));

        if (!opts.skipBuild) {
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
        }

        const distDir = join(mfe.dir, "dist");
        if (!existsSync(distDir)) {
          console.error(chalk.red(`  No dist/ found. Build first or remove --skip-build. Skipping ${mfe.name}.`));
          continue;
        }

        console.log(chalk.gray("  Uploading to S3..."));
        const s3Prefix = `${mfe.name}/${version}`;

        try {
          execSync(
            `aws s3 sync "${distDir}/" "s3://${awsInfo.bucket}/${s3Prefix}/" --region ${awsInfo.region}`,
            { stdio: "inherit" }
          );
          console.log(chalk.green(`  ✓ ${mfe.name}@${version} re-deployed to S3`));
          console.log(chalk.gray(`    s3://${awsInfo.bucket}/${s3Prefix}/remoteEntry.js`));
        } catch {
          console.error(chalk.red(`  S3 upload failed for ${mfe.name}. Check AWS credentials.`));
          continue;
        }
      }

      if (opts.ssr) {
        console.log(chalk.blue(`\n  ── SSR (Shell) re-deploy ──\n`));
        try {
          const rootDir = resolve(cwd, "..");
          let scriptDir = cwd;
          const scriptPath = join(scriptDir, "scripts", "deploy-aws.sh");
          if (!existsSync(scriptPath)) {
            const altPath = join(rootDir, "scripts", "deploy-aws.sh");
            if (existsSync(altPath)) {
              scriptDir = rootDir;
            } else {
              console.error(chalk.red("  scripts/deploy-aws.sh not found. Cannot re-deploy SSR."));
              return;
            }
          }
          console.log(chalk.gray("  Running deploy-aws.sh update (builds + pushes all services)..."));
          execSync(`bash scripts/deploy-aws.sh update`, { cwd: scriptDir, stdio: "inherit" });
          console.log(chalk.green("  ✓ SSR re-deployed"));
        } catch (err: any) {
          console.error(chalk.red(`  SSR re-deploy failed: ${err.message}`));
        }
      }

      console.log(chalk.green("\n  Re-deploy complete!\n"));
    });
}
