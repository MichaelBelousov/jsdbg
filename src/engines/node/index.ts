//import { v8 } from "../v8";
import assert from "node:assert";

import chalk from "chalk";
import debug from "debug";

import { Breakpoint, Engine, Frame, Location, Scope, Stack } from "../base";

import CDP from "chrome-remote-interface";

const debugJsdbg = debug('jsdbg');

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

  async printLocation(loc: Location, { viewWindow = 3 } = {}) {
    const sourceId = loc.sourceUnit;
    let scriptSrc = this._scriptSrcsCache.get(sourceId);
    if (scriptSrc === undefined) {
      try {
        scriptSrc = await this._cdp.Debugger.getScriptSource({ scriptId: sourceId }).then(r => {
          return r.scriptSource.split('\n');
        });
      } catch {
        console.log("couldn't get script for location: ", loc);
        return;
      }
      assert(scriptSrc);
      this._scriptSrcsCache.set(sourceId, scriptSrc);
    }
   
    // TODO: syntax highlighting
    const lines = scriptSrc
      .slice(loc.line - viewWindow + 1, loc.line + viewWindow)
      .map((l,i) => i === viewWindow - 1 ? `-> ${l}` : ` | ${l}`)
      .join('\n');

    const scriptUrl = this._scriptIdToUrl.get(loc.sourceUnit);
    console.log(chalk.italic.yellow(`===== ${scriptUrl}:${loc.line}${loc.col && loc.col !== 0 ? `:${loc.col}` : ""} =====`));
    console.log(lines);
    console.log(chalk.italic.yellow(`==========`));
  }

  async readAroundCurrentLine(): Promise<string | undefined> {
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
   
    const WINDOW = 3;
    return scriptSrc.slice(currLoc.line - WINDOW + 1, currLoc.line + WINDOW).join('\n');
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
    debugJsdbg(url);
    this._cdp = await CDP({
      target: url,
    });

    debugJsdbg("connected");

    debugJsdbg("Debugger enabled");

    const _unsub1 = this._cdp.Debugger.resumed(() => {
      this._currLocation = undefined; // no known location while running
    });

    const _unsub2 = this._cdp.Debugger.paused(async (params) => {
      const top = params.callFrames[0];
      const loc = top.location;
      this._currLocation = {
        sourceUnit: loc.scriptId,
        line: loc.lineNumber
      };
      console.log(await this.printLocation(this._currLocation));
    });

    this._cdp.Debugger.on('scriptParsed', (params) => {
      this._scriptIdToUrl.set(params.scriptId, params.url);
    });

    this._cdp.on("event", (message) => {
      debug("cdp:verbose")(message);
    });

    await this._cdp.Debugger.enable();
    await this._cdp.Runtime.runIfWaitingForDebugger();
  }

  async disconnect(): Promise<void> {
    this._cdp.close();
    debugJsdbg("cdp connection closed");
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

