import child_process from "child_process";
import { Engine } from "../engines";
import { Breakpoint } from "../engines/base";

// TODO: make a class with onBreak handler, redesign proxying of breakpoints on frontend
export interface BreakpointProxy extends Breakpoint {
  commands?: string[];
}

const NotPaused = 0 as const;
type NotPaused = typeof NotPaused;

export enum PauseType {
  CaughtException = 1,
  UncaughtException,
  DebuggerStatement,
  Breakpoint,
}

export class DebugContext {
  breakpoints = new Map<number, BreakpointProxy>();

  private _engine!: Engine;
  get engine(): Engine {
    return this._engine;
  }
  set engine(value: Engine) {
    const this_ = this;
    this._engine = value;
    // NOTE: setBreakpoint probably should be observable in a more fundamental way, e.g. an event emit, maybe breakpoint resolved
    const originalSetBreakpoint = value.setBreakpoint;
    value.setBreakpoint = async function (breakpoint) {
      const result = await originalSetBreakpoint.call(this, breakpoint);
      this_.lastSetBreakpoint = breakpoint;
      return result;
    }
  }

  constructor(
    engine: Engine,
    public target: child_process.ChildProcess,
  ) {
    this.engine = engine;
  }

  // TODO: maybe this should be a breakpoint proxy/props
  lastSetBreakpoint: BreakpointProxy | undefined;

  pauseState: PauseType | NotPaused = NotPaused;

  async pause() {
    await this.engine.pause();
  }

  async resume() {
    await this.engine.resume();
  }
}

