//import { v8 } from "../v8";
import assert from "node:assert";
import path from "node:path";

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

  async findLoadedFile(search: string): Promise<string[] | undefined> {
    const result = [] as string[];
    search = path.posix.normalize(search);
    for (const scriptUrl of this._scriptIdToUrl.keys())
      // TODO: normalize urls better
      if (scriptUrl.endsWith(search))
        result.push(scriptUrl);
    return result;
  }

  /** maps scriptId to scriptSource lines */
  private _scriptSrcsCache = new Map<string, string[]>();

  async printLocation(loc: Location, { viewWindow = 3 } = {}) {
    const scriptId = this._scriptUrlToId.get(loc.sourceUrl);
    assert(scriptId, `couldn't find scriptId for '${loc.sourceUrl}'`);
    let scriptSrc = this._scriptSrcsCache.get(scriptId);
    if (scriptSrc === undefined) {
      try {
        scriptSrc = await this._cdp.Debugger.getScriptSource({ scriptId }).then(r => {
          return r.scriptSource.split('\n');
        });
      } catch {
        console.log("couldn't get script for location: ", loc);
        return;
      }
      assert(scriptSrc);
      this._scriptSrcsCache.set(scriptId, scriptSrc);
    }
   
    // TODO: syntax highlighting
    const lines = scriptSrc
      .slice(loc.line - viewWindow + 1, loc.line + viewWindow)
      .map((l,i) => i === viewWindow - 1 ? `-> ${l}` : ` | ${l}`)
      .join('\n');

    const scriptUrl = this._scriptIdToUrl.get(loc.sourceUrl);
    const header = `===== ${scriptUrl}:${loc.line}${loc.col && loc.col !== 0 ? `:${loc.col}` : ""} =====`;
    console.log(chalk.italic.yellow(header));
    console.log(lines);
    console.log(chalk.italic.yellow("=".repeat(header.length)));
  }

  async eval(src: string, scope?: Scope): Promise<any> {
    return this._cdp.Runtime.evaluate({ expression: src }).then(r => {
      return r.result.value;
    });
  }

  /*
  async set(src: string, scope?: Scope): Promise<any> {
    return this._cdp.Debugger.setVariableValue({ expression: src }).then(r => {
      return r.result.value;
    });
  }
  */

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

  private _scriptIdToUrl = new Map<string, string>();
  private _scriptUrlToId = new Map<string, string>();

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
      const scriptUrl = this._scriptIdToUrl.get(loc.scriptId);
      assert(scriptUrl, `couldn't find url for id '${loc.scriptId}'`)
      this._currLocation = {
        sourceUrl: scriptUrl,
        line: loc.lineNumber
      };
      console.log(await this.printLocation(this._currLocation));
    });

    this._cdp.Debugger.on('scriptParsed', (params) => {
      this._scriptIdToUrl.set(params.scriptId, params.url);
      this._scriptUrlToId.set(params.url, params.scriptId);
    });

    if (debug("cdp:verbose").enabled)
      this._cdp.on("event", debug("cdp:verbose"));

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

  async getBreakpoints(): Promise<Breakpoint[]> {
    throw new Error("Function not implemented.");
  }

  async setBreakpoint(b: Breakpoint): Promise<void | Error> {
    const scriptId = this._scriptUrlToId.get(b.location.sourceUrl);
    assert(scriptId, `couldn't find scriptId for ${b.location.sourceUrl}`);
    const _result = await this._cdp.Debugger.setBreakpoint({
      location: {
        scriptId,
        lineNumber: b.location.line,
        columnNumber: b.location.col,
      }
    });
    // _result.actualLocation;
  }

  async setBreakOnExceptions(val: "none" | "uncaught" | "all"): Promise<void> {
    return this._cdp.Debugger.setPauseOnExceptions({
      state: val
    });
  }

  async removeBreakpoint(b: Breakpoint): Promise<void | Error> {
    throw new Error("Function not implemented.");
  }

  get bootloaderPath(): string {
    return require.resolve("./bootloader");
  }
}

