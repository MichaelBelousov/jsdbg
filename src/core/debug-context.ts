import child_process from "child_process";
import { Engine } from "../engines";

// TODO: add a concept of a 'target'
export interface DebugContext {
  engine: Engine;
  debuggee: child_process.ChildProcess;
}

