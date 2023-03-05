import { InteractiveRunContext } from "./run-context";
import * as readline from "node:readline/promises";
import { DebugContext } from "./debug-context";
import { parseAndRunCommand } from "../commands";

export async function main(debugCtx: DebugContext) {
  const runCtx = new InteractiveRunContext();

  process.on("SIGINT", async () => {
    // TODO: this should be controlled by the run ctx
    await debugCtx.pause();
    await runCtx.newCmdPrompt();
  });

  debugCtx.pause();

  const MAX_ITERS = 1_000_000;
  for (let i = 0; i < MAX_ITERS; ++i) {
    try {
      const line = await runCtx.newCmdPrompt();
      const _result = await parseAndRunCommand(line, { debug: debugCtx, run: runCtx });
    } catch (err: any) {
      if (err.type === "user-quit")
        break;
      else {
        runCtx.outputLine(`An error was thrown in jsdb:\n${err}`);
      }
    }
  }

  runCtx.close();
}
