
import assert from "assert";
import { CommandDesc } from "./base";

const commands: Record<string, CommandDesc> = {
  b: {
    aliases: 'break',
    parse(argSrc: string) {

    }
  },

  d: {
    aliases: ['delete', 'clear']
  },

  help: {

  },

  ...implSubcommands("info", {
    process: {

    }
  }),

  apropros: {

  },

  n: {
    aliases: ['next']
  },

  s: {
    aliases: ['step']
  },

  c: {
    aliases: ['continue']
  },

  fin: {
    aliases: ['finish']
  },

  p: {
    aliases: ['print']
  },

  q: {
    aliases: ['quit']
  },

  bt: {
    aliases: ['backtrace']
  },

  source: {
  }
};

const commandsWithAliases = new Map(
  Object.entries(commands)
    .map(([name, cmd]) => [[name, cmd] as const, cmd.aliases?.map(a => [a, cmd] as const) ?? []])
    .flat(1)
);

// TODO: use actual distance
function findClosestCommand(cmd) {
  return commandsWithAliases.get(cmd);
}

export async function parseAndRunCommand(src: string, runContext: RunContext) {
  src = src.trim()
  if (src === "")
    return undefined;

  const parsed = /^\s*(?<cmd>\S+)\s*(?<argSrc>.*$)/.exec(src.trim());
  assert(parsed?.groups?.cmd, `src was non-empty ('${src}') but failed to parse command syntax`);

  const cmd = findClosestCommand(parsed.groups.cmd);
  if (cmd === undefined) {
    runContext.outputLine(`No such command '${cmd}'. Use the 'help' and 'apropos' commands to find commands`);
    // run context will do things like save to history
    runContext.complete();
    return;
  }
}

