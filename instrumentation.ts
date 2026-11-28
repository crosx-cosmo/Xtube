export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureServerKeepAliveDaemon } = await import('./lib/keep-alive');
    ensureServerKeepAliveDaemon();
  }
}
