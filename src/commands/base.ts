
export interface CommandDesc {
  //name: string;
  opts: {}, // yargs?
  description: string;
  parse(src: string): Promise<Command.Result>;
  aliases?: string[];
}

export namespace Command {
  export interface Result {
    output: string;
  }
}

export function implSubCommands(supCmd: string, subCmds: Record<string, CommandDesc>): Record<string, CommandDesc> {
  // FIXME: unimplemented
  return {
    [supCmd]: Object.fromEntries(
      Object.entries(subCmds).map(([subCmdName, subCmd]) => [subCmd.name, ])
    )
  }
}
