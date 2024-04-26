const fs = require('node:fs');
const path = require('node:path');
const child_process = require('node:child_process');

const fixturesPath = path.join(__dirname, 'fixtures');
const fixtures = fs.readdirSync(fixturesPath);

class Debugger {
  proc = undefined;

  constructor(entry) {
    // FIXME: fork?
    this.proc = child_process.spawn(
      process.execPath,
      [require.resolve('../lib/src/main.js'), '--', entry],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    );
    this.proc.stdout.on('data', s => console.error(s.toString()));
    this.proc.stderr.on('data', s => console.error(s.toString()));
  }

  async command(cmd) {
    this.proc.stdin.write(cmd);
    this.proc.stdin.write('\n');
  }
}

for (const fixture of fixtures) {
  const fixturePath = path.join(fixturesPath, fixture);

  describe(fixture, function () {
    it('print scope', async () => {
      const dbgTargetPath = path.join(fixturePath, 'test.js');
      const dbgScriptPath = path.join(fixturePath, 'test.jsdbg');
      const dbgr = new Debugger(dbgTargetPath);
      const dbgScript = await fs.promises.readFile(dbgScriptPath, 'utf8');
      for (const line of dbgScript.split('\n'))
        await dbgr.command(line);
    });
  });
}

