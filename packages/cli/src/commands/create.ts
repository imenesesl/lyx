import { Command } from "commander";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

export function createCommand() {
  return new Command("create")
    .argument("<name>", "Name of the new MFE")
    .requiredOption("--slot <slot>", "Layout slot this MFE fills (e.g. header, sidebar, main)")
    .description("Scaffold a new MFE inside the project")
    .action(async (name: string, opts: { slot: string }) => {
      const { default: chalk } = await import("chalk");
      const mfeDir = resolve(process.cwd(), "mfes", name);

      if (existsSync(mfeDir)) {
        console.error(chalk.red(`MFE "${name}" already exists at mfes/${name}`));
        process.exit(1);
      }

      console.log(chalk.cyan(`\n  Creating MFE: ${name} (slot: ${opts.slot})\n`));

      mkdirSync(join(mfeDir, "src"), { recursive: true });

      writeFileSync(
        join(mfeDir, "mfe.config.json"),
        JSON.stringify({ name, slot: opts.slot, version: "0.0.1" }, null, 2)
      );

      writeFileSync(
        join(mfeDir, "package.json"),
        JSON.stringify(
          {
            name: `@mfe/${name}`,
            version: "0.0.1",
            type: "module",
            private: true,
            scripts: {
              dev: "vite",
              build: "vite build",
            },
            dependencies: {
              "@lyx/sdk": "workspace:*",
              react: "^19.1.0",
              "react-dom": "^19.1.0",
            },
            devDependencies: {
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
        join(mfeDir, "vite.config.ts"),
        [
          'import { defineConfig } from "vite";',
          'import react from "@vitejs/plugin-react";',
          'import { lyxPlugin } from "@lyx/vite-plugin";',
          "",
          "export default defineConfig({",
          "  plugins: [react(), ...lyxPlugin()],",
          "});",
          "",
        ].join("\n")
      );

      writeFileSync(
        join(mfeDir, "tsconfig.json"),
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
            include: ["src"],
          },
          null,
          2
        )
      );

      const componentName = toPascalCase(name);
      writeFileSync(
        join(mfeDir, "src", "index.tsx"),
        [
          'import React from "react";',
          "",
          `function ${componentName}() {`,
          "  return (",
          `    <div style={{ padding: 16 }}>`,
          `      <h2>${componentName}</h2>`,
          `      <p>MFE: ${name} | Slot: ${opts.slot}</p>`,
          "    </div>",
          "  );",
          "}",
          "",
          `export default ${componentName};`,
          "",
        ].join("\n")
      );

      writeFileSync(
        join(mfeDir, "index.html"),
        [
          "<!doctype html>",
          '<html lang="en">',
          "  <head>",
          '    <meta charset="UTF-8" />',
          `    <title>${name} MFE</title>`,
          "  </head>",
          "  <body>",
          '    <div id="root"></div>',
          '    <script type="module" src="/src/index.tsx"></script>',
          "  </body>",
          "</html>",
          "",
        ].join("\n")
      );

      console.log(chalk.green("  Created:"));
      console.log(`    mfes/${name}/mfe.config.json`);
      console.log(`    mfes/${name}/package.json`);
      console.log(`    mfes/${name}/vite.config.ts`);
      console.log(`    mfes/${name}/src/index.tsx`);
      console.log(`    mfes/${name}/index.html`);
      console.log();
      console.log(
        chalk.gray(`  Edit mfes/${name}/src/index.tsx and export default your component.`)
      );
      console.log();
    });
}

function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}
