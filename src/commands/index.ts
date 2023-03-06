
import assert from "assert";
import { CommandDesc, implSubCommands } from "./base";
import { RunContext } from "../core/run-context";
import { DebugContext } from "../core/debug-context";
import { nodejs } from "../engines";
import { parseLocation } from "./parse-location";

const commands: Record<string, CommandDesc> = {
  b: {
    aliases: ['break'],
    async parseAndRun(argSrc: string, ctx) {
      // TODO; tokenize and stop on `if`
      const parsed = /\s*(?<loc>\S*)\s*(if\s*(?<cond>.*$))?/.exec(argSrc);
      const loc
        = parsed?.groups?.loc
        ? await parseLocation(parsed.groups.loc, ctx.debug)
        : await ctx.debug.engine.getLocation();

      assert(loc, "no location was specified and no current location could be determined");
      await ctx.debug.engine.setBreakpoint({
        location: loc
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

  u: {
    aliases: ['until'],
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
    async parseAndRun(_argSrc, ctx) {
      await ctx.debug.engine.stepOver();
      const loc = await ctx.debug.engine.getLocation();
      ctx.run.outputLine(JSON.stringify(loc));
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
      console.log("$x = ", val)
    }
  },

  q: {
    aliases: ['quit'],
    async parseAndRun(_argSrc, ctx) {
      // const quitError = Error("user quitting");
      // (quitError as any).type = "user-quit";
      // throw quitError;
      ctx.run.outputLine("");
      ctx.run.close(); // this should end the event loop gracefully but doesn't yet
      process.exit(0);
    }
  },

  bt: {
    aliases: ['backtrace'],
    async parseAndRun(_argSrc, _ctx) {
      throw Error("unimplemented");
    }
  },

  source: {
    async parseAndRun(_argSrc, _ctx) {
      throw Error("unimplemented");
    }
  },

  source: {
    async parseAndRun(_argSrc, _ctx) {
      throw Error("unimplemented");
    }
  },

  history: {
    async parseAndRun(argSrc, ctx) {
      for (const line of ctx.run.history)
        ctx.run.outputLine(line);
    }
  }

  commands: {
    // TODO: check and align with gdb behavior
    async parseAndRun(argSrc, ctx) {
      const lastSetBreakpoint = ctx.debug.lastSetBreakpoint;
      if (!lastSetBreakpoint) {
        ctx.run.outputLine("No previous breakpoint");
        return;
      }
      argSrc = argSrc.trim();
      lastSetBreakpoint.commands = [];

      if (argSrc) {
        lastSetBreakpoint.commands.push(argSrc);
      } else {
        const commands = [] as string[];
        let command: string;
        while ((command = (await ctx.run.additionalLinePrompt()).trim()) !== "end") {
          lastSetBreakpoint.commands.push(argSrc);
        }
      }
      throw Error("unimplemented");
    }
  },

  // raw inspect
  '_ri': {
    async parseAndRun(argSrc, ctx) {
      const result = await eval(argSrc);
      const _cdp = (ctx.debug.engine as any as nodejs)["_cdp"];
      ctx.run.outputLine("result: " + JSON.stringify(result.result));
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

