import which from "which";
import child_process from "child_process";
import { engineFromExe } from "../engines";
import { DebugContext } from "./debug-context";

async function launch(cmd: string): Promise<DebugContext> {
  const [exeRef, ...args] = cmd.split(/\s+/);
  // find the exe in PATH
  const exe = await which(exeRef);

  const spawned = child_process.spawn(
    exe,
    args,
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        // FIXME: merge with existing node options in env?
        NODE_OPTIONS: `--require="${require.resolve("./bootloader.ts")}"`,
        JSDBG_PORT: 9229, // TODO: randomly generate one
      }
    }
  );

  return {
    debuggee: spawned,
    engine: engineFromExe(exe),
  };
}
