import * as readline from "node:readline/promises";

// TODO: rename and add control user input prompting here
export interface RunContext {
  outputLine(s: string): Promise<void>;
  newCmdPrompt(): Promise<string>
  additionalLinePrompt(): Promise<string>
  close(): void;
}

/**
 * class which manages running of commands, allowing them to take multiple lines of
 * input, completing conditionally, in a structured away to allow for things like history
 */ 
export class InteractiveRunContext implements RunContext {
  private _rl: readline.Interface;

  public constructor(
    //private console: console
  ) {
    this._rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  }

  on(e: "SIGINT", cb: () => void) {
    this._rl.on("SIGINT", cb);
  }

  async outputLine(line: string) {
    console.log(line);
  }

  async newCmdPrompt() {
    // const signal = AbortSignal.abort();
    return this._rl.question("(jsdb) "/*, { signal }*/);
  }

  async additionalLinePrompt() {
    // const signal = AbortSignal.abort();
    return this._rl.question(""/*, { signal }*/);
  }

  close() {
    this._rl.close();
  }
}

