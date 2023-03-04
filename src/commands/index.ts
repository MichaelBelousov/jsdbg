
import assert from "assert";
import { CommandDesc, implSubCommands } from "./base";
import { RunContext } from "../core/run-context";
import { DebugContext } from "../core/debug-context";

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
  ...implSubCommands("info", {
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
      const val = await ctx.debug.engine.eval(argSrc);
      ctx.run.outputLine(`$x = ${val}`)
    }
  },

  q: {
    aliases: ['quit'],
    async parseAndRun(argSrc: string, ctx) {
      const val = await ctx.debug.engine.eval(argSrc);
      ctx.run.outputLine(`$x = ${val}`)
    }
  },

  bt: {
    aliases: ['backtrace'],
    async parseAndRun(_argSrc: string, _ctx) {
      throw Error("unimplemented");
    }
  },

  source: {
    async parseAndRun(_argSrc: string, _ctx) {
      throw Error("unimplemented");
    }
  }
};

const commandsWithAliases = new Map(
  Object.entries(commands)
    .map(([name, cmd]) => [[name, cmd] as const, cmd.aliases?.map(a => [a, cmd] as const) ?? []] as [string, CommandDesc][])
    .flat(1)
);

// rename to (and impl) findClosestCommandOrSuggest
export function findClosestCommand(cmd: string) {
  return commandsWithAliases.get(cmd);
}

export async function parseAndRunCommand(src: string, ctx: { debug: DebugContext, run: RunContext }) {
  src = src.trim()
  if (src === "")
    return undefined;

  const parsed = /^\s*(?<cmd>\S+)\s*(?<argSrc>.*$)/.exec(src.trim());
  assert(parsed?.groups?.cmd, `src was non-empty ('${src}') but failed to parse command syntax`);

  const cmd = findClosestCommand(parsed.groups.cmd);

  if (cmd === undefined) {
    // TODO: suggest a command based on distance
    ctx.run.outputLine(`No such command '${cmd}'. Use the 'help' and 'apropos' commands to find commands`);
    return;
  }

  return cmd.parseAndRun(parsed.groups.argSrc ?? "", ctx);
}

