import { Breakpoint, Engine, Frame, Location, Scope, Stack } from "./base";

export const v8: Engine = new Proxy({} as Engine, {
  get(_obj: Engine, _k: string, _receiver) {
    throw Error("v8 not implemented")
  }
});

