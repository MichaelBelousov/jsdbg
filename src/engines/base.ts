
export interface Location {
  /** often a module file */
  sourceUnit: string;
  line: number;
  col?: number;
}

export interface Scope {
  //variables: Record<string, any>;
}

export interface Frame extends Scope {
  location: Location;
}

export interface Stack {
  frames: Frame[];
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

  getLocation(): Promise<Location | undefined>;

  pause(): Promise<any>;
  resume(): Promise<any>;
  stepInto(): Promise<any>;
  stepOver(): Promise<any>;
  stepOut(): Promise<any>;

  on(evt: "paused", cb: () => void): void;
  on(evt: "resumed", cb: () => void): void;
  on(evt: "scriptFailedToParse", cb: () => void): void;
  on(evt: "scriptParsed", cb: () => void): void;
  on(evt: "breakpointResolved", cb: () => void): void;

  getStack(): Promise<Stack>;

  inspectedFrame(): Promise<Frame>;

  getBreakpoints(): Promise<Breakpoint[]>;
  setBreakpoint(b: Breakpoint): Promise<void | Error>;
  setBreakOnUncaughtExceptions(val: boolean): Promise<void>;
  setBreakOnCaughtExceptions(val: boolean): Promise<void>;
  removeBreakpoint(b: Breakpoint): Promise<void | Error>;

  /** will need to change this API when adapting other non-node.js debuggers */
  get bootloaderPath(): string;

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

