
import yargs from "yargs";
import { main as interactiveMain } from "./core/interactive";

interface CliArgs {
  processId?: number;
  launchProgramCli?: string;
}

async function main(args: CliArgs) {
  if (!args.processId && !args.launchProgramCli)
    throw Error("Must specify either a command to launch a process or a process id to attach to")

  if (args.processId && args.launchProgramCli)
    throw Error("Cannot specify both a command to launch a process and a process id to attach to")

  const ctx = args.processId
    ? await import("./core/attach").then(m => m.attach(args.processId!))
    : await import("./core/launch").then(m => m.launch(args.launchProgramCli!));

  await interactiveMain(ctx);
}

if (module === require.main) {
  const args = yargs(process.argv.slice(2))
    .usage("test")
    .strict()
    .options({
      processId: {
        alias: "p",
        type: "number",
      },
    })
    .parseSync();

  const launchProgramCli = args._.map(a => `${a}`).join(' ');

  main({ ...args, launchProgramCli }).catch(console.error);
}

