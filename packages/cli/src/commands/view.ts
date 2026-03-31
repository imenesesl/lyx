import { Command } from "commander";
import { existsSync, writeFileSync, rmSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { execSync } from "node:child_process";
import { createInterface } from "node:readline";
import { readRC } from "./login";

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => {
    rl.question(question, (answer) => {
      rl.close();
      res(answer.trim());
    });
  });
}

function findShellPackage(): string | null {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, "packages", "shell");
    if (existsSync(join(candidate, "src", "ShellApp.tsx"))) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

export function viewCommand() {
  return new Command("view")
    .option("-s, --server <url>", "Lyx Admin server URL (reads from ~/.lyxrc)")
    .option("--app <slug>", "App slug to view")
    .option("--port <port>", "Port for the shell dev server", "3000")
    .description("Preview a published app by running the Shell locally")
    .action(async (opts) => {
      const { default: chalk } = await import("chalk");

      const rc = readRC();
      const server = opts.server ?? rc?.server ?? "http://localhost";
      const token = rc?.token ?? process.env.LYX_TOKEN;
      const accountId = rc?.accountId;

      if (!token || !accountId) {
        console.error(chalk.red("\n  Not logged in. Run 'lyx login' first.\n"));
        process.exit(1);
      }

      let slug = opts.app;

      if (!slug) {
        let apps: Array<{ _id: string; name: string; slug: string }>;
        try {
          const res = await fetch(`${server}/api/apps`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          apps = (await res.json()) as Array<{ _id: string; name: string; slug: string }>;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(chalk.red(`\n  Cannot reach server: ${msg}\n`));
          process.exit(1);
        }

        if (apps.length === 0) {
          console.error(chalk.red("\n  No apps found. Create one in the Admin UI first.\n"));
          process.exit(1);
        }

        console.log(chalk.cyan("\n  Your Apps:\n"));
        apps.forEach((a, i) => {
          console.log(`    ${chalk.white(`${i + 1})`)} ${chalk.bold(a.name)} ${chalk.gray(`(/${a.slug})`)}`);
        });
        console.log();

        const answer = await prompt("  Select app to preview: ");
        const idx = parseInt(answer, 10) - 1;
        if (idx < 0 || idx >= apps.length) {
          console.error(chalk.red("  Invalid selection."));
          process.exit(1);
        }
        slug = apps[idx].slug;
      }

      try {
        const runtimeCheck = await fetch(`${server}/api/runtime/${accountId}/${slug}/layout`);
        if (!runtimeCheck.ok) {
          console.error(chalk.red(`\n  App "/${slug}" has no published version. Publish it first.\n`));
          process.exit(1);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`\n  Cannot reach server: ${msg}\n`));
        process.exit(1);
      }

      const shellDir = findShellPackage();
      if (!shellDir) {
        console.error(chalk.red("\n  Cannot find @lyx/shell package. Run from inside a Lyx monorepo.\n"));
        process.exit(1);
      }

      const port = opts.port;
      const previewConfigPath = join(shellDir, "vite.preview.config.ts");

      writeFileSync(
        previewConfigPath,
        `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { lyxHostPlugin } from "@lyx/vite-plugin";

export default defineConfig({
  plugins: [
    react(),
    ...lyxHostPlugin({ registryUrl: "${server}" }),
  ],
  define: {
    __LYX_APP_SLUG__: JSON.stringify("${slug}"),
  },
  server: {
    port: ${port},
    proxy: {
      "/storage": {
        target: "${server}",
        changeOrigin: true,
      },
    },
  },
});
`
      );

      const cleanup = () => {
        try { rmSync(previewConfigPath, { force: true }); } catch {}
      };

      process.on("SIGINT", () => { cleanup(); process.exit(0); });
      process.on("SIGTERM", () => { cleanup(); process.exit(0); });

      console.log(chalk.cyan(`\n  Starting Shell for /${accountId}/${slug}...\n`));
      console.log(chalk.green(`  Open: http://localhost:${port}\n`));
      console.log(chalk.gray("  Press Ctrl+C to stop.\n"));

      try {
        const viteBin = join(shellDir, "node_modules", ".bin", "vite");
        const viteCmd = existsSync(viteBin) ? `"${viteBin}"` : "pnpm exec vite";
        execSync(
          `${viteCmd} --host --port ${port} --config vite.preview.config.ts`,
          { cwd: shellDir, stdio: "inherit" }
        );
      } catch {
        // Ctrl+C
      } finally {
        cleanup();
      }
    });
}
