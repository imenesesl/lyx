import { Command } from "commander";
import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";
import { createInterface } from "node:readline";

const AWS_FILE = join(homedir(), ".lyx-aws");

interface AwsCreds {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

function readCreds(): AwsCreds | null {
  if (!existsSync(AWS_FILE)) return null;
  try {
    const content = readFileSync(AWS_FILE, "utf-8");
    const id = content.match(/AWS_ACCESS_KEY_ID="([^"]+)"/)?.[1];
    const secret = content.match(/AWS_SECRET_ACCESS_KEY="([^"]+)"/)?.[1];
    const token = content.match(/AWS_SESSION_TOKEN="([^"]+)"/)?.[1];
    if (id && secret) return { accessKeyId: id, secretAccessKey: secret, sessionToken: token };
    return null;
  } catch {
    return null;
  }
}

function writeCreds(creds: AwsCreds): void {
  let content = `export AWS_ACCESS_KEY_ID="${creds.accessKeyId}"\n`;
  content += `export AWS_SECRET_ACCESS_KEY="${creds.secretAccessKey}"\n`;
  if (creds.sessionToken) {
    content += `export AWS_SESSION_TOKEN="${creds.sessionToken}"\n`;
  } else {
    content += `unset AWS_SESSION_TOKEN 2>/dev/null || true\n`;
  }
  writeFileSync(AWS_FILE, content, "utf-8");
  chmodSync(AWS_FILE, 0o600);
}

function setEnv(creds: AwsCreds): void {
  process.env.AWS_ACCESS_KEY_ID = creds.accessKeyId;
  process.env.AWS_SECRET_ACCESS_KEY = creds.secretAccessKey;
  if (creds.sessionToken) {
    process.env.AWS_SESSION_TOKEN = creds.sessionToken;
  } else {
    delete process.env.AWS_SESSION_TOKEN;
  }
}

function checkIdentity(): { account: string; arn: string } | null {
  try {
    const out = execSync("aws sts get-caller-identity --output json", {
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 10000,
    }).toString();
    const data = JSON.parse(out);
    return { account: data.Account, arn: data.Arn };
  } catch {
    return null;
  }
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

export function awsCommand() {
  const cmd = new Command("aws")
    .description("Manage AWS credentials for local development");

  cmd
    .command("login")
    .description("Set up AWS credentials (saved to ~/.lyx-aws)")
    .action(async () => {
      const { default: chalk } = await import("chalk");

      console.log(chalk.cyan("\n  Lyx — AWS Credential Setup\n"));

      const existing = readCreds();
      if (existing) {
        setEnv(existing);
        const identity = checkIdentity();
        if (identity) {
          console.log(chalk.green(`  ✓ Credentials already configured and valid`));
          console.log(chalk.gray(`    Account: ${identity.account}`));
          console.log(chalk.gray(`    Identity: ${identity.arn}\n`));
          return;
        }
        console.log(chalk.yellow(`  ⚠ Existing credentials expired. Enter new ones.\n`));
      }

      console.log(chalk.gray("  Get these from IAM Console → Security Credentials → Access Keys,"));
      console.log(chalk.gray("  or from SSO portal → Command line access.\n"));

      const accessKeyId = await prompt("  AWS_ACCESS_KEY_ID: ");
      const secretAccessKey = await prompt("  AWS_SECRET_ACCESS_KEY: ");
      const sessionToken = await prompt("  AWS_SESSION_TOKEN (empty if IAM user keys): ");

      if (!accessKeyId || !secretAccessKey) {
        console.error(chalk.red("\n  Access Key ID and Secret are required.\n"));
        process.exit(1);
      }

      const creds: AwsCreds = {
        accessKeyId,
        secretAccessKey,
        sessionToken: sessionToken || undefined,
      };

      setEnv(creds);
      const identity = checkIdentity();

      if (!identity) {
        console.error(chalk.red("\n  ✗ Credentials are invalid. Please check and try again.\n"));
        process.exit(1);
      }

      writeCreds(creds);

      console.log(chalk.green(`\n  ✓ Credentials saved to ~/.lyx-aws`));
      console.log(chalk.gray(`    Account: ${identity.account}`));
      console.log(chalk.gray(`    Identity: ${identity.arn}`));

      if (sessionToken) {
        console.log(chalk.yellow(`\n  ⚠ Using temporary (SSO) credentials — they will expire.`));
        console.log(chalk.yellow(`    Run 'lyx aws login' again when they do.\n`));
      } else {
        console.log(chalk.gray(`\n  IAM user keys don't expire. You're all set.\n`));
      }
    });

  cmd
    .command("status")
    .description("Check if AWS credentials are valid")
    .action(async () => {
      const { default: chalk } = await import("chalk");

      const creds = readCreds();
      if (!creds) {
        console.log(chalk.red("\n  No AWS credentials found."));
        console.log(chalk.yellow("  Run 'lyx aws login' to set them up.\n"));
        process.exit(1);
      }

      setEnv(creds);
      const identity = checkIdentity();

      if (!identity) {
        console.log(chalk.red("\n  ✗ Credentials expired or invalid."));
        console.log(chalk.yellow("  Run 'lyx aws login' to refresh.\n"));
        process.exit(1);
      }

      console.log(chalk.green(`\n  ✓ AWS credentials valid`));
      console.log(chalk.gray(`    Account:  ${identity.account}`));
      console.log(chalk.gray(`    Identity: ${identity.arn}`));
      console.log(chalk.gray(`    File:     ~/.lyx-aws\n`));
    });

  cmd
    .command("logout")
    .description("Remove saved AWS credentials")
    .action(async () => {
      const { default: chalk } = await import("chalk");

      if (existsSync(AWS_FILE)) {
        writeFileSync(AWS_FILE, "", "utf-8");
        console.log(chalk.green("\n  ✓ AWS credentials removed from ~/.lyx-aws\n"));
      } else {
        console.log(chalk.gray("\n  No credentials file found.\n"));
      }
    });

  return cmd;
}
