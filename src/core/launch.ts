import which from "which";
import child_process from "child_process";
import fs from "fs";
import path from "path";
import { engineFromExe } from "../engines";
import { DebugContext } from "./debug-context";
import assert from "assert";

async function canonicalPath(p: string) {
  let result = p;
  try {
    result = await fs.promises.readlink(result);
  } catch (err: any) {
    if (err.code !== "EINVAL") throw err;
  }

  return path.normalize(result);
}

export async function launch(cmd: string): Promise<DebugContext> {
  const [exeRef, scriptArg, ...otherArgs] = cmd.split(/\s+/);
  // find the exe in PATH
  const exe = await which(exeRef);
  const engine = await engineFromExe(exe);

  // TODO: support others by using require("net").Server instead of built in fork ipc
  assert(
    await canonicalPath(process.execPath) === await canonicalPath(exe),
    'Currently only forking is supported, so you must launch the same node exe file, but jsdbg uses node:\n'
    + process.execPath + "\n"
    + 'While you tried to launch:\n'
    + exe
  );

  // FIXME:
  const spawned = child_process.fork(
    scriptArg,
    otherArgs,
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        // FIXME: why not just pass --inspect to node options in env?
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
    //runContext.stop
  });

  await new Promise(resolve => spawned.on("message", (msg: any) => engine.connect(msg.url).then(resolve)));

  return new DebugContext(
    engine,
    spawned,
  );
}
