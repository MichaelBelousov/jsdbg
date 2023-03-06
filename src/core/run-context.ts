import * as readline from "node:readline/promises";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// TODO: rename and add control user input prompting here
export interface RunContext {
  outputLine(s: string): Promise<void>;
  newCmdPrompt(): Promise<string>
  additionalLinePrompt(): Promise<string>
  close(): void;
  get history(): string[];
}

/**
 * class which manages running of commands, allowing them to take multiple lines of
 * input, completing conditionally, in a structured away to allow for things like history
 */ 
export class InteractiveRunContext implements RunContext {
  /** makes sure the history file exists */
  static async resolveHistory(): Promise<[string[], fs.WriteStream]> {
    const historyFileName = ".jsdbg_history";
    const historyInHomeDir = path.join(os.homedir(), historyFileName);
    const historyFilePath = process.env.JSDBG_HISTORY_PATH ?? historyInHomeDir;
    // FIXME: keep it open for writes!
    let history: string[];
    try {
      const file = await fs.promises.readFile(historyFilePath, { encoding: "utf8" });
      const lines = file.split('\n');
      const nonEmptyLines = lines.filter(l => l.trim() !== '');
      history = nonEmptyLines;
    } catch {
      history = [];
    }

    return [history, fs.createWriteStream(historyFilePath)];
  }

  get history() { return this._history; }

  private constructor(
    private _rl: readline.Interface,
    private _history: string[],
    private _historyFile: fs.WriteStream
  ) {}
  
  public static async create(): Promise<InteractiveRunContext> {
    const [historyCache, historyFile] = await InteractiveRunContext.resolveHistory();
    return new InteractiveRunContext(
      readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        // prompt: "(jsdbg) "
        history: historyCache,
      }),
      historyCache,
      historyFile
    );
  }

  on(e: "SIGINT", cb: () => void) {
    this._rl.on("SIGINT", cb);
  }

  async outputLine(line: string) {
    console.log(line);
  }

  async newCmdPrompt() {
    // const signal = AbortSignal.abort();
    const answer = await this._rl.question("(jsdb) "/*, { signal }*/);
    this._history.push(answer);
    this._historyFile.write(answer + "\n")
    return answer;
  }

  async additionalLinePrompt() {
    // const signal = AbortSignal.abort();
    const answer = await this._rl.question(""/*, { signal }*/);
    this._history.push(answer);
    this._historyFile.write(answer + "\n")
    return answer;
  }

  close() {
    this._rl.close();
  }
}

