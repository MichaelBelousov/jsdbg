import { InteractiveRunContext } from "./run-context";
import { DebugContext } from "./debug-context";
import { parseAndRunCommand } from "../commands";

export async function main(debugCtx: DebugContext) {
  const runCtx = await InteractiveRunContext.create();

  runCtx.on("SIGINT", async () => {
    // TODO: this should be controlled by the run ctx
    await debugCtx.pause();
  });

  async function repl() {
    // TODO: remove max_iters
    const MAX_ITERS = 500_000;
    for (let i = 0; i < MAX_ITERS; ++i) {
      try {
        const line = await runCtx.newCmdPrompt();
        const _result = await parseAndRunCommand(line, { debug: debugCtx, run: runCtx });
        // HACK: the result should return whether the command requested a continue
        if (["c", "continue"].includes(line.trim()))
          return;
      } catch (err: any) {
        if (err.type !== "user-quit") {
          runCtx.outputLine(`An error was thrown in jsdb:`);
          console.error(err);
        } else {
          runCtx.close();
        }
      }
    }
  }

  // TODO: this event should be on the ctx, we shouldn't access the engine directly
  debugCtx.engine.on("paused", () => {
    // HACK: wait for other listeners first, e.g. to report the stop status
    setTimeout(repl, 50);
  });

  debugCtx.pause();
}
