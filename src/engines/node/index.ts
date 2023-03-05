//import { v8 } from "../v8";
import assert from "node:assert";
import events from "node:events";

import WebSocket from "ws";
import debug from "debug";

import { Breakpoint, Engine, Frame, Location, Scope, Stack } from "../base";

import CDP from "chrome-remote-interface";

const debugWs = debug('ws');

type Result<T> = { error: Error } | { result: T };

export class nodejs implements Engine {
  public constructor() {
  }

  private _currLocation: Location | undefined;

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

    this._cdp.on("event", (msg) => {
      if (msg.method === v8Event)
        cb(); // ignoring params for now as API restriction
    });
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
      scriptSrc = await this._cdp.Debugger.getScriptSource({ scriptId: sourceId }).then(r => {
        return r.scriptSource.split('\n');
      });
      assert(scriptSrc);
      this._scriptSrcsCache.set(sourceId, scriptSrc);
    }
   
    return scriptSrc[currLoc.line - 1];
  }

  async eval(src: string, scope?: Scope): Promise<any> {
    return this._cdp.Runtime.evaluate({ expression: src }).then(r => {
      return r.result.value;
    });
  }

  async pause(): Promise<any> {
    return this._cdp.Debugger.pause();
  }

  async resume(): Promise<any> {
    return this._cdp.Debugger.resume();
  }

  async stepInto(): Promise<any> {
    return this._cdp.Debugger.stepInto();
  }

  async stepOver(): Promise<any> {
    return this._cdp.Debugger.stepOver();
  }

  async stepOut(): Promise<any> {
    return this._cdp.Debugger.stepOut();
  }

  async inspectedFrame(): Promise<Frame> {
      throw new Error("Method not implemented.");
  }

  // TODO: remove to v8 engine abstraction
  /** only valid after connect! (NOTE: undefined probably) */
  private _cdp!: CDP.Client;

  private _msgId = 0;

  private _scriptIdToUrl = new Map<string, string>();

  async connect(url: string): Promise<void> {
    this._cdp = await CDP({
      target: url,
    });

    this._cdp.on("Debugger.resumed", () => {
      this._currLocation = undefined; // no known location while running
    });

    this._cdp.on("Debugger.paused", async (params) => {
      debugWs("Debugger.paused", params);
      const top = params.callFrames[params.callFrames.length - 1];
      const loc = top.location;
      this._currLocation = {
        sourceUnit: loc.scriptId,
        line: loc.lineNumber
      };
      // FIXME: doesn't belong here
      console.log(`${loc.scriptId}:${loc.lineNumber}:${loc.columnNumber} --> ${await this.readCurrentLine()}`);
    });

    this._cdp.Debugger.on('scriptParsed', (params) => {
      this._scriptIdToUrl.set(params.scriptId, params.url);
    });

    await this._cdp.Debugger.enable();
  }

  async disconnect(): Promise<void> {
    this._cdp.close();
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

