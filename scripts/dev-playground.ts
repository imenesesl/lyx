import { createRegistryServer } from "../packages/registry/src/server";
import { InMemoryProvider } from "../packages/registry/src/providers/in-memory";
import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(process.cwd());
const REGISTRY_PORT = 3456;
const SHELL_PORT = 3000;

interface MFEDef {
  dir: string;
  port: number;
  config: { name: string; slot: string };
}

const mfes: MFEDef[] = [
  {
    dir: resolve(ROOT, "playground/mfes/header"),
    port: 3101,
    config: JSON.parse(
      readFileSync(resolve(ROOT, "playground/mfes/header/mfe.config.json"), "utf-8")
    ),
  },
  {
    dir: resolve(ROOT, "playground/mfes/sidebar"),
    port: 3102,
    config: JSON.parse(
      readFileSync(resolve(ROOT, "playground/mfes/sidebar/mfe.config.json"), "utf-8")
    ),
  },
  {
    dir: resolve(ROOT, "playground/mfes/home"),
    port: 3103,
    config: JSON.parse(
      readFileSync(resolve(ROOT, "playground/mfes/home/mfe.config.json"), "utf-8")
    ),
  },
];

const children: ChildProcess[] = [];

function color(code: number, text: string) {
  return `\x1b[${code}m${text}\x1b[0m`;
}

function log(tag: string, colorCode: number, msg: string) {
  console.log(`  ${color(colorCode, `[${tag}]`.padEnd(14))} ${msg}`);
}

async function main() {
  console.log(
    `\n  ${color(36, "╔══════════════════════════════════════╗")}`
  );
  console.log(
    `  ${color(36, "║")}   ${color(1, "Lyx Playground")} — Dev Server        ${color(36, "║")}`
  );
  console.log(
    `  ${color(36, "╚══════════════════════════════════════╝")}\n`
  );

  // 1) Start registry
  log("registry", 33, `Starting on port ${REGISTRY_PORT}...`);
  const registry = createRegistryServer({
    port: REGISTRY_PORT,
    provider: new InMemoryProvider(),
  });
  await registry.start();
  log("registry", 32, `Running → http://localhost:${REGISTRY_PORT}`);

  // 2) Start each MFE via Vite
  for (const mfe of mfes) {
    log(mfe.config.name, 34, `Starting on port ${mfe.port}...`);

    const child = spawn(
      "npx",
      ["vite", "--port", String(mfe.port), "--strictPort"],
      {
        cwd: mfe.dir,
        stdio: "pipe",
        env: { ...process.env, FORCE_COLOR: "1" },
      }
    );

    children.push(child);

    child.stdout?.on("data", (data: Buffer) => {
      const line = data.toString().trim();
      if (line.includes("Local:") || line.includes("ready in")) {
        log(mfe.config.name, 32, line.replace(/^\s+/, ""));
      }
    });

    child.stderr?.on("data", (data: Buffer) => {
      const line = data.toString().trim();
      if (line && !line.includes("ExperimentalWarning")) {
        log(mfe.config.name, 31, line);
      }
    });
  }

  // 3) Wait for MFEs to boot, then register them
  log("registry", 33, "Waiting for MFEs to boot...");
  await sleep(4000);

  for (const mfe of mfes) {
    await registry.provider.register({
      name: mfe.config.name,
      slot: mfe.config.slot,
      version: "0.0.0-dev",
      remoteEntry: `http://localhost:${mfe.port}/remoteEntry.js`,
      timestamp: Date.now(),
    });
    log("registry", 32, `Registered ${color(1, mfe.config.name)} → slot:${mfe.config.slot} (port ${mfe.port})`);
  }

  // 4) Start the shell
  log("shell", 35, `Starting on port ${SHELL_PORT}...`);
  const shellChild = spawn(
    "npx",
    ["vite", "--port", String(SHELL_PORT), "--strictPort"],
    {
      cwd: resolve(ROOT, "packages/shell"),
      stdio: "pipe",
      env: { ...process.env, FORCE_COLOR: "1" },
    }
  );
  children.push(shellChild);

  shellChild.stdout?.on("data", (data: Buffer) => {
    const line = data.toString().trim();
    if (line.includes("Local:") || line.includes("ready in")) {
      log("shell", 32, line.replace(/^\s+/, ""));
    }
  });

  shellChild.stderr?.on("data", (data: Buffer) => {
    const line = data.toString().trim();
    if (line && !line.includes("ExperimentalWarning")) {
      log("shell", 31, line);
    }
  });

  await sleep(3000);

  console.log(
    `\n  ${color(36, "────────────────────────────────────────")}`
  );
  console.log(`  ${color(32, "Ready!")} Open in your browser:\n`);
  console.log(`    ${color(1, "Shell UI:")}    ${color(36, `http://localhost:${SHELL_PORT}`)}`);
  console.log(`    ${color(1, "Registry:")}    ${color(36, `http://localhost:${REGISTRY_PORT}/mfes`)}`);
  console.log(`    ${color(1, "Header MFE:")}  ${color(36, `http://localhost:3101`)}`);
  console.log(`    ${color(1, "Sidebar MFE:")} ${color(36, `http://localhost:3102`)}`);
  console.log(`    ${color(1, "Home MFE:")}    ${color(36, `http://localhost:3103`)}`);
  console.log(
    `\n  ${color(90, "Press Ctrl+C to stop all servers.")}\n`
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

process.on("SIGINT", () => {
  console.log(`\n  ${color(33, "Shutting down...")} `);
  children.forEach((c) => c.kill());
  process.exit(0);
});

process.on("SIGTERM", () => {
  children.forEach((c) => c.kill());
  process.exit(0);
});

main().catch((err) => {
  console.error("Fatal:", err);
  children.forEach((c) => c.kill());
  process.exit(1);
});
