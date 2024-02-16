import assert from "node:assert";
import { DebugContext } from "../core/debug-context";
import { Location } from "../engines/base";
import debug from "debug";

const debugJsdbg = debug("jsdbg");

export async function parseLocation(src: string, ctx: DebugContext): Promise<Location> {
  src = src.trim();
  const match = /(?<line>\d+)?(:(?<col>\d+))?$/.exec(src);
  assert(match?.groups, "bad location syntax");

  const fileOrRef = src.slice(0, -match[0].length)
  const line = +(match.groups?.line ?? match.groups?.col ?? 0);
  const hasCol = match.groups?.line && match.groups?.col;
  const col = +(hasCol ? match.groups?.col : 0);

  debug("jsdbg:parse")({ fileOrRef, col, line });

  const probablyFile = fileOrRef && /[/\\.]/.test(fileOrRef);
  const probablyRef = fileOrRef && !probablyFile;

  // NOTE: the real behavior should check both refs and paths
  if (probablyRef)
    throw Error("breaking on function-like reference not yet supported");
  const urls = probablyFile
    ? await ctx.engine.findLoadedFile(fileOrRef)
    : await ctx.engine.getLocation().then(l => l ? [l.sourceUrl] : []);

  // TODO: break on all results
  assert(urls && urls.length === 1, `must have one match but matched: [${urls}]`);

  debug("jsdbg")(`placing breakpoint at ${urls[0]}:${line}:${col}`);
  return {
    sourceUrl: urls[0],
    line,
    col,
  };
}

