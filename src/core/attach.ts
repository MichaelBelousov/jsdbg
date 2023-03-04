
async function attach(pid: number) {
  // TODO: windows
  process.kill(pid, "SIGUSR1");
}
