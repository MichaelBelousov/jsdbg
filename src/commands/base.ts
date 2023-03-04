import { DebugContext } from "../core/debug-context";
import { RunContext } from "../core/run-context";

export interface CommandDesc {
  opts?: {}, // yargs/minimist?
  // FIXME: make required
  description?: string;
  parseAndRun(src: string, ctx: { debug: DebugContext, run: RunContext }): Promise<Command.Result | void>;
  aliases?: string[];
}

export namespace Command {
  export interface Result {
    output: string;
  }
}

export function implSubCommands(supCmd: string, subCmds: Record<string, CommandDesc>): Record<string, CommandDesc> {
  throw Error("Unimplemented");
  return {
    [supCmd]: Object.fromEntries(
      Object.entries(subCmds).map(([subCmdName, subCmd]) => [subCmdName, ])
    )
  }
}
