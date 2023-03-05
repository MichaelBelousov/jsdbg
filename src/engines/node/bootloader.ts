
import assert from "node:assert";
import * as inspector from "node:inspector";

const port = +(process.env.JSDBG_PORT ?? "nan");

if (isNaN(port))
  throw Error(`expected launch with bootloader to be given a port through JSDBG_PORT, but received '${process.env.JSDBG_PORT}'`)

import "source-map-support/register";

// TODO: allow specifying host
inspector.open(port);

assert(process.send);

process.send({ url: inspector.url() });

inspector.waitForDebugger();

// stop immediately (for now, would be better to use built in script's first line as a temp breakpoint)
debugger;

