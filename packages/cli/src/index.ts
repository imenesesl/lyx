import { Command } from "commander";
import { initCommand } from "./commands/init";
import { createCommand } from "./commands/create";
import { devCommand } from "./commands/dev";
import { buildCommand } from "./commands/build";
import { registryCommand } from "./commands/registry";
import { publishCommand } from "./commands/publish";
import { loginCommand } from "./commands/login";
import { deployCommand } from "./commands/deploy";
import { viewCommand } from "./commands/view";
import { awsCommand } from "./commands/aws";

export function main() {
  const program = new Command();

  program
    .name("lyx")
    .description("Lyx - MFE Framework for Vibe Coders")
    .version("0.1.0");

  program.addCommand(initCommand());
  program.addCommand(createCommand());
  program.addCommand(devCommand());
  program.addCommand(buildCommand());
  program.addCommand(registryCommand());
  program.addCommand(publishCommand());
  program.addCommand(loginCommand());
  program.addCommand(deployCommand());
  program.addCommand(viewCommand());
  program.addCommand(awsCommand());

  program.parse();
}

const isDirectRun = process.argv[1]?.includes("cli/src/index");

if (isDirectRun) {
  main();
}
