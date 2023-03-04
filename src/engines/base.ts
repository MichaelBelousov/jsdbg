
export interface Scope {
  variables: Record<string, any>;
}

export interface Frame extends Scope {
  //scope: []
}

export interface Stack {
  frames: Frame[];
}

export interface Location {
  /** often a module file */
  sourceUnit: string;
  line: number;
  col?: number;
}

export interface Breakpoint {
  location: Location;
  condition?: string;
}

export interface Engine {
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  /** if scope is undefined should operate on the inspected frame */
  eval(src: string, scope?: Scope): Promise<any>;

  pause(): Promise<any>;
  resume(): Promise<any>;
  stepInto(): Promise<any>;
  stepOver(): Promise<any>;
  stepOut(): Promise<any>;

  getStack(): Promise<Stack>;

  inspectedFrame(): Promise<Frame>;

  getBreakpoints(): Promise<Breakpoint[]>;
  setBreakpoint(b: Breakpoint): Promise<void | Error>;
  setBreakOnUncaughtExceptions(val: boolean): Promise<void>;
  setBreakOnCaughtExceptions(val: boolean): Promise<void>;
  removeBreakpoint(b: Breakpoint): Promise<void | Error>;

  /*
  heapProfile: {
    start(): Promise<void>;
    stop(): Promise<void>;
  };

  cpuProfile: {
    start(): Promise<void>;
    stop(): Promise<void>;
  }
  */
}

