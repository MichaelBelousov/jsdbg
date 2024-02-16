import which from "which";
import child_process from "child_process";
import fs from "fs";
import path from "path";
import url from "url";
import { engineFromExe } from "../engines";
import { DebugContext } from "./debug-context";
import assert from "assert";

async function canonicalPath(p: string) {
  return path.normalize(await fs.promises.realpath(p));
}

function randomIntInRangeInclusive(low: number, high: number) {
  const range = high - low + 1;
  return low + Math.floor(Math.random() * range);
}

export async function launch(cmd: string): Promise<DebugContext> {
  const [exeRef, scriptArg, ...otherArgs] = cmd.split(/\s+/);
  // find the exe in PATH
  const exe = await which(exeRef);
  const engine = await engineFromExe(exe);

  const [canonicalCurrent, canonicalRequested ] = await Promise.all([
    canonicalPath(process.execPath),
    canonicalPath(exe),
  ]);

  const displayCurrent = `${process.execPath}` + (process.execPath === canonicalCurrent ? "" : ` ( => ${canonicalCurrent})`);
  const displayRequested = `${exe}` + (exe === canonicalRequested ? "" : ` ( => ${canonicalRequested})`);

  // TODO: support others by using require("net").Server instead of built in fork ipc
  assert(
    canonicalCurrent === canonicalRequested,
    'Currently only forking is supported, so you must launch the same node exe file, but jsdbg uses node:\n'
    + displayCurrent + "\n"
    + 'While you tried to launch:\n'
    + displayRequested
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
        NODE_OPTIONS: `--require="${engine.bootloaderPath}" ${process.env.NODE_OPTIONS ?? ""}`,
        JSDBG_PORT: `${randomIntInRangeInclusive(9000, 10000)}`, // TODO: randomly generate one
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

  const debugCtx = new DebugContext(
    engine,
    spawned,
    scriptArg,
    otherArgs
  );

  // FIXME: doesn't work yet, script isn't loaded yet
  debugCtx.engine.setBreakpoint({
    location: {
      sourceUrl: url.pathToFileURL(debugCtx.entry).toString(),
      line: 1,
    }
  });

  return debugCtx;
}
