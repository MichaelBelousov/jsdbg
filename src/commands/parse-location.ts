import assert from "node:assert";
import { DebugContext } from "../core/debug-context";
import { Location } from "../engines/base";
import debug from "debug";

const debugJsdbg = debug("jsdbg");

export async function parseLocation(src: string, ctx: DebugContext): Promise<Location> {
  src = src.trim();
  const match = /(?<fileOrRef>.+:)?(?<line>\d+)?(:(?<col>\d+))?$/.exec(src);
  assert(match?.groups, "bad location syntax");

  const [fileOrRef, line, col]
    = match.groups.col  ? [match.groups.fileOrRef, match.groups.line, match.groups.col]
    : (
      match.groups.line
      // NOTE: can put an extra group in the original regex to parse whether it's a number then
        ? /\d+/.test(match.groups.fileOrRef)
          ? [undefined, +match.groups.fileOrRef, +match.groups.line]
          : [match.groups.fileOrRef, +match.groups.line, 0]
        : [match.groups.fileOrRef, +match.groups.line, 0]
    )

  // TODO: fix gross
  //const col = +(match.groups?.col ?? 0);
  //const line = +(match.groups?.line ?? match.groups?.col ?? 0);

  debug("jsdbg:parse")(match);

  const probablyFile = match?.groups?.fileOrRef && /[/\\]/.test(match.groups.fileOrRef);
  const probablyRef = match?.groups?.fileOrRef && !probablyFile && !/\d+/.test(src);

  if (probablyRef)
    throw Error("breaking on function-like reference not yet supported");

  const urls = probablyFile
    ? await ctx.engine.findLoadedFile(match.groups!.fileOrRef)
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

