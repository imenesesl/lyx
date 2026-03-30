import { Command } from "commander";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { createInterface } from "node:readline";

const RC_PATH = join(homedir(), ".lyxrc");

export interface LyxRC {
  server: string;
  token: string;
  email: string;
  accountId?: string;
}

export function readRC(): LyxRC | null {
  if (!existsSync(RC_PATH)) return null;
  try {
    return JSON.parse(readFileSync(RC_PATH, "utf-8"));
  } catch {
    return null;
  }
}

function writeRC(rc: LyxRC): void {
  writeFileSync(RC_PATH, JSON.stringify(rc, null, 2), "utf-8");
}

function prompt(question: string, hidden = false): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export function loginCommand() {
  return new Command("login")
    .option("-s, --server <url>", "Lyx Admin server URL", "http://localhost")
    .option("-e, --email <email>", "Your email")
    .option("-p, --password <password>", "Your password")
    .description("Login to the Lyx Admin platform and save credentials")
    .action(async (opts) => {
      const { default: chalk } = await import("chalk");

      const server = opts.server;
      let email = opts.email;
      let password = opts.password;

      if (!email) email = await prompt("  Email: ");
      if (!password) password = await prompt("  Password: ");

      if (!email || !password) {
        console.error(chalk.red("  Email and password are required."));
        process.exit(1);
      }

      console.log(chalk.cyan("\n  Logging in to " + server + "...\n"));

      try {
        const res = await fetch(`${server}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
          const err = await res.json() as { error: string };
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }

        const data = await res.json() as { token: string; account: { id: string; name: string; email: string; alias: string | null } };
        writeRC({ server, token: data.token, email: data.account.email, accountId: data.account.alias || data.account.id });

        console.log(chalk.green(`  Logged in as ${data.account.name} (${data.account.email})`));
        console.log(chalk.gray(`  Credentials saved to ~/.lyxrc\n`));
      } catch (err: any) {
        console.error(chalk.red(`  Login failed: ${err.message}`));
        process.exit(1);
      }
    });
}
