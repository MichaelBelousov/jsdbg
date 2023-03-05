import { Breakpoint, Engine, Frame, Scope, Stack } from "../base";
import { v8 } from "../v8";

import * as inspector from "node:inspector";

type Result<T> = { error: Error } | { result: T };

export class nodejs implements Engine {
  private _session: inspector.Session;

  private async _post<T>(message: string, ...args: any[]): Promise<Result<T>> {
    // TODO: consider using require("util").promisify (need to check support though...)
    return await new Promise<Result<T>>((resolve) => this._session.post(
      message,
      ...args,
      (err: any, data: T) => err ? resolve({ error: err }) : resolve({ result: data })
    ));
  }

  public constructor() {
    this._session = new inspector.Session();
    this._session.connect();
    this._post("Debugger.enable");
  }

  on(evt: "paused", cb: () => void): Promise<any>;
  on(evt: "resumed", cb: () => void): Promise<any>;
  on(evt: "scriptFailedToParse", cb: () => void): Promise<any>;
  on(evt: "scriptParsed", cb: () => void): Promise<any>;
  on(evt: "breakpointResolved", cb: () => void): Promise<any>;
  on(evt: any, cb: () => void): Promise<any> {
      throw new Error("Method not implemented.");
  }

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

  async connect(): Promise<void> {
    this._session.connect();
  }

  async disconnect(): Promise<void> {
    this._session.disconnect();
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

