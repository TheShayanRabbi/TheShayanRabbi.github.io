import { spawn } from "node:child_process";
import { watch } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(currentFile), "..");
const port = Number(process.env.PORT || 4173);
const watchOnly = process.argv.includes("--watch-only");

const watchTargets = [
  { target: path.join(rootDir, "src"), recursive: true, label: "src" },
  { target: path.join(rootDir, "public"), recursive: true, label: "public" },
  { target: path.join(rootDir, "scripts", "build.mjs"), recursive: false, label: "build script" },
];

const watchers = [];
let serverProcess = null;
let buildRunning = false;
let queuedReason = null;
let debounceTimer = null;

await runBuild("startup");

if (!watchOnly) {
  serverProcess = spawn(process.execPath, ["scripts/serve.mjs"], {
    cwd: rootDir,
    env: { ...process.env, LIVE_RELOAD: "1", PORT: String(port) },
    stdio: "inherit",
  });
}

for (const item of watchTargets) {
  watchers.push(
    watch(item.target, { recursive: item.recursive }, (_eventType, fileName) => {
      const detail = fileName ? `${item.label}/${String(fileName).replaceAll("\\", "/")}` : item.label;
      scheduleBuild(detail);
    }),
  );
}

console.log(
  watchOnly
    ? "Watch mode running without server."
    : `Watch mode running at http://127.0.0.1:${port} with rebuild + reload.`,
);

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function scheduleBuild(reason) {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    runBuild(reason).catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
    });
  }, 120);
}

async function runBuild(reason) {
  if (buildRunning) {
    queuedReason = reason;
    return;
  }

  buildRunning = true;
  console.log(`\n[watch] rebuilding after ${reason}`);

  const exitCode = await runNodeScript("scripts/build.mjs");

  if (exitCode === 0 && !watchOnly) {
    await triggerReload();
  }

  buildRunning = false;

  if (queuedReason) {
    const nextReason = queuedReason;
    queuedReason = null;
    await runBuild(nextReason);
  }
}

function runNodeScript(scriptPath) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: rootDir,
      stdio: "inherit",
    });

    child.on("exit", (code) => {
      resolve(code ?? 1);
    });
  });
}

async function triggerReload() {
  try {
    await fetch(`http://127.0.0.1:${port}/__reload`, {
      method: "POST",
    });
  } catch {
    // The first build may finish before the server is listening. That is fine.
  }
}

function shutdown() {
  for (const watcher of watchers) {
    watcher.close();
  }

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }

  process.exit(0);
}
