import { Command } from "commander";
import { existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";

export function publishCommand() {
  return new Command("publish")
    .argument("[mfe]", "MFE to publish (defaults to current directory)")
    .option("-s, --server <url>", "Lyx Admin server URL", "http://localhost")
    .option("-t, --token <token>", "Auth token (or set LYX_TOKEN env)")
    .option("-v, --ver <version>", "Version to publish (overrides mfe.config.json)")
    .option("--slot <slot>", "Slot to assign (overrides mfe.config.json)")
    .description("Build and publish an MFE to the Lyx Admin platform")
    .action(async (mfe: string | undefined, opts) => {
      const { default: chalk } = await import("chalk");
      const { execSync } = await import("node:child_process");

      const cwd = process.cwd();
      let mfeDir: string;

      if (mfe) {
        const mfesDir = resolve(cwd, "mfes");
        mfeDir = join(mfesDir, mfe);
        if (!existsSync(mfeDir)) {
          console.error(chalk.red(`MFE "${mfe}" not found in mfes/`));
          process.exit(1);
        }
      } else {
        mfeDir = cwd;
      }

      const configPath = join(mfeDir, "mfe.config.json");
      if (!existsSync(configPath)) {
        console.error(chalk.red("No mfe.config.json found. Run from an MFE directory or pass the MFE name."));
        process.exit(1);
      }

      const config = JSON.parse(readFileSync(configPath, "utf-8"));
      const name = config.name;
      const slot = opts.slot ?? config.slot;
      const version = opts.ver ?? config.version ?? "0.0.1";
      const serverUrl = opts.server;
      let token = opts.token ?? process.env.LYX_TOKEN;

      if (!token) {
        try {
          const { readRC } = await import("./login");
          const rc = readRC();
          if (rc?.token) token = rc.token;
        } catch {}
      }

      if (!token) {
        console.error(chalk.red("Auth token required. Run 'lyx login' first, or use --token."));
        process.exit(1);
      }

      console.log(chalk.cyan(`\n  Publishing ${name}@${version} to ${serverUrl}\n`));

      console.log(chalk.blue("  Step 1/4: Building..."));
      try {
        const viteBin = join(mfeDir, "node_modules", ".bin", "vite");
        const cmd = existsSync(viteBin) ? `"${viteBin}" build` : "pnpm exec vite build";
        execSync(cmd, { cwd: mfeDir, stdio: "inherit" });
      } catch {
        console.error(chalk.red("  Build failed"));
        process.exit(1);
      }

      const distDir = join(mfeDir, "dist");
      if (!existsSync(distDir)) {
        console.error(chalk.red("  No dist/ directory after build"));
        process.exit(1);
      }

      console.log(chalk.blue("  Step 2/4: Creating bundle archive..."));
      const tarballPath = join(mfeDir, `${name}-${version}.tar.gz`);
      try {
        const tar = await import("tar");
        await tar.create(
          { gzip: true, file: tarballPath, cwd: distDir },
          ["."]
        );
      } catch (err) {
        console.error(chalk.red("  Failed to create archive. Install tar: npm i tar"));
        console.error(err);
        process.exit(1);
      }

      console.log(chalk.blue("  Step 3/4: Looking up MFE on server..."));
      let mfeId: string;
      try {
        const listRes = await fetch(`${serverUrl}/api/mfes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!listRes.ok) throw new Error(`HTTP ${listRes.status}`);
        const mfes = (await listRes.json()) as Array<{ _id: string; name: string }>;
        const existing = mfes.find((m) => m.name === name);

        if (existing) {
          mfeId = existing._id;
          console.log(chalk.gray(`    Found existing MFE: ${mfeId}`));
        } else {
          console.log(chalk.gray(`    MFE "${name}" not found, creating...`));
          const createRes = await fetch(`${serverUrl}/api/mfes`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ name, description: `Auto-created by lyx publish` }),
          });
          if (!createRes.ok) {
            const err = await createRes.json();
            throw new Error(err.error ?? `HTTP ${createRes.status}`);
          }
          const created = (await createRes.json()) as { _id: string };
          mfeId = created._id;
          console.log(chalk.gray(`    Created MFE: ${mfeId}`));
        }
      } catch (err: any) {
        console.error(chalk.red(`  Failed to reach server: ${err.message}`));
        process.exit(1);
      }

      console.log(chalk.blue("  Step 4/4: Uploading bundle..."));
      try {
        const { FormData, File } = await import("node:buffer").then(() => globalThis);
        const fileBuffer = readFileSync(tarballPath);
        const formData = new FormData();
        formData.append("version", version);
        formData.append("slot", slot);
        formData.append("bundle", new Blob([fileBuffer]), `${name}-${version}.tar.gz`);

        const uploadRes = await fetch(`${serverUrl}/api/mfes/${mfeId}/versions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error ?? `HTTP ${uploadRes.status}`);
        }

        const result = await uploadRes.json();
        console.log(chalk.green(`\n  Published ${name}@${version} successfully!`));
        console.log(chalk.gray(`  Remote entry: ${(result as any).remoteEntryUrl}`));
        console.log(chalk.gray(`  Version ID: ${(result as any)._id}\n`));
      } catch (err: any) {
        console.error(chalk.red(`  Upload failed: ${err.message}`));
        process.exit(1);
      } finally {
        const { unlinkSync } = await import("node:fs");
        try {
          unlinkSync(tarballPath);
        } catch {}
      }
    });
}
