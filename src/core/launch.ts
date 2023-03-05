import which from "which";
import child_process from "child_process";
import { engineFromExe } from "../engines";
import { DebugContext } from "./debug-context";

export async function launch(cmd: string): Promise<DebugContext> {
  const [exeRef, ...args] = cmd.split(/\s+/);
  // find the exe in PATH
  const exe = await which(exeRef);
  const engine = await engineFromExe(exe);

  const spawned = child_process.spawn(
    exe,
    args,
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        // FIXME: merge with existing node options in env?
        NODE_OPTIONS: `--require="${engine.bootloaderPath}"`,
        JSDBG_PORT: `${9229}`, // TODO: randomly generate one
      }
    }
  );

  process.on('exit', () => {
    spawned.kill('SIGKILL'); // if I'm going out, I'm taking you with me
  });

  // TODO: break here
  spawned.on("exit", () => {
  });

  return new DebugContext(
    await engineFromExe(exe),
    spawned,
  );
}
