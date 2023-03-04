import child_process from "child_process";
import { Engine } from "../engines";

export interface DebugContext {
  engine: Engine;
  debuggee: child_process.ChildProcess;
}

