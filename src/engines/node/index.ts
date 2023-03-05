//import { v8 } from "../v8";
import assert from "node:assert";
import events from "node:events";

import WebSocket from "ws";
import debug from "debug";

import { Breakpoint, Engine, Frame, Location, Scope, Stack } from "../base";

const debugWs = debug('ws');

type Result<T> = { error: Error } | { result: T };

// TODO: move to v8
namespace V8 {
  // https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#type-Location
  export interface Location {
    scriptId: string;
    lineNumber: number;
    columnNumber: number;
  }

  // https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#type-Scope
  export interface Scope {
    type: "global" | "local" | "with" | "closure" | "catch" | "block" | "script" | "eval" | "module" | "wasm-expression-stack";
    object: any;
    name?: string;
    startLocation?: Location;
    endLocation?: Location;
  }

  // https://chromedevtools.github.io/devtools-protocol/v8/Debugger/#type-CallFrame
  export interface CallFrame {
    callFrameId: {
      type: string;
      externalURL?: string;
    },
    functionName: string;
    functionLocation?: Location;
    location: Location;
    scopeChain: Scope;
    this: any;
    returnValue?: any;
    canBeRestarted?: boolean;
  }

  export interface OnPauseParams {
    callFrames: CallFrame[];
    reason: "ambiguous" | "assert" | "CSPViolation" | "debugCommand" | "DOM" | "EventListener" | "exception" | "instrumentation" | "OOM" | "other" | "promiseRejection" |" XHR";
    data?: any;
    hitBreakpoints: string[];
    // asyncStackTrace
    // asyncStackTraceId
    // asyncCallStackTraceId
  }
}

export class nodejs implements Engine {
  public constructor() {
  }

  private _currLocation: Location | undefined;

  private _v8Events = new events.EventEmitter();

  on(evt: "paused", cb: () => void): void;
  on(evt: "resumed", cb: () => void): void;
  on(evt: "scriptFailedToParse", cb: () => void): void;
  on(evt: "scriptParsed", cb: () => void): void;
  on(evt: "breakpointResolved", cb: () => void): void;
  on(evt: string, cb: () => void) {
    const v8EventMap = {
      "paused": "Debugger.paused",
      "resumed": "Debugger.resumed",
      "scriptFailedToParse": "Debugger.scriptFailedToParse",
      "scriptParsed": "Debugger.scriptParsed",
      "breakpointResolved": "Debugger.breakpointResolved",
    } as const;

    const v8Event = v8EventMap[evt as keyof typeof v8EventMap] ?? assert(false, `unknown event '${evt}'`);

    this._v8Events.on(v8Event, cb);
  }

  async getLocation(): Promise<Location | undefined> {
    // NOTE: this is invalid once we resume?
    return this._currLocation;
  }

  /** maps scriptId to scriptSource lines */
  private _scriptSrcsCache = new Map<string, string[]>();

  async readCurrentLine(): Promise<string | undefined> {
    const currLoc = this._currLocation;
    const sourceId = currLoc?.sourceUnit;
    if (!sourceId)
      return;
    let scriptSrc = this._scriptSrcsCache.get(sourceId);
    if (scriptSrc === undefined) {
      scriptSrc = await this._send<{scriptSource: string}>('Debugger.getScriptSource', { scriptId: sourceId }).then(r => {
        if ("error" in r)
          throw Object.assign(Error(), r.error);
        else
          return r.scriptSource.split('\n');
      });
      assert(scriptSrc);
      this._scriptSrcsCache.set(sourceId, scriptSrc);
    }
   
    return scriptSrc[currLoc.line - 1];
  }

  async eval(src: string, scope?: Scope): Promise<any> {
    return this._send<{result: {type: string, value: any, description: string}}>('Runtime.evaluate', { expression: src }).then(r => {
      if ("error" in r) {
        const err = { ...r.error as any };
        Object.setPrototypeOf(err, Error);
        return err;
      } else {
        return r.result.value;
      }
    });
  }

  async pause(): Promise<any> {
    return this._send('Debugger.pause');
  }

  async resume(): Promise<any> {
    return this._send('Debugger.resume');
  }

  async stepInto(): Promise<any> {
    return this._send('Debugger.stepInto');
  }

  async stepOver(): Promise<any> {
    return this._send('Debugger.stepOver');
  }

  async stepOut(): Promise<any> {
    return this._send('Debugger.stepOut');
  }

  async inspectedFrame(): Promise<Frame> {
      throw new Error("Method not implemented.");
  }

  // TODO: remove to v8 engine abstraction
  /** only valid after connect! (NOTE: undefined probably) */
  private _ws!: WebSocket;

  private _msgId = 0;

  /**
   * @see inspector.Session["post"] for methods
   */
  private async _send<T>(method: string, params: any = {}): Promise<T> {
    const id = this._msgId;
    ++this._msgId;

    return new Promise<T>((resolve, reject) => {
      debug(`ws:send:${method}`)("send", method, params);

      const onMsg = (resp: WebSocket.RawData) => {
        const text = resp.toString('utf8');
        const json = JSON.parse(text);
        if (json.id === id) {
          debug(`ws:send-rcv:${method}`)("send-rcv", json);
          this._ws.off("message", onMsg);
          resolve(json);
        }
      }
      this._ws.on("message", onMsg);
      this._ws.on("error", reject);

      this._ws.send(JSON.stringify({
        method,
        params,
        id,
      }));
    });
  }

  private _scriptIdToUrl = new Map<string, string>();

  async connect(url: string): Promise<void> {
    this._ws = new WebSocket(url);

    this._ws.on("error", console.error);
    this._ws.on("message", (resp: any) => { 
      const text = resp.toString("utf8");
      const json = JSON.parse(text);
      debug(`ws:rcv:${json.method}`)("message", text);
      this._v8Events.emit(resp.params);
    });

    this._v8Events.on("Debugger.resumed", (resp: any) => {
      debugWs("Debugger.resumed", resp);
      this._currLocation = undefined; // no known location while running
    });

    this._v8Events.on("Debugger.paused", async (params: V8.OnPauseParams) => {
      debugWs("Debugger.paused", params);
      const top = params.callFrames[params.callFrames.length - 1];
      const loc = top.location;
      //const top = params.callFrames[0];
      this._currLocation = {
        sourceUnit: loc.scriptId,
        line: loc.lineNumber
      };
      console.log(`${loc.scriptId}:${loc.lineNumber}:${loc.columnNumber} --> ${await this.readCurrentLine()}`);
    });

    this._v8Events.on("Debugger.scriptParsed", async (params: any) => {
      this._scriptIdToUrl.set(params.scriptId, params.url);
    });

    await new Promise(resolve => this._ws.on("open", resolve));
    await this._send("Debugger.enable");
  }

  async disconnect(): Promise<void> {
    this._ws.close();
  }

  async getStack(): Promise<Stack> {
    throw new Error("Function not implemented.");
  }

  getBreakpoints(): Promise<Breakpoint[]> {
    throw new Error("Function not implemented.");
  }

  async setBreakpoint(b: Breakpoint): Promise<void | Error> {
    throw new Error("Function not implemented.");
  }

  async setBreakOnUncaughtExceptions(val: boolean): Promise<void> {
    throw new Error("Function not implemented.");
  }

  async setBreakOnCaughtExceptions(val: boolean): Promise<void> {
    throw new Error("Function not implemented.");
  }

  async removeBreakpoint(b: Breakpoint): Promise<void | Error> {
    throw new Error("Function not implemented.");
  }

  get bootloaderPath(): string {
    return require.resolve("./bootloader");
  }
}

