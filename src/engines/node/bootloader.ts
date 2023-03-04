
import * as inspector from "node:inspector";

const port = +(process.env.JSDBG_PORT ?? "nan");

if (isNaN(port))
  throw Error(`expected launch with bootloader to be given a port through JSDBG_PORT, but received '${process.env.JSDBG_PORT}'`)

// TODO: allow specifying host
inspector.open(port, undefined, true);
