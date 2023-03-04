import { DebugContext } from "./debug-context";

export async function attach(pid: number): Promise<DebugContext> {
  // TODO: windows
  process.kill(pid, "SIGUSR1");

  throw Error("unimplemented");
}
