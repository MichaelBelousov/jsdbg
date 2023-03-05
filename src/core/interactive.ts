import { InteractiveRunContext } from "./run-context";
import { DebugContext } from "./debug-context";
import { parseAndRunCommand } from "../commands";

export async function main(debugCtx: DebugContext) {
  const runCtx = new InteractiveRunContext();

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
        } else
          runCtx.close();
        return;
      }
    }
  }

  // TODO: move to (debug+run)ctx
  debugCtx.engine.on("paused", () => {
    repl();
  });

  debugCtx.pause();
}
