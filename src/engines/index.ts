
import { Engine } from "./base";
import { chrome } from "./chrome";
import { nodejs } from "./node";

export async function engineFromExe(exePath: string): Promise<Engine> {
  /*if (/chrome(\.exe)?/.test(exePath)) {
    return chrome;
  } else*/ if (/node(\.exe)?/.test(exePath)) {
    return new nodejs();
  } else {
    // TODO: list supported engines
    throw Error(`not a supported JavaScript engine, '${exePath}'`);
  }
}

export {
  Engine,
  chrome,
  nodejs
}

