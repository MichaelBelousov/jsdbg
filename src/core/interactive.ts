import { InteractiveRunContext } from "./run-context";
import * as readline from "node:readline/promises";
import { DebugContext } from "./debug-context";
import { parseAndRunCommand } from "../commands";

async function prompt(rl: readline.Interface) {
  // const signal = AbortSignal.abort();
  return rl.question("(jsdb) "/*, { signal }*/);
}

export async function main(ctx: DebugContext) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const runCtx = new InteractiveRunContext();

  process.on("SIGINT", async () => {
    await ctx.engine.pause()
    await prompt(rl);
  });

  const MAX_ITERS = 500;
  for (let i = 0; i < MAX_ITERS; ++i) {
    try {
      const line = await prompt(rl);
      const _result = await parseAndRunCommand(line, { debug: ctx, run: runCtx });
    } catch (err: any) {
      if (err.type === "user-quit")
        break;
      else {
        runCtx.outputLine(`An error was thrown in jsdb:\n${err}`);
      }
    }
  }

  rl.close();
}
