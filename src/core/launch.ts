import which from "which";
import child_process from "child_process";
import { Engine } from "../engines";
import { v8 } from "../engines/v8";
import { chrome } from "../engines/chrome";

// TODO: move somewhere else
interface DebugContext {
  engine: Engine;
  debuggee: child_process.ChildProcess;
}

async function engineFromExe(exePath: string): Promise<Engine> {
  if (/chrome(\.exe)?/.test(exePath)) {
    return chrome;
  } else if (/node(\.exe)?/.test(exePath)) {
    return v8;
  } else {
    throw Error(`not a supported JavaScript engine, '${exePath}'`);
  }
}

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
      }
    }
  );

  return {
    debuggee: spawned
    engine: 
  }
}
