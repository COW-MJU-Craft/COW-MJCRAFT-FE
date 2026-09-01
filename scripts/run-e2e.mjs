import { spawn } from 'node:child_process';

const baseUrl = 'http://127.0.0.1:4173';

function run(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    ...options,
  });

  return child;
}

async function waitForServer(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The preview server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

function waitForExit(child) {
  return new Promise((resolve) => {
    child.once('exit', (code, signal) => {
      resolve({ code, signal });
    });
  });
}

async function main() {
  const preview = run(process.execPath, [
    './node_modules/vite/bin/vite.js',
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    '4173',
    '--strictPort',
  ]);

  try {
    await waitForServer(baseUrl);

    const playwright = run(
      process.execPath,
      ['./node_modules/playwright/cli.js', 'test'],
      {
        env: {
          ...process.env,
          PLAYWRIGHT_SKIP_WEB_SERVER: '1',
        },
      },
    );

    const result = await waitForExit(playwright);
    process.exitCode = result.code ?? (result.signal ? 1 : 0);
  } finally {
    if (!preview.killed) {
      preview.kill();
      await Promise.race([
        waitForExit(preview),
        new Promise((resolve) => setTimeout(resolve, 5_000)),
      ]);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
