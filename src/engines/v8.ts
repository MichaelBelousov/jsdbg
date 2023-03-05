import { Breakpoint, Engine, Frame, Scope, Stack } from "./base";

export const v8: Engine = {
    connect: function(): Promise<void> {
        throw new Error("Function not implemented.");
    },
    disconnect: function(): Promise<void> {
        throw new Error("Function not implemented.");
    },
    eval: function(src: string, scope?: Scope | undefined): Promise<any> {
        throw new Error("Function not implemented.");
    },
    pause: function(): Promise<any> {
        throw new Error("Function not implemented.");
    },
    resume: function(): Promise<any> {
        throw new Error("Function not implemented.");
    },
    stepInto: function(): Promise<any> {
        throw new Error("Function not implemented.");
    },
    stepOver: function(): Promise<any> {
        throw new Error("Function not implemented.");
    },
    stepOut: function(): Promise<any> {
        throw new Error("Function not implemented.");
    },
    getStack: function(): Promise<Stack> {
        throw new Error("Function not implemented.");
    },
    inspectedFrame: function(): Promise<Frame> {
        throw new Error("Function not implemented.");
    },
    getBreakpoints: function(): Promise<Breakpoint[]> {
        throw new Error("Function not implemented.");
    },
    setBreakpoint: function(b: Breakpoint): Promise<void | Error> {
        throw new Error("Function not implemented.");
    },
    setBreakOnUncaughtExceptions: function(val: boolean): Promise<void> {
        throw new Error("Function not implemented.");
    },
    setBreakOnCaughtExceptions: function(val: boolean): Promise<void> {
        throw new Error("Function not implemented.");
    },
    removeBreakpoint: function(b: Breakpoint): Promise<void | Error> {
        throw new Error("Function not implemented.");
    },
    get bootloaderPath(): string { return ""; },
    on: function(evt: string, cb: () => void): Promise<any> {
        throw new Error("Function not implemented.");
    }
};

