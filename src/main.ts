
import yargs from "yargs";

interface CliArgs {
  processId: number;
  launchProgramCli: string;
}

async function main(args: CliArgs) {
  if (args.processId && process.command)
    throw Error("Cannot specify both a command to start a process and a process to attach to")

  if (args.processId) {
    // TODO: windows
    process.kill(args.processId, "SIGUSR1");
  } else if (process.command) {

  }
}

if (module === require.main) {
  const args = yargs(process.argv.slice(2))
    .usage("test")
    .strict()
    .options({
      p: {
        alias: "process",
        type: "number",
      },
    })
    .parseSync();

  const launchProgramCli = args._.map(a => `${a}`).join(' ');

  main({ ...args, launchProgramCli }).catch(console.error);
}

