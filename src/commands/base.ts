
interface Command {
  name: string;
  opts: {}, // yargs?
  description: string;
  parse(src: string): Promise<Command.Result>;
}

namespace Command {
  export interface Result {
    output: string;
  }
}

