
import yargs from "yargs";

interface CliArgs {
  processId?: number;
  launchProgramCli?: string;
}

async function main(args: CliArgs) {
  if (!args.processId && !args.launchProgramCli)
    throw Error("Must specify either a command to launch a process or a process id to attach to")

  if (args.processId && args.launchProgramCli)
    throw Error("Cannot specify both a command to launch a process and a process id to attach to")

  if (args.processId) {
    await require("./core/attach").attach(args.processId);
  } else if (args.launchProgramCli) {
    await require("./core/launch").attach(args.launchProgramCli);
  }
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

