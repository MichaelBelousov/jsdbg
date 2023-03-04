import { Breakpoint, Engine, Frame, Scope, Stack } from "../base";
import { v8 } from "../v8";

import * as inspector from "node:inspector";

export class nodejs implements Engine {
  private _session: inspector.Session;

  private async _post<T>(message: string, ...args: any[]) {
    // TODO: consider using require("util").promisify
    return await new Promise<T>((resolve, reject) => this._session.post(
      message,
      ...args,
      (err: any, data: T) => err ? reject(err) : resolve(data)
    ));
  }

  public constructor() {
    this._session = new inspector.Session();
    this._session.connect();
  }

  async eval(src: string, scope?: Scope): Promise<any> {
    return this._post<{type: string, value: any, description: string}>('Runtime.runScript', { expression: src });
  }

  async pause(): Promise<any> {
    return this._post<any>('Debugger.pause');
  }

  async resume(): Promise<any> {
    return this._post<any>('Debugger.resume');
  }

  async stepInto(): Promise<any> {
    return this._post<any>('Debugger.stepInto');
  }

  async stepOver(): Promise<any> {
    return this._post<any>('Debugger.stepOver');
  }

  async stepOut(): Promise<any> {
    return this._post<any>('Debugger.stepOut');
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
}

