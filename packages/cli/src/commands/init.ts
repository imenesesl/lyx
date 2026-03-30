import { Command } from "commander";
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";

function findWorkspaceRoot(from: string): string | null {
  let dir = from;
  const root = resolve("/");
  while (dir !== root) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    dir = resolve(dir, "..");
  }
  return null;
}

function addToWorkspace(wsRoot: string, entry: string): void {
  const wsFile = join(wsRoot, "pnpm-workspace.yaml");
  if (!existsSync(wsFile)) return;

  const content = readFileSync(wsFile, "utf-8");
  if (content.includes(`"${entry}"`) || content.includes(`'${entry}'`) || content.includes(entry)) {
    return;
  }

  const lines = content.split("\n");
  const packagesIdx = lines.findIndex((l) => l.trimStart().startsWith("packages:"));
  if (packagesIdx === -1) return;

  let insertAt = packagesIdx + 1;
  while (insertAt < lines.length && lines[insertAt].match(/^\s+-\s/)) {
    insertAt++;
  }

  lines.splice(insertAt, 0, `  - "${entry}"`);
  writeFileSync(wsFile, lines.join("\n"));
}

export function initCommand() {
  return new Command("init")
    .argument("<project-name>", "Name of the new Lyx project")
    .option("--layout <name>", "Default layout name", "main")
    .description("Initialize a new Lyx MFE project inside apps/")
    .action(async (projectName: string, opts: { layout: string }) => {
      const { default: chalk } = await import("chalk");

      const wsRoot = findWorkspaceRoot(process.cwd());
      const appsBase = wsRoot ? join(wsRoot, "apps") : join(process.cwd(), "apps");
      const projectDir = join(appsBase, projectName);

      if (existsSync(projectDir)) {
        console.error(chalk.red(`Directory "apps/${projectName}" already exists.`));
        process.exit(1);
      }

      console.log(chalk.cyan(`\n  Creating Lyx project: apps/${projectName}\n`));

      mkdirSync(join(projectDir, "mfes"), { recursive: true });
      mkdirSync(join(projectDir, "layouts"), { recursive: true });

      writeFileSync(
        join(projectDir, "package.json"),
        JSON.stringify(
          {
            name: projectName,
            version: "0.0.1",
            private: true,
            scripts: {
              dev: "lyx dev",
              build: "lyx build",
            },
            dependencies: {
              "@lyx/sdk": "workspace:*",
              react: "^19.1.0",
              "react-dom": "^19.1.0",
            },
            devDependencies: {
              "@lyx/cli": "workspace:*",
              "@lyx/vite-plugin": "workspace:*",
              "@vitejs/plugin-react": "^4.5.0",
              vite: "^6.3.0",
              typescript: "^5.7.0",
            },
          },
          null,
          2
        )
      );

      writeFileSync(
        join(projectDir, "lyx.config.json"),
        JSON.stringify(
          {
            name: projectName,
            defaultLayout: opts.layout,
            registryUrl: "http://localhost:3456",
            basePort: 3100,
          },
          null,
          2
        )
      );

      writeFileSync(
        join(projectDir, "layouts", `${opts.layout}.json`),
        JSON.stringify(
          {
            name: opts.layout,
            description: "Default layout with header, sidebar, and main content",
            regions: [
              { id: "header", slot: "header", position: "top" },
              { id: "sidebar", slot: "sidebar", position: "left", size: "250px" },
              { id: "main", slot: "main", position: "center" },
              { id: "footer", slot: "footer", position: "bottom" },
            ],
          },
          null,
          2
        )
      );

      writeFileSync(
        join(projectDir, "tsconfig.json"),
        JSON.stringify(
          {
            compilerOptions: {
              target: "ES2020",
              module: "ESNext",
              moduleResolution: "bundler",
              jsx: "react-jsx",
              strict: true,
              esModuleInterop: true,
              skipLibCheck: true,
              resolveJsonModule: true,
            },
          },
          null,
          2
        )
      );

      if (wsRoot) {
        const wsContent = readFileSync(join(wsRoot, "pnpm-workspace.yaml"), "utf-8");
        const hasCatchAll = wsContent.includes("apps/*/mfes/*");
        if (!hasCatchAll) {
          addToWorkspace(wsRoot, `apps/${projectName}/mfes/*`);
        }
      }

      console.log(chalk.green("  Created:"));
      console.log(`    apps/${projectName}/package.json`);
      console.log(`    apps/${projectName}/lyx.config.json`);
      console.log(`    apps/${projectName}/layouts/${opts.layout}.json`);
      console.log(`    apps/${projectName}/tsconfig.json`);
      console.log(`    apps/${projectName}/mfes/`);

      console.log();
      console.log(chalk.cyan("  Next steps:"));
      console.log(`    cd apps/${projectName}`);
      console.log(`    pnpm install`);
      console.log(`    lyx create my-header --slot header`);
      console.log(`    lyx deploy`);
      console.log();
    });
}
