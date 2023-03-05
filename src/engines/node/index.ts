import { Breakpoint, Engine, Frame, Location, Scope, Stack } from "../base";
import { v8 } from "../v8";

import * as inspector from "node:inspector";
import * as events from "node:events";
import assert from "node:assert";

import WebSocket from "ws";

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
  private _session: inspector.Session;

  private async _post<T>(message: string, ...args: any[]): Promise<Result<T>> {
    // TODO: consider using require("util").promisify (need to check support though...)
    // TODO: use npm debug
    if (process.env.DEBUG) {
      console.log(`DEBUG: _post ${message}: ${JSON.stringify(args)}`);
    }
    return await new Promise<Result<T>>((resolve) => this._session.post(
      message,
      ...args,
      (err: any, data: T) => err ? resolve({ error: err }) : resolve({ result: data })
    ));
  }

  public constructor() {
    // FIXME: I don't know why I assumed a port-less inspector session init would inspect the target,
    // looks like I need to setup websockets and send node debugger protocol messages to it through there
    this._session = new inspector.Session();
    this._session.connect();
    this._session.on("Debugger.resumed", (resp: any) => {
      if (process.env.DEBUG)
        console.log(`DEBUG: on Debugger.resumed: ${JSON.stringify(resp)}`);
      this._currLocation = undefined; // no known location
    });
    this._session.on("Debugger.paused", async (resp: { params: V8.OnPauseParams }) => {
      if (process.env.DEBUG)
        console.log(`DEBUG: on Debugger.paused: ${JSON.stringify(resp)}`);
      // TODO: log all the inspector stuff with an env var
      const top = resp.params.callFrames[resp.params.callFrames.length - 1];
      const loc = top.location;
      //const top = resp.params.callFrames[0];
      this._currLocation = {
        sourceUnit: loc.scriptId,
        line: loc.lineNumber
      };
      console.log(`${loc.scriptId}:${loc.lineNumber}:${loc.columnNumber} --> ${await this.readCurrentLine()}`);
    });
  }

  private _currLocation: Location | undefined;

  //private _eventHandler = new events.EventEmitter();

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
    this._session.on(v8Event, cb);
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
      scriptSrc = await this._post<{scriptSource: string}>('Debugger.getScriptSource', { scriptId: sourceId }).then(r => {
        if ("error" in r)
          throw Object.assign(Error(), r.error);
        else
          return r.result.scriptSource.split('\n');
      });
      assert(scriptSrc);
      this._scriptSrcsCache.set(sourceId, scriptSrc);
    }
   
    return scriptSrc[currLoc.line - 1];
  }

  // FIXME: should extend event emitter

  async eval(src: string, scope?: Scope): Promise<any> {
    return this._post<{result: {type: string, value: any, description: string}}>('Runtime.evaluate', { expression: src }).then(r => {
      if ("error" in r) {
        const err = { ...r.error };
        Object.setPrototypeOf(err, Error);
        return err;
      } else {
        return r.result.result.value;
      }
    });
  }

  async pause(): Promise<any> {
    return this._post('Debugger.pause');
  }

  async resume(): Promise<any> {
    return this._post('Debugger.resume');
  }

  async stepInto(): Promise<any> {
    return this._post('Debugger.stepInto');
  }

  async stepOver(): Promise<any> {
    return this._post('Debugger.stepOver');
  }

  async stepOut(): Promise<any> {
    return this._post('Debugger.stepOut');
  }

  async inspectedFrame(): Promise<Frame> {
      throw new Error("Method not implemented.");
  }

  /** only valid after connect! */
  private _ws!: WebSocket;

  private _msgId = 0;

  /**
   * @see inspector.Session["post"] for methods
   */
  private async _send(method: string, params: any = {}) {
    return new Promise((resolve, reject) => {
      this._ws.once("message", (resp) => resolve(resp));
      this._ws.once("error", (err) => reject(err));
      this._ws.send(JSON.stringify({
        method,
        params,
        id: this._msgId,
      }));
      ++this._msgId;
    });
  }

  async connect(url: string): Promise<void> {
    this._ws = new WebSocket(url);
    this._ws.on("error", console.error);
    await new Promise(resolve => this._ws.on("open", resolve));
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

