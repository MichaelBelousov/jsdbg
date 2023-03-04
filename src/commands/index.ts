
import assert from "assert";
import { CommandDesc, implSubcommands } from "./base";
import { RunContext } from "../core/run-context";

const commands: Record<string, CommandDesc> = {
  b: {
    aliases: ['break'],
    async parseAndRun(argSrc: string, ctx) {
      // TODO; tokenize and stop on `if`
      const parsed = /\s*(?<loc>\S*)\s*(if\s*(?<cond>.*$)?/.exec(argSrc);
      await ctx.debug.engine.setBreakpoint({
        location: {
          sourceUnit: "",
          line: 1,
          col: 1,
        },
        condition: parsed?.groups?.cond,
      });
    }
  },

  d: {
    aliases: ['delete', 'clear'],
    async parseAndRun(_argSrc: string, _ctx) {
      throw Error("unimplemented");
    }
  },

  help: {
    async parseAndRun(_argSrc: string, _ctx) {
      throw Error("unimplemented");
    }
  },

  /*
  ...implSubcommands("info", {
    process: {

    }
  }),
  */

  apropros: {
    async parseAndRun(_argSrc: string, _ctx) {}
  },

  n: {
    aliases: ['next'],
    async parseAndRun(_argSrc: string, ctx) {
      await ctx.debug.engine.stepOver();
    }
  },

  s: {
    aliases: ['step'],
    async parseAndRun(_argSrc: string, ctx) {
      await ctx.debug.engine.stepInto();
    }
  },

  c: {
    aliases: ['continue'],
    async parseAndRun(_argSrc: string, ctx) {
      await ctx.debug.engine.resume();
    }
  },

  fin: {
    aliases: ['finish'],
    async parseAndRun(_argSrc: string, _ctx) {
      await _ctx.debug.engine.stepOut();
    }
  },

  up: {
    async parseAndRun(_argSrc: string, _ctx) {
      throw Error("unimplemented");
    }
  },

  down: {
    async parseAndRun(_argSrc: string, _ctx) {
      throw Error("unimplemented");
    }
  },

  p: {
    aliases: ['print'],
    async parseAndRun(argSrc: string, ctx) {
      await ctx.debug.engine.eval(argSrc);
    }
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

// rename to (and impl) findClosestCommandOrSuggest
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
    // TODO: suggest a command based on distance
    runContext.outputLine(`No such command '${cmd}'. Use the 'help' and 'apropos' commands to find commands`);
    // run context will do things like save to history
    runContext.complete();
    return;
  }

  return cmd.parseAndRun(parsed.groups.argSrc ?? "");
}

