
// TODO: rename and add control user input prompting here
export interface RunContext {
  outputLine(s: string): Promise<void>;
}

/**
 * class which manages running of commands, allowing them to take multiple lines of
 * input, completing conditionally, in a structured away to allow for things like history
 */ 
export class InteractiveRunContext implements RunContext {
  public constructor(
    //private console: console
  ) {}

  async outputLine(line: string) {
    console.log(line);
  }
}

