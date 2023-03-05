import which from "which";
import child_process from "child_process";
import fs from "fs";
import { engineFromExe } from "../engines";
import { DebugContext } from "./debug-context";
import assert from "assert";

export async function launch(cmd: string): Promise<DebugContext> {
  const [exeRef, scriptArg, ...otherArgs] = cmd.split(/\s+/);
  // find the exe in PATH
  const exe = await which(exeRef);
  const engine = await engineFromExe(exe);

  const exeCanonicalPath = await fs.promises.readlink(exe);

  // TODO: support others by using require("net").Server instead of built in fork ipc
  assert(
    process.execPath === exeCanonicalPath,
    'Currently only forking is supported, so you must launch the same node exe file, but jsdbg uses node:\n'
    + process.execPath + "\n"
    + 'While you tried to launch:\n'
    + exeCanonicalPath
  );

  // FIXME:
  const spawned = child_process.fork(
    scriptArg,
    otherArgs,
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

  await new Promise(resolve => spawned.on("message", (msg: any) => engine.connect(msg.url).then(resolve)));

  return new DebugContext(
    engine,
    spawned,
  );
}
