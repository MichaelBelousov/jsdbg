import { InteractiveRunContext } from "./run-context";
import * as readline from "node:readline/promises";
import { Engine } from "../engines";

async function prompt(rl: readline.Interface) {
  // const signal = AbortSignal.abort();
  return rl.question("(jsdb) "/*, { signal }*/);
}

async function main(engine: Engine) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const runCtx = new InteractiveRunContext();

  while (true) {
    try {
      const line = prompt(rl);
    } catch (err: any) {
      if (err.type === "user-quit")
        break;
      else {
        runCtx.outputLine(`An error was thrown in jsdb:\n${err}`);
      }
    }
  }

  rl.close();
}
