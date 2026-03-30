#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const { main } = await import(resolve(__dirname, "..", "dist", "index.js"));
main();
